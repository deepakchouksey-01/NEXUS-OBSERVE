import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const serviceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).max(100).optional(),

  status: z
    .enum(['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN'])
    .optional(),

  environment: z
    .enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
    .optional(),
});

export async function serviceRoutes(app: FastifyInstance) {
  app.get(
    '/services',
    {
      preHandler: [
        authenticate,
        requireRole(
          'OWNER',
          'ADMIN',
          'ENGINEER',
          'INCIDENT_RESPONDER',
          'VIEWER',
        ),
      ],
    },
    async (request, reply) => {
      const parsedQuery = serviceQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid services query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const query = parsedQuery.data;

      const { page, limit, search, status, environment } = query;

      const organizationId = request.auth?.organizationId;

      if (!organizationId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ORGANIZATION_ACCESS_DENIED',
            message: 'Organization context is required.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const skip = (page - 1) * limit;

      const where = {
        project: {
          organizationId,
        },

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  slug: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),

        ...(status
          ? {
              status,
            }
          : {}),

        ...(environment
          ? {
              environment: {
                kind: environment,
              },
            }
          : {}),
      };

      // ------------------------------------------------------------
      // 1. Fetch paginated services
      // ------------------------------------------------------------

      const [services, total] = await Promise.all([
        prisma.service.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,

          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            version: true,
            description: true,
            createdAt: true,
            updatedAt: true,

            project: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            environment: {
              select: {
                id: true,
                name: true,
                kind: true,
              },
            },

            _count: {
              select: {
                hosts: true,
                containers: true,
                metrics: true,
                logs: true,
                traces: true,
                incidents: true,
                deployments: true,
              },
            },
          },
        }),

        prisma.service.count({
          where,
        }),
      ]);

      // ------------------------------------------------------------
      // 2. Fetch latest telemetry metrics
      // ------------------------------------------------------------

      const serviceIds = services.map((service) => service.id);

      const metrics =
        serviceIds.length > 0
          ? await prisma.metric.findMany({
              where: {
                serviceId: {
                  in: serviceIds,
                },

                name: {
                  in: [
                    'request_rate',
                    'requests_per_second',
                    'error_rate',
                    'latency_p95',
                    'p95_latency',
                    'cpu_usage',
                    'memory_usage',
                  ],
                },
              },

              orderBy: {
                timestamp: 'desc',
              },

              select: {
                serviceId: true,
                name: true,
                value: true,
                timestamp: true,
              },

              // We only need the newest few samples
              // for each service/metric.
              take: Math.max(serviceIds.length * 20, 100),
            })
          : [];

      // ------------------------------------------------------------
      // 3. Build telemetry map
      // ------------------------------------------------------------

      type Telemetry = {
        requestRate: number | null;
        errorRate: number | null;
        p95Latency: number | null;
        cpuUsage: number | null;
        memoryUsage: number | null;
        updatedAt: string | null;
      };

      const telemetryMap = new Map<string, Telemetry>();

      for (const metric of metrics) {
        const current = telemetryMap.get(metric.serviceId) ?? {
          requestRate: null,
          errorRate: null,
          p95Latency: null,
          cpuUsage: null,
          memoryUsage: null,
          updatedAt: null,
        };

        // Because metrics are ordered DESC,
        // the first value encountered is the latest.
        if (
          (metric.name === 'request_rate' ||
            metric.name === 'requests_per_second') &&
          current.requestRate === null
        ) {
          current.requestRate = metric.value;
        }

        if (
          metric.name === 'error_rate' &&
          current.errorRate === null
        ) {
          current.errorRate = metric.value;
        }

        if (
          (metric.name === 'latency_p95' ||
            metric.name === 'p95_latency') &&
          current.p95Latency === null
        ) {
          current.p95Latency = metric.value;
        }

        if (
          metric.name === 'cpu_usage' &&
          current.cpuUsage === null
        ) {
          current.cpuUsage = metric.value;
        }

        if (
          metric.name === 'memory_usage' &&
          current.memoryUsage === null
        ) {
          current.memoryUsage = metric.value;
        }

        if (
          current.updatedAt === null ||
          metric.timestamp >
            new Date(current.updatedAt)
        ) {
          current.updatedAt =
            metric.timestamp.toISOString();
        }

        telemetryMap.set(metric.serviceId, current);
      }

      // ------------------------------------------------------------
      // 4. Combine services + telemetry
      // ------------------------------------------------------------

      const servicesWithTelemetry = services.map(
        (service) => ({
          ...service,

          telemetry:
            telemetryMap.get(service.id) ?? {
              requestRate: null,
              errorRate: null,
              p95Latency: null,
              cpuUsage: null,
              memoryUsage: null,
              updatedAt: null,
            },
        }),
      );

      // ------------------------------------------------------------
      // 5. Pagination
      // ------------------------------------------------------------

      const totalPages = Math.ceil(total / limit);

      // ------------------------------------------------------------
      // 6. Response
      // ------------------------------------------------------------

      return reply.send({
        success: true,

        data: servicesWithTelemetry,

        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },

        requestId: request.id,
      });
    },
  );
}