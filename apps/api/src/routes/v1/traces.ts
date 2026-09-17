import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const traceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .default(50),

    service: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    status: z
      .string()
      .trim()
      .min(1)
      .max(30)
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
      message:
        '"from" date must be earlier than or equal to "to" date.',
      path: ['from'],
    },
  );

/*
 * ============================================================================
 * POST /traces ingestion schemas
 * ============================================================================
 */

const spanIngestionSchema = z.object({
  spanId: z
    .string()
    .trim()
    .min(1)
    .max(200),

  parentSpanId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),

  service: z
    .string()
    .trim()
    .min(1)
    .max(100),

  name: z
    .string()
    .trim()
    .min(1)
    .max(500),

  durationMs: z
    .number()
    .int()
    .min(0)
    .max(86_400_000),

  status: z
    .string()
    .trim()
    .min(1)
    .max(30),

  timestamp: z
    .coerce
    .date()
    .optional(),

  attributes: z
    .record(z.string(), z.unknown())
    .optional(),
});

const traceIngestionItemSchema = z.object({
  traceId: z
    .string()
    .trim()
    .min(1)
    .max(200),

  spanId: z
    .string()
    .trim()
    .min(1)
    .max(200),

  service: z
    .string()
    .trim()
    .min(1)
    .max(100),

  name: z
    .string()
    .trim()
    .min(1)
    .max(500),

  durationMs: z
    .number()
    .int()
    .min(0)
    .max(86_400_000),

  status: z
    .string()
    .trim()
    .min(1)
    .max(30),

  timestamp: z
    .coerce
    .date()
    .optional(),

  metadata: z
    .record(z.string(), z.unknown())
    .optional(),

  spans: z
    .array(spanIngestionSchema)
    .max(100)
    .optional(),
});

const traceIngestionSchema = z.object({
  traces: z
    .array(traceIngestionItemSchema)
    .min(1)
    .max(100),
});

/*
 * ============================================================================
 * Trace routes
 * ============================================================================
 */

export async function traceRoutes(app: FastifyInstance) {
  /*
   * ==========================================================================
   * POST /traces
   *
   * Distributed trace ingestion endpoint.
   *
   * Supported producers:
   * - telemetry agents
   * - application SDKs
   * - background workers
   * - OpenTelemetry adapters
   *
   * ==========================================================================
   */

  app.post(
    '/traces',
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
       * ------------------------------------------------------------------------
       * Validate request body
       * ------------------------------------------------------------------------
       */

      const parsedBody =
        traceIngestionSchema.safeParse(
          request.body,
        );

      if (!parsedBody.success) {
        return reply.status(400).send({
          success: false,

          error: {
            code: 'VALIDATION_ERROR',

            message:
              'Invalid trace ingestion payload.',

            details:
              parsedBody.error.flatten(),
          },

          requestId: request.id,

          timestamp:
            new Date().toISOString(),
        });
      }

      /*
       * ------------------------------------------------------------------------
       * Organization context
       * ------------------------------------------------------------------------
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

      const { traces } =
        parsedBody.data;

      /*
       * ------------------------------------------------------------------------
       * Collect every referenced service.
       *
       * Includes:
       * - root trace services
       * - child span services
       * ------------------------------------------------------------------------
       */

      const serviceSlugs = [
        ...new Set(
          traces.flatMap((trace) => [
            trace.service,

            ...(trace.spans ?? []).map(
              (span) => span.service,
            ),
          ]),
        ),
      ];

      /*
       * ------------------------------------------------------------------------
       * Resolve services only inside the authenticated
       * organization.
       * ------------------------------------------------------------------------
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
          services.map((service) => [
            service.slug,
            service,
          ]),
        );

      /*
       * ------------------------------------------------------------------------
       * Reject services that do not belong to the
       * authenticated organization.
       * ------------------------------------------------------------------------
       */

      const unknownServices =
        serviceSlugs.filter(
          (slug) =>
            !servicesBySlug.has(slug),
        );

      if (unknownServices.length > 0) {
        return reply.status(422).send({
          success: false,

          error: {
            code: 'UNKNOWN_SERVICE',

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
       * ------------------------------------------------------------------------
       * Validate trace payload structure.
       *
       * Prevent:
       * - duplicate span IDs
       * - missing root span
       * - root span/service inconsistencies
       * ------------------------------------------------------------------------
       */

      for (const trace of traces) {
        const spanIds =
          new Set<string>();

        for (const span of trace.spans ?? []) {
          /*
           * Duplicate span inside same payload.
           */

          if (spanIds.has(span.spanId)) {
            return reply.status(400).send({
              success: false,

              error: {
                code:
                  'DUPLICATE_SPAN_ID',

                message:
                  'Duplicate spanId detected inside a trace payload.',

                details: {
                  traceId:
                    trace.traceId,

                  spanId:
                    span.spanId,
                },
              },

              requestId:
                request.id,

              timestamp:
                new Date().toISOString(),
            });
          }

          spanIds.add(
            span.spanId,
          );
        }

        /*
         * When spans are supplied, the root trace
         * span must be present.
         */

        if (
          trace.spans &&
          trace.spans.length > 0 &&
          !spanIds.has(
            trace.spanId,
          )
        ) {
          return reply.status(400).send({
            success: false,

            error: {
              code:
                'ROOT_SPAN_MISSING',

              message:
                'The trace root span must be present in the spans collection.',

              details: {
                traceId:
                  trace.traceId,

                spanId:
                  trace.spanId,
              },
            },

            requestId:
              request.id,

            timestamp:
              new Date().toISOString(),
          });
        }

        /*
         * Root span must use the same service
         * as the trace itself.
         *
         * Find the matching root span when spans
         * are supplied.
         */

        const rootSpan =
          trace.spans?.find(
            (span) =>
              span.spanId ===
              trace.spanId,
          );

        if (
          rootSpan &&
          rootSpan.service !==
            trace.service
        ) {
          return reply.status(400).send({
            success: false,

            error: {
              code:
                'ROOT_SPAN_SERVICE_MISMATCH',

              message:
                'The trace root span must belong to the same service as the trace.',

              details: {
                traceId:
                  trace.traceId,

                traceService:
                  trace.service,

                rootSpanService:
                  rootSpan.service,

                spanId:
                  trace.spanId,
              },
            },

            requestId:
              request.id,

            timestamp:
              new Date().toISOString(),
          });
        }
      }

      /*
       * ------------------------------------------------------------------------
       * Process the complete batch inside one transaction.
       *
       * Important security property:
       *
       * A globally unique traceId must never allow a user from
       * another organization to append spans to an existing trace.
       * ------------------------------------------------------------------------
       */

      let acceptedTraces = 0;

      let acceptedSpans = 0;

      let duplicateTraces = 0;

      await prisma.$transaction(
        async (tx) => {
          for (const trace of traces) {
            /*
             * --------------------------------------------------------------
             * Check existing trace.
             *
             * The organization condition is intentional.
             * --------------------------------------------------------------
             */

            const existingTrace =
              await tx.trace.findUnique({
                where: {
                  traceId:
                    trace.traceId,
                },

                select: {
                  id: true,

                  service: {
                    select: {
                      project: {
                        select: {
                          organizationId:
                            true,
                        },
                      },
                    },
                  },
                },
              });

            /*
             * --------------------------------------------------------------
             * Existing trace belongs to another organization.
             *
             * Never allow the incoming request to attach spans
             * to it.
             * --------------------------------------------------------------
             */

            if (
              existingTrace &&
              existingTrace.service.project
                .organizationId !==
                organizationId
            ) {
              throw new Error(
                `TRACE_ORGANIZATION_CONFLICT:${trace.traceId}`,
              );
            }

            /*
             * --------------------------------------------------------------
             * Create root trace when it does not exist.
             * --------------------------------------------------------------
             */

            if (!existingTrace) {
              await tx.trace.create({
                data: {
                  serviceId:
                    servicesBySlug.get(
                      trace.service,
                    )!.id,

                  traceId:
                    trace.traceId,

                  spanId:
                    trace.spanId,

                  name:
                    trace.name,

                  durationMs:
                    trace.durationMs,

                  status:
                    trace.status,

                  timestamp:
                    trace.timestamp ??
                    new Date(),

                  metadata:
                    (trace.metadata ?? {}) as any,
                },
              });

              acceptedTraces += 1;
            } else {
              duplicateTraces += 1;
            }

            /*
             * --------------------------------------------------------------
             * Insert child/root spans.
             *
             * skipDuplicates makes the endpoint safely
             * idempotent for already-ingested spans.
             * --------------------------------------------------------------
             */

            if (
              trace.spans &&
              trace.spans.length > 0
            ) {
              const spanRows =
                trace.spans.map(
                  (span) => ({
                    traceId:
                      trace.traceId,

                    spanId:
                      span.spanId,

                    parentSpanId:
                      span.parentSpanId ??
                      null,

                    serviceId:
                      servicesBySlug.get(
                        span.service,
                      )!.id,

                    name:
                      span.name,

                    durationMs:
                      span.durationMs,

                    status:
                      span.status,

                    timestamp:
                      span.timestamp ??
                      trace.timestamp ??
                      new Date(),

                    attributes:
                      (span.attributes ?? {}) as any,
                  }),
                );

              const result =
                await tx.span.createMany({
                  data:
                    spanRows,

                  skipDuplicates:
                    true,
                });

              acceptedSpans +=
                result.count;
            }
          }
        },
      );

      /*
       * ------------------------------------------------------------------------
       * 202 Accepted
       * ------------------------------------------------------------------------
       */

      return reply.status(202).send({
        success: true,

        data: {
          accepted: {
            traces:
              acceptedTraces,

            spans:
              acceptedSpans,
          },

          duplicates: {
            traces:
              duplicateTraces,
          },

          received: {
            traces:
              traces.length,

            spans:
              traces.reduce(
                (
                  total,
                  trace,
                ) =>
                  total +
                  (trace.spans
                    ?.length ??
                    0),

                0,
              ),
          },
        },

        requestId:
          request.id,

        timestamp:
          new Date().toISOString(),
      });
    },
  );

  /*
   * ==========================================================================
   * GET /traces
   *
   * Existing trace query endpoint.
   * ==========================================================================
   */

  app.get(
    '/traces',
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
      const parsedQuery =
        traceQuerySchema.safeParse(
          request.query,
        );

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,

          error: {
            code:
              'VALIDATION_ERROR',

            message:
              'Invalid traces query parameters.',
          },

          requestId:
            request.id,

          timestamp:
            new Date().toISOString(),
        });
      }

      const {
        page,
        limit,
        service,
        status,
        search,
        from,
        to,
      } = parsedQuery.data;

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

          requestId:
            request.id,

          timestamp:
            new Date().toISOString(),
        });
      }

      const skip =
        (page - 1) * limit;

      const where = {
        service: {
          project: {
            organizationId,
          },
        },

        ...(service
          ? {
              service: {
                project: {
                  organizationId,
                },

                slug:
                  service,
              },
            }
          : {}),

        ...(status
          ? {
              status,
            }
          : {}),

        ...(search
          ? {
              OR: [
                {
                  traceId: {
                    contains:
                      search,

                    mode:
                      'insensitive' as const,
                  },
                },

                {
                  name: {
                    contains:
                      search,

                    mode:
                      'insensitive' as const,
                  },
                },

                {
                  service: {
                    project: {
                      organizationId,
                    },
                  },

                  name: {
                    contains:
                      search,

                    mode:
                      'insensitive' as const,
                  },
                },
              ],
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

      const [
        traces,
        total,
        errorCount,
        slowCount,
        serviceGroups,
      ] = await Promise.all([
        prisma.trace.findMany({
          where,

          orderBy: {
            timestamp:
              'desc',
          },

          skip,

          take: limit,

          select: {
            id: true,

            traceId: true,

            spanId: true,

            name: true,

            durationMs: true,

            status: true,

            timestamp: true,

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

            spans: {
              orderBy: {
                timestamp:
                  'asc',
              },

              select: {
                id: true,

                spanId: true,

                parentSpanId: true,

                name: true,

                durationMs: true,

                status: true,

                timestamp: true,

                attributes: true,

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

        prisma.trace.count({
          where,
        }),

        prisma.trace.count({
          where: {
            ...where,

            status:
              'ERROR',
          },
        }),

        prisma.trace.count({
          where: {
            ...where,

            durationMs: {
              gt: 500,
            },
          },
        }),

        prisma.trace.groupBy({
          by: [
            'serviceId',
          ],

          where,
        }),
      ]);

      const totalPages =
        Math.ceil(
          total / limit,
        );

      return reply.send({
        success: true,

        data: traces,

        summary: {
          totalTraces:
            total,

          errorTraces:
            errorCount,

          slowTraces:
            slowCount,

          servicesTraced:
            serviceGroups.length,
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

        requestId:
          request.id,

        timestamp:
          new Date().toISOString(),
      });
    },
  );
}