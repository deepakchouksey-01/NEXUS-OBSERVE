import type { FastifyInstance } from 'fastify';
import { NotificationStatus } from '@nexus/database';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const notificationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(200).default(50),

    search: z.string().trim().min(1).max(200).optional(),

    type: z.string().trim().min(1).max(100).optional(),

    status: z.enum(NotificationStatus).optional(),

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

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    '/notifications',
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
      const parsedQuery = notificationQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notifications query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const {
        page,
        limit,
        search,
        type,
        status,
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
                  recipient: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  subject: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  message: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),

        ...(type
          ? {
              type,
            }
          : {}),

        ...(status
          ? {
              status,
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

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,

          select: {
            id: true,
            type: true,
            recipient: true,
            subject: true,
            message: true,
            status: true,
            metadata: true,
            createdAt: true,
            sentAt: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),

        prisma.notification.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: notifications,
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