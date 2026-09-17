import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const deploymentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(200).default(50),

    service: z.string().trim().min(1).max(100).optional(),

    status: z.string().trim().min(1).max(30).optional(),

    version: z.string().trim().min(1).max(100).optional(),

    search: z.string().trim().min(1).max(200).optional(),

    from: z.coerce.date().optional(),

    to: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true;
      }

      return data.from <= data.to;
    },
    {
      message: '"from" date must be earlier than or equal to "to" date.',
      path: ['from'],
    },
  );

export async function deploymentRoutes(app: FastifyInstance) {
  app.get(
    '/deployments',
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
      const parsedQuery = deploymentQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid deployments query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const query = parsedQuery.data;

      const {
        page,
        limit,
        service,
        status,
        version,
        search,
        from,
        to,
      } = query;

      const skip = (page - 1) * limit;

      const organizationId = request.auth!.organizationId;

      const where = {
        service: {
          project: {
            organizationId,
          },

          ...(service
            ? {
                slug: service,
              }
            : {}),
        },

        ...(status
          ? {
              status,
            }
          : {}),

        ...(version
          ? {
              version: {
                contains: version,
                mode: 'insensitive' as const,
              },
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  version: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  commitSha: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  deployedBy: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),

        ...(from || to
          ? {
              deployedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      };

      const [deployments, total] = await Promise.all([
        prisma.deployment.findMany({
          where,
          orderBy: {
            deployedAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            version: true,
            deployedAt: true,
            status: true,
            commitSha: true,
            deployedBy: true,
            metadata: true,
            createdAt: true,

            service: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                version: true,

                environment: {
                  select: {
                    id: true,
                    name: true,
                    kind: true,
                  },
                },
              },
            },
          },
        }),

        prisma.deployment.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: deployments,
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