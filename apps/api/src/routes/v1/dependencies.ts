import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const dependencyQuerySchema = z
  .object({
    environment: z
      .enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
      .default('PRODUCTION'),

    from: z.coerce.date().optional(),

    to: z.coerce.date().optional(),

    search: z
      .string()
      .trim()
      .min(1)
      .max(100)
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
      message: '"from" date must be earlier than or equal to "to".',
      path: ['from'],
    },
  );

type DependencyAggregate = {
  requestCount: number;
  errorCount: number;
  durations: number[];
};

function percentile(
  values: number[],
  percentileValue: number,
) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const index =
    Math.ceil(
      (percentileValue / 100) *
        sorted.length,
    ) - 1;

  return sorted[
    Math.max(0, index)
  ];
}

export async function dependencyRoutes(
  app: FastifyInstance,
) {
  app.get(
    '/dependencies',
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
        dependencyQuerySchema.safeParse(
          request.query,
        );

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Invalid dependency query parameters.',
          },
          requestId: request.id,
          timestamp:
            new Date().toISOString(),
        });
      }

      const query = parsedQuery.data;

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

      const now = new Date();

      const from =
        query.from ??
        new Date(
          now.getTime() -
            60 * 60 * 1000,
        );

      const to =
        query.to ?? now;

      const spans =
        await prisma.span.findMany({
          where: {
            timestamp: {
              gte: from,
              lte: to,
            },

            service: {
              project: {
                organizationId,
              },

              ...(query.environment
                ? {
                    environment: {
                      kind: query.environment,
                    },
                  }
                : {}),
            },
          },

          orderBy: {
            timestamp: 'asc',
          },

          select: {
            id: true,
            traceId: true,
            spanId: true,
            parentSpanId: true,
            name: true,
            durationMs: true,
            status: true,
            timestamp: true,

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
        });

      const spanByTraceAndId =
        new Map<string, (typeof spans)[number]>();

      for (const span of spans) {
        spanByTraceAndId.set(
          `${span.traceId}:${span.spanId}`,
          span,
        );
      }

      const services = new Map<
        string,
        {
          id: string;
          name: string;
          slug: string;
          status: string;
          version: string | null;
          environment: {
            id: string;
            name: string;
            kind: string;
          };
          requestCount: number;
          errorCount: number;
          durations: number[];
        }
      >();

      const dependencies =
        new Map<
          string,
          DependencyAggregate & {
            sourceServiceId: string;
            targetServiceId: string;
            sourceServiceName: string;
            targetServiceName: string;
            sourceServiceSlug: string;
            targetServiceSlug: string;
          }
        >();

      for (const span of spans) {
        const existingService =
          services.get(
            span.service.id,
          );

        if (existingService) {
          existingService.requestCount += 1;

          if (
            span.status.toUpperCase() ===
            'ERROR'
          ) {
            existingService.errorCount += 1;
          }

          existingService.durations.push(
            span.durationMs,
          );
        } else {
          services.set(
            span.service.id,
            {
              id: span.service.id,
              name: span.service.name,
              slug: span.service.slug,
              status: span.service.status,
              version:
                span.service.version,
              environment:
                span.service.environment,
              requestCount: 1,
              errorCount:
                span.status.toUpperCase() ===
                'ERROR'
                  ? 1
                  : 0,
              durations: [
                span.durationMs,
              ],
            },
          );
        }

        if (!span.parentSpanId) {
          continue;
        }

        const parent =
          spanByTraceAndId.get(
            `${span.traceId}:${span.parentSpanId}`,
          );

        if (!parent) {
          continue;
        }

        if (
          parent.service.id ===
          span.service.id
        ) {
          continue;
        }

        const source =
          parent.service;

        const target =
          span.service;

        const dependencyKey =
          `${source.id}:${target.id}`;

        const existingDependency =
          dependencies.get(
            dependencyKey,
          );

        if (existingDependency) {
          existingDependency.requestCount += 1;

          if (
            span.status.toUpperCase() ===
            'ERROR'
          ) {
            existingDependency.errorCount += 1;
          }

          existingDependency.durations.push(
            span.durationMs,
          );
        } else {
          dependencies.set(
            dependencyKey,
            {
              sourceServiceId:
                source.id,
              targetServiceId:
                target.id,
              sourceServiceName:
                source.name,
              targetServiceName:
                target.name,
              sourceServiceSlug:
                source.slug,
              targetServiceSlug:
                target.slug,
              requestCount: 1,
              errorCount:
                span.status.toUpperCase() ===
                'ERROR'
                  ? 1
                  : 0,
              durations: [
                span.durationMs,
              ],
            },
          );
        }
      }

      const normalizedSearch =
        query.search?.toLowerCase();

      const serviceNodes =
        Array.from(
          services.values(),
        )
          .filter((service) => {
            if (!normalizedSearch) {
              return true;
            }

            return (
              service.name
                .toLowerCase()
                .includes(
                  normalizedSearch,
                ) ||
              service.slug
                .toLowerCase()
                .includes(
                  normalizedSearch,
                )
            );
          })
          .map((service) => {
            const errorRate =
              service.requestCount === 0
                ? 0
                : (service.errorCount /
                    service.requestCount) *
                  100;

            return {
              id: service.id,
              name: service.name,
              slug: service.slug,
              status: service.status,
              version: service.version,
              environment:
                service.environment,
              requestCount:
                service.requestCount,
              errorCount:
                service.errorCount,
              errorRate: Number(
                errorRate.toFixed(2),
              ),
              latencyP95: percentile(
                service.durations,
                95,
              ),
            };
          });

      const visibleServiceIds =
        new Set(
          serviceNodes.map(
            (service) => service.id,
          ),
        );

      const dependencyEdges =
        Array.from(
          dependencies.values(),
        )
          .filter(
            (dependency) =>
              visibleServiceIds.has(
                dependency.sourceServiceId,
              ) &&
              visibleServiceIds.has(
                dependency.targetServiceId,
              ),
          )
          .map((dependency) => {
            const errorRate =
              dependency.requestCount ===
              0
                ? 0
                : (dependency.errorCount /
                    dependency.requestCount) *
                  100;

            return {
              id: `${dependency.sourceServiceId}:${dependency.targetServiceId}`,
              source:
                dependency.sourceServiceId,
              target:
                dependency.targetServiceId,
              sourceService: {
                id:
                  dependency.sourceServiceId,
                name:
                  dependency.sourceServiceName,
                slug:
                  dependency.sourceServiceSlug,
              },
              targetService: {
                id:
                  dependency.targetServiceId,
                name:
                  dependency.targetServiceName,
                slug:
                  dependency.targetServiceSlug,
              },
              requestCount:
                dependency.requestCount,
              errorCount:
                dependency.errorCount,
              errorRate: Number(
                errorRate.toFixed(2),
              ),
              latencyP95: percentile(
                dependency.durations,
                95,
              ),
            };
          });

      const criticalCount =
        serviceNodes.filter(
          (service) =>
            service.status ===
            'CRITICAL',
        ).length;

      const degradedCount =
        serviceNodes.filter(
          (service) =>
            service.status ===
            'DEGRADED',
        ).length;

      const healthyCount =
        serviceNodes.filter(
          (service) =>
            service.status ===
            'HEALTHY',
        ).length;

      return reply.send({
        success: true,

        data: {
          services: serviceNodes,
          dependencies: dependencyEdges,

          summary: {
            services:
              serviceNodes.length,

            dependencies:
              dependencyEdges.length,

            healthy:
              healthyCount,

            degraded:
              degradedCount,

            critical:
              criticalCount,

            impactedPaths:
              dependencyEdges.filter(
                (dependency) =>
                  dependency.errorRate >
                    5 ||
                  dependency.latencyP95 >
                    500,
              ).length,
          },

          window: {
            from:
              from.toISOString(),
            to:
              to.toISOString(),
          },
        },

        requestId: request.id,
        timestamp:
          new Date().toISOString(),
      });
    },
  );
}