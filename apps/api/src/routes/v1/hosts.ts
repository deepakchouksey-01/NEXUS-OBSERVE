import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const hostQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).max(100).optional(),

  status: z
    .enum(['HEALTHY', 'DEGRADED', 'CRITICAL', 'OFFLINE', 'UNKNOWN'])
    .optional(),

  environment: z
    .enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
    .optional(),
});

export async function hostRoutes(app: FastifyInstance) {
  app.get(
    '/hosts',
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
      const parsedQuery = hostQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid hosts query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const query = parsedQuery.data;

      const {
        page,
        limit,
        search,
        status,
        environment,
      } = query;

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
        organizationId,

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
                  hostname: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  ipAddress: {
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

      const [hosts, total] = await Promise.all([
        prisma.host.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            hostname: true,
            ipAddress: true,
            region: true,
            status: true,
            cpuUsage: true,
            memoryUsage: true,
            diskUsage: true,
            networkMbps: true,
            lastSeenAt: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,

            environment: {
              select: {
                id: true,
                name: true,
                kind: true,
              },
            },

            services: {
              select: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                  },
                },
              },
            },

            containers: {
              select: {
                id: true,
                name: true,
                image: true,
                imageTag: true,
                status: true,
                cpuUsage: true,
                memoryUsage: true,
                restartCount: true,
                lastSeenAt: true,
              },
            },
          },
        }),

        prisma.host.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: hosts,
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