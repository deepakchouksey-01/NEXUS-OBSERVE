import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const containerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).max(100).optional(),

  status: z
    .enum(['RUNNING', 'STOPPED', 'RESTARTING', 'FAILED', 'UNKNOWN'])
    .optional(),

  environment: z
    .enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
    .optional(),

  service: z.string().trim().min(1).max(100).optional(),

  host: z.string().trim().min(1).max(100).optional(),
});

export async function containerRoutes(app: FastifyInstance) {
  app.get(
    '/containers',
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
      const parsedQuery = containerQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid containers query parameters.',
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
        service,
        host,
      } = query;

      const skip = (page - 1) * limit;

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
                  image: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  containerId: {
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

        ...(service
          ? {
              service: {
                slug: service,
              },
            }
          : {}),

        ...(host
          ? {
              host: {
                name: host,
              },
            }
          : {}),
      };

      const [containers, total] = await Promise.all([
        prisma.container.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            image: true,
            imageTag: true,
            containerId: true,
            status: true,
            cpuUsage: true,
            memoryUsage: true,
            restartCount: true,
            startedAt: true,
            lastSeenAt: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,

            organization: {
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

            service: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                version: true,
              },
            },

            host: {
              select: {
                id: true,
                name: true,
                hostname: true,
                ipAddress: true,
                region: true,
                status: true,
              },
            },
          },
        }),

        prisma.container.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: containers,
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