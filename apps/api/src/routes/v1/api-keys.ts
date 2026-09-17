import type { FastifyInstance } from 'fastify';
import { ApiKeyStatus } from '@nexus/database';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const apiKeyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(200).default(50),

  search: z.string().trim().min(1).max(200).optional(),

  status: z.enum(ApiKeyStatus).optional(),

  environment: z.string().trim().min(1).max(100).optional(),

  expires: z.enum(['expired', 'active']).optional(),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  app.get(
    '/api-keys',
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
      const parsedQuery = apiKeyQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid API keys query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const {
        page,
        limit,
        search,
        status,
        environment,
        expires,
      } = parsedQuery.data;

      const skip = (page - 1) * limit;
      const now = new Date();

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

        ...(status
          ? {
              status,
            }
          : {}),

        ...(environment
          ? {
              environment,
            }
          : {}),

        ...(expires === 'expired'
          ? {
              expiresAt: {
                lt: now,
              },
            }
          : expires === 'active'
            ? {
                OR: [
                  {
                    expiresAt: null,
                  },
                  {
                    expiresAt: {
                      gte: now,
                    },
                  },
                ],
              }
            : {}),
      };

      const [apiKeys, total] = await Promise.all([
        prisma.apiKey.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,

          // Security: keyHash is intentionally never selected.
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            status: true,
            scopes: true,
            environment: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
            revokedAt: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),

        prisma.apiKey.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: apiKeys,
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