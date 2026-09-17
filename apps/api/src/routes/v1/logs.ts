import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

/*
 * ----------------------------------------------------------------------------
 * GET /logs query validation
 * ----------------------------------------------------------------------------
 */
const logQuerySchema = z
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

    level: z
      .string()
      .trim()
      .min(1)
      .max(30)
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
 * POST /logs ingestion validation
 * ----------------------------------------------------------------------------
 */
const logIngestionItemSchema = z.object({
  service: z
    .string()
    .trim()
    .min(1)
    .max(100),

  level: z
    .string()
    .trim()
    .min(1)
    .max(30),

  message: z
    .string()
    .trim()
    .min(1)
    .max(10_000),

  timestamp: z
    .coerce
    .date()
    .optional(),

  traceId: z
    .string()
    .trim()
    .max(200)
    .optional(),

  spanId: z
    .string()
    .trim()
    .max(200)
    .optional(),

  requestId: z
    .string()
    .trim()
    .max(200)
    .optional(),

  metadata: z
    .record(z.string(), z.unknown())
    .optional(),
});

const logIngestionSchema = z.object({
  logs: z
    .array(logIngestionItemSchema)
    .min(1)
    .max(200),
});

export async function logRoutes(
  app: FastifyInstance,
) {
  /*
   * --------------------------------------------------------------------------
   * POST /logs
   *
   * Telemetry ingestion endpoint.
   * Used by agents, workers and application integrations.
   * --------------------------------------------------------------------------
   */
  app.post(
    '/logs',
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
        logIngestionSchema.safeParse(
          request.body,
        );

      if (!parsedBody.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Invalid log ingestion payload.',
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

      const { logs } =
        parsedBody.data;

      /*
       * Resolve unique service slugs.
       */
      const serviceSlugs = [
        ...new Set(
          logs.map(
            (log) => log.service,
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
       * Reject services that do not belong
       * to the current organization.
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
       * JSON-compatible value. The runtime
       * payload has already been validated by Zod.
       */
      const rows = logs.map(
        (log) => ({
          serviceId:
            servicesBySlug.get(
              log.service,
            )!.id,

          level: log.level,

          message: log.message,

          timestamp:
            log.timestamp ??
            new Date(),

          traceId:
            log.traceId ?? null,

          spanId:
            log.spanId ?? null,

          requestId:
            log.requestId ?? null,

          metadata:
            (log.metadata ??
              {}) as any,
        }),
      );

      /*
       * Batch insert.
       */
      await prisma.log.createMany({
        data: rows,
      });

      /*
       * 202 Accepted is appropriate for
       * telemetry ingestion.
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
   * GET /logs
   *
   * Existing logs query endpoint.
   * --------------------------------------------------------------------------
   */
  app.get(
    '/logs',
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
        logQuerySchema.safeParse(
          request.query,
        );

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code:
              'VALIDATION_ERROR',
            message:
              'Invalid logs query parameters.',
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
        level,
        service,
        search,
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
       * Organization-scoped log filter.
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

        /*
         * Log level filter.
         */
        ...(level
          ? {
              level,
            }
          : {}),

        /*
         * Correlation-aware search.
         */
        ...(search
          ? {
              OR: [
                {
                  message: {
                    contains:
                      search,
                    mode:
                      'insensitive' as const,
                  },
                },

                {
                  traceId: {
                    contains:
                      search,
                    mode:
                      'insensitive' as const,
                  },
                },

                {
                  spanId: {
                    contains:
                      search,
                    mode:
                      'insensitive' as const,
                  },
                },

                {
                  requestId: {
                    contains:
                      search,
                    mode:
                      'insensitive' as const,
                  },
                },

                {
                  service: {
                    name: {
                      contains:
                        search,
                      mode:
                        'insensitive' as const,
                    },
                  },
                },

                {
                  service: {
                    slug: {
                      contains:
                        search,
                      mode:
                        'insensitive' as const,
                    },
                  },
                },
              ],
            }
          : {}),

        /*
         * Time range.
         */
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
       * Fetch logs and summary statistics.
       */
      const [
        logs,
        total,
        errorCount,
        warningCount,
        sourceCount,
      ] = await Promise.all([
        /*
         * Paginated logs.
         */
        prisma.log.findMany({
          where,

          orderBy: {
            timestamp: 'desc',
          },

          skip,

          take: limit,

          select: {
            id: true,
            level: true,
            message: true,
            timestamp: true,
            traceId: true,
            spanId: true,
            requestId: true,
            metadata: true,

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

        /*
         * Total logs.
         */
        prisma.log.count({
          where,
        }),

        /*
         * ERROR count.
         */
        prisma.log.count({
          where: {
            ...where,
            level: 'ERROR',
          },
        }),

        /*
         * WARN count.
         */
        prisma.log.count({
          where: {
            ...where,
            level: 'WARN',
          },
        }),

        /*
         * Distinct log sources.
         */
        prisma.log.findMany({
          where,

          distinct: [
            'serviceId',
          ],

          select: {
            serviceId: true,
          },
        }),
      ]);

      /*
       * Pagination metadata.
       */
      const totalPages =
        Math.ceil(total / limit);

      /*
       * API response.
       */
      return reply.send({
        success: true,

        data: logs,

        summary: {
          totalLogs: total,
          errors: errorCount,
          warnings: warningCount,
          logSources:
            sourceCount.length,
        },

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

        requestId: request.id,

        timestamp:
          new Date().toISOString(),
      });
    },
  );
}