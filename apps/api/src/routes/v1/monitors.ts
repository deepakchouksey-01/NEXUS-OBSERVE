import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const monitorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(200).default(50),

  search: z.string().trim().min(1).max(200).optional(),

  enabled: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),

  service: z.string().trim().min(1).max(100).optional(),
});

export async function monitorRoutes(app: FastifyInstance) {
  app.get(
    '/monitors',
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
      const parsedQuery = monitorQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid monitors query parameters.',
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
        enabled,
        service,
      } = query;

      const organizationId = request.auth!.organizationId;

      const skip = (page - 1) * limit;

      let serviceId: string | undefined;

      if (service) {
        const serviceRecord = await prisma.service.findFirst({
          where: {
            slug: service,
            project: {
              organizationId,
            },
          },
          select: {
            id: true,
          },
        });

        serviceId = serviceRecord?.id;

        if (!serviceId) {
          return reply.send({
            success: true,
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: page > 1,
            },
            requestId: request.id,
          });
        }
      }

      const where = {
        organizationId,

        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),

        ...(enabled !== undefined
          ? {
              enabled,
            }
          : {}),

        ...(serviceId
          ? {
              services: {
                some: {
                  serviceId,
                },
              },
            }
          : {}),
      };

      const [monitors, total] = await Promise.all([
        prisma.monitor.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            query: true,
            intervalSeconds: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
            lastRunAt: true,
            lastSuccessAt: true,
            lastError: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            services: {
              select: {
                monitorId: true,
                serviceId: true,

                service: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                    version: true,
                  },
                },
              },
            },
          },
        }),

        prisma.monitor.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: monitors,
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