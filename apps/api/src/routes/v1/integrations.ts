import type { FastifyInstance } from 'fastify';
import { IntegrationStatus } from '@nexus/database';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const integrationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(200).default(50),

  search: z.string().trim().min(1).max(200).optional(),

  type: z.string().trim().min(1).max(100).optional(),

  status: z.enum(IntegrationStatus).optional(),
});

export async function integrationRoutes(app: FastifyInstance) {
  app.get(
    '/integrations',
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
      const parsedQuery = integrationQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid integrations query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const { page, limit, search, type, status } = parsedQuery.data;

      const skip = (page - 1) * limit;

      const organizationId = request.auth!.organizationId;

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
      };

      const [integrations, total] = await Promise.all([
        prisma.integration.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,

          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSyncAt: true,
            createdAt: true,
            updatedAt: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),

        prisma.integration.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: integrations,
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