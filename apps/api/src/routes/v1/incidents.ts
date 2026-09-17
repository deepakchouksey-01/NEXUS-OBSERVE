import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const incidentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(200).default(50),

    status: z
      .enum([
        'OPEN',
        'INVESTIGATING',
        'MITIGATING',
        'RESOLVED',
        'CLOSED',
      ])
      .optional(),

    severity: z
      .enum(['SEV1', 'SEV2', 'SEV3', 'SEV4'])
      .optional(),

    service: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    search: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional(),

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

export async function incidentRoutes(app: FastifyInstance) {
  app.get(
    '/incidents',
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
      const parsedQuery = incidentQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid incidents query parameters.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const query = parsedQuery.data;

      const {
        page,
        limit,
        status,
        severity,
        service,
        search,
        from,
        to,
      } = query;

      const organizationId = request.auth!.organizationId;

      const skip = (page - 1) * limit;

      const where = {
        service: {
          project: {
            organizationId,
          },
        },

        ...(status
          ? {
              status,
            }
          : {}),

        ...(severity
          ? {
              severity,
            }
          : {}),

        ...(service
          ? {
              service: {
                project: {
                  organizationId,
                },
                slug: service,
              },
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  rootCause: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),

        ...(from || to
          ? {
              startedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      };

      const [incidents, total] = await Promise.all([
        prisma.incident.findMany({
          where,
          orderBy: {
            startedAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            number: true,
            title: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
            rootCause: true,
            impact: true,
            confidence: true,
            evidence: true,
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

            alerts: {
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                name: true,
                condition: true,
                status: true,
                enabled: true,
                triggeredAt: true,
                resolvedAt: true,
                createdAt: true,
              },
            },
          },
        }),

        prisma.incident.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: incidents,
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