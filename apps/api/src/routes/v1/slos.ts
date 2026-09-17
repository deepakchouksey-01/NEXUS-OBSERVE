import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const sloQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(200).default(50),

    search: z.string().trim().min(1).max(200).optional(),

    service: z.string().trim().min(1).max(100).optional(),

    minTarget: z.coerce.number().finite().min(0).max(100).optional(),

    maxTarget: z.coerce.number().finite().min(0).max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.minTarget === undefined || data.maxTarget === undefined) {
        return true;
      }

      return data.minTarget <= data.maxTarget;
    },
    {
      message: '"minTarget" must be less than or equal to "maxTarget".',
      path: ['minTarget'],
    },
  );

export async function sloRoutes(app: FastifyInstance) {
  app.get(
    '/slos',
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
      const parsedQuery = sloQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid SLO query parameters.',
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
        service,
        minTarget,
        maxTarget,
      } = query;

      const skip = (page - 1) * limit;

      const organizationId = request.auth!.organizationId;

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
        service: {
          project: {
            organizationId,
          },
          ...(serviceId
            ? {
                id: serviceId,
              }
            : {}),
        },

        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),

        ...(minTarget !== undefined || maxTarget !== undefined
          ? {
              target: {
                ...(minTarget !== undefined
                  ? {
                      gte: minTarget,
                    }
                  : {}),

                ...(maxTarget !== undefined
                  ? {
                      lte: maxTarget,
                    }
                  : {}),
              },
            }
          : {}),
      };

      const [slos, total] = await Promise.all([
        prisma.sLO.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            target: true,
            windowSeconds: true,
            current: true,
            errorBudget: true,
            burnRate: true,
            createdAt: true,
            updatedAt: true,

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
        }),

        prisma.sLO.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: slos,
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