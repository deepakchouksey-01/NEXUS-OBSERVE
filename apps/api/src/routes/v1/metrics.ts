import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

/*
 * ----------------------------------------------------------------------------
 * GET /metrics query validation
 * ----------------------------------------------------------------------------
 */
const metricQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .default(50),

    name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    service: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    from: z.coerce
      .date()
      .optional(),

    to: z.coerce
      .date()
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true;
      }

      return data.from <= data.to;
    },
    {
      message:
        '"from" date must be earlier than or equal to "to" date.',
      path: ['from'],
    },
  );

/*
 * ----------------------------------------------------------------------------
 * POST /metrics ingestion validation
 * ----------------------------------------------------------------------------
 */
const metricIngestionItemSchema = z.object({
  service: z
    .string()
    .trim()
    .min(1)
    .max(100),

  name: z
    .string()
    .trim()
    .min(1)
    .max(100),

  value: z
    .number()
    .finite(),

  timestamp: z
    .coerce
    .date()
    .optional(),

  labels: z
    .record(z.string(), z.unknown())
    .optional(),
});

const metricIngestionSchema = z.object({
  metrics: z
    .array(metricIngestionItemSchema)
    .min(1)
    .max(200),
});

export async function metricRoutes(
  app: FastifyInstance,
) {
  /*
   * --------------------------------------------------------------------------
   * POST /metrics
   *
   * Telemetry metric ingestion endpoint.
   * Used by agents, workers and application integrations.
   * --------------------------------------------------------------------------
   */
  app.post(
    '/metrics',
    {
      preHandler: [
        authenticate,
        requireRole(
          'OWNER',
          'ADMIN',
          'ENGINEER',
          'INCIDENT_RESPONDER',
        ),
      ],
    },
    async (request, reply) => {
      /*
       * Validate ingestion payload.
       */
      const parsedBody =
        metricIngestionSchema.safeParse(
          request.body,
        );

      if (!parsedBody.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code:
              'VALIDATION_ERROR',
            message:
              'Invalid metric ingestion payload.',
            details:
              parsedBody.error.flatten(),
          },
          requestId: request.id,
          timestamp:
            new Date().toISOString(),
        });
      }

      /*
       * Organization context.
       */
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return reply.status(403).send({
          success: false,
          error: {
            code:
              'ORGANIZATION_ACCESS_DENIED',
            message:
              'Organization context is required.',
          },
          requestId: request.id,
          timestamp:
            new Date().toISOString(),
        });
      }

      const { metrics } =
        parsedBody.data;

      /*
       * Resolve unique service slugs.
       */
      const serviceSlugs = [
        ...new Set(
          metrics.map(
            (metric) =>
              metric.service,
          ),
        ),
      ];

      /*
       * Only resolve services belonging
       * to the authenticated organization.
       */
      const services =
        await prisma.service.findMany({
          where: {
            slug: {
              in: serviceSlugs,
            },

            project: {
              organizationId,
            },
          },

          select: {
            id: true,
            slug: true,
          },
        });

      const servicesBySlug =
        new Map(
          services.map(
            (service) => [
              service.slug,
              service,
            ],
          ),
        );

      /*
       * Reject unknown services.
       */
      const unknownServices =
        serviceSlugs.filter(
          (slug) =>
            !servicesBySlug.has(
              slug,
            ),
        );

      if (
        unknownServices.length > 0
      ) {
        return reply.status(422).send({
          success: false,
          error: {
            code:
              'UNKNOWN_SERVICE',
            message:
              'One or more services do not belong to the authenticated organization.',
            details: {
              services:
                unknownServices,
            },
          },
          requestId: request.id,
          timestamp:
            new Date().toISOString(),
        });
      }

      /*
       * Prepare database rows.
       *
       * Prisma 7 JSON fields require a
       * JSON-compatible value. The payload
       * has already been validated by Zod.
       */
      const rows = metrics.map(
        (metric) => ({
          serviceId:
            servicesBySlug.get(
              metric.service,
            )!.id,

          name: metric.name,

          value: metric.value,

          timestamp:
            metric.timestamp ??
            new Date(),

          labels:
            (metric.labels ??
              {}) as any,
        }),
      );

      /*
       * Batch insert.
       */
      await prisma.metric.createMany({
        data: rows,
      });

      /*
       * Return accepted count.
       */
      return reply.status(202).send({
        success: true,

        data: {
          accepted: rows.length,
          rejected: 0,
        },

        requestId: request.id,

        timestamp:
          new Date().toISOString(),
      });
    },
  );

  /*
   * --------------------------------------------------------------------------
   * GET /metrics
   *
   * Existing metrics query endpoint.
   * --------------------------------------------------------------------------
   */
  app.get(
    '/metrics',
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
      /*
       * Validate query parameters.
       */
      const parsedQuery =
        metricQuerySchema.safeParse(
          request.query,
        );

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code:
              'VALIDATION_ERROR',
            message:
              'Invalid metrics query parameters.',
          },
          requestId: request.id,
          timestamp:
            new Date().toISOString(),
        });
      }

      const query =
        parsedQuery.data;

      const {
        page,
        limit,
        name,
        service,
        from,
        to,
      } = query;

      /*
       * Organization context.
       */
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return reply.status(403).send({
          success: false,
          error: {
            code:
              'ORGANIZATION_ACCESS_DENIED',
            message:
              'Organization context is required.',
          },
          requestId: request.id,
          timestamp:
            new Date().toISOString(),
        });
      }

      /*
       * Pagination.
       */
      const skip =
        (page - 1) * limit;

      /*
       * Organization-scoped metric filter.
       */
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

        ...(name
          ? {
              name: {
                contains: name,
                mode:
                  'insensitive' as const,
              },
            }
          : {}),

        ...(from || to
          ? {
              timestamp: {
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

      /*
       * Fetch metrics and total count.
       */
      const [
        metrics,
        total,
      ] = await Promise.all([
        prisma.metric.findMany({
          where,

          orderBy: {
            timestamp: 'desc',
          },

          skip,

          take: limit,

          select: {
            id: true,
            name: true,
            value: true,
            timestamp: true,
            labels: true,

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

        prisma.metric.count({
          where,
        }),
      ]);

      /*
       * Pagination metadata.
       */
      const totalPages =
        Math.ceil(
          total / limit,
        );

      /*
       * API response.
       */
      return reply.send({
        success: true,

        data: metrics,

        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage:
            page < totalPages,
          hasPreviousPage:
            page > 1,
        },

        requestId:
          request.id,

        timestamp:
          new Date().toISOString(),
      });
    },
  );
}