import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const auditLogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(200).default(50),

    search: z.string().trim().min(1).max(200).optional(),

    action: z.string().trim().min(1).max(100).optional(),

    resource: z.string().trim().min(1).max(100).optional(),

    severity: z.string().trim().min(1).max(30).optional(),

    success: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),

    userId: z.string().trim().min(1).max(100).optional(),

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

export async function auditLogRoutes(app: FastifyInstance) {
  app.get(
    '/audit-logs',
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
      const parsedQuery = auditLogQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid audit logs query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const {
        page,
        limit,
        search,
        action,
        resource,
        severity,
        success,
        userId,
        from,
        to,
      } = parsedQuery.data;

      const skip = (page - 1) * limit;

      const organizationId = request.auth!.organizationId;

      const where = {
        organizationId,

        ...(search
          ? {
              OR: [
                {
                  action: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  resource: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  resourceId: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  user: {
                    is: {
                      OR: [
                        {
                          name: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                        {
                          email: {
                            contains: search,
                            mode: 'insensitive' as const,
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),

        ...(action
          ? {
              action: {
                contains: action,
                mode: 'insensitive' as const,
              },
            }
          : {}),

        ...(resource
          ? {
              resource: {
                contains: resource,
                mode: 'insensitive' as const,
              },
            }
          : {}),

        ...(severity
          ? {
              severity,
            }
          : {}),

        ...(success !== undefined
          ? {
              success,
            }
          : {}),

        ...(userId
          ? {
              userId,
            }
          : {}),

        ...(from || to
          ? {
              createdAt: {
                ...(from
                  ? {
                      gte: from,
                    }
                  : {}),
                ...(to
                  ? {
                      lte: to,
                    }
                  : {}),
              },
            }
          : {}),
      };

      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,

          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            severity: true,
            success: true,
            userAgent: true,
            metadata: true,
            createdAt: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),

        prisma.auditLog.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: auditLogs,
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