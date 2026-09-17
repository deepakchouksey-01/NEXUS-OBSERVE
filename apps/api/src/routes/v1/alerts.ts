import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';

const alertQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(200).default(50),

    status: z.enum(['FIRING', 'RESOLVED']).optional(),

    service: z.string().trim().min(1).max(100).optional(),

    search: z.string().trim().min(1).max(200).optional(),

    enabled: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
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

const alertIdSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

const triggerAlertSchema = z.object({
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']).default('SEV3'),

  title: z.string().trim().min(1).max(200).optional(),

  rootCause: z.string().trim().max(2000).optional(),

  impact: z.string().trim().max(2000).optional(),

  confidence: z.coerce.number().min(0).max(1).optional(),

  evidence: z.record(z.string(), z.unknown()).optional(),
});

const resolveAlertSchema = z.object({
  resolutionNote: z.string().trim().max(2000).optional(),
});

type AlertTriggerInput = z.infer<typeof triggerAlertSchema>;

function buildIncidentTitle(
  alertName: string,
  customTitle?: string,
): string {
  return customTitle?.trim() || `${alertName} incident`;
}

function getIncidentServiceId(alert: {
  service: { id: string } | null;
  services: Array<{
    service: {
      id: string;
    };
  }>;
}): string | null {
  if (alert.service?.id) {
    return alert.service.id;
  }

  const firstService = alert.services[0]?.service;

  return firstService?.id ?? null;
}

async function getNextIncidentNumber(
  tx: {
    incident: {
      findFirst: typeof prisma.incident.findFirst;
    };
  },
  serviceId: string,
): Promise<number> {
  const latestIncident = await tx.incident.findFirst({
    where: {
      serviceId,
    },
    orderBy: {
      number: 'desc',
    },
    select: {
      number: true,
    },
  });

  return (latestIncident?.number ?? 1000) + 1;
}

async function triggerAlertAndCorrelateIncident(
  alertId: string,
  input: AlertTriggerInput,
) {
  return prisma.$transaction(async (tx) => {
    const alert = await tx.alert.findUnique({
      where: {
        id: alertId,
      },
      select: {
        id: true,
        name: true,
        condition: true,
        status: true,
        enabled: true,
        organizationId: true,
        serviceId: true,
        incidentId: true,

        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            version: true,
          },
        },

        services: {
          select: {
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
    });

    if (!alert) {
      return {
        ok: false as const,
        error: 'ALERT_NOT_FOUND',
      };
    }

    if (!alert.enabled) {
      return {
        ok: false as const,
        error: 'ALERT_DISABLED',
      };
    }

    const now = new Date();

    /*
     * If the alert is already firing and linked to an incident,
     * do not create another incident.
     */
    if (alert.status === 'FIRING' && alert.incidentId) {
      const existingIncident = await tx.incident.findUnique({
        where: {
          id: alert.incidentId,
        },
        select: {
          id: true,
          number: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
        },
      });

      if (
        existingIncident &&
        existingIncident.status !== 'RESOLVED' &&
        existingIncident.status !== 'CLOSED'
      ) {
        const updatedIncident = await tx.incident.update({
          where: {
            id: existingIncident.id,
          },
          data: {
            severity: input.severity,
            rootCause: input.rootCause,
            impact: input.impact,
            confidence: input.confidence,
            evidence: input.evidence as any,
            updatedAt: now,
          },
          select: {
            id: true,
            number: true,
            title: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
          },
        });

        const updatedAlert = await tx.alert.update({
          where: {
            id: alert.id,
          },
          data: {
            status: 'FIRING',
            triggeredAt: alert.status === 'FIRING'
              ? undefined
              : now,
            resolvedAt: null,
          },
          select: {
            id: true,
            name: true,
            status: true,
            enabled: true,
            triggeredAt: true,
            resolvedAt: true,
            incidentId: true,
          },
        });

        return {
          ok: true as const,
          action: 'UPDATED_EXISTING_INCIDENT' as const,
          alert: updatedAlert,
          incident: updatedIncident,
        };
      }
    }

    const serviceId = getIncidentServiceId(alert);

    /*
     * Incident requires a serviceId in the current schema.
     * Therefore an alert without a service cannot be correlated
     * into an Incident.
     */
    if (!serviceId) {
      return {
        ok: false as const,
        error: 'ALERT_SERVICE_REQUIRED',
      };
    }

    /*
     * Correlate against an already-open incident for the same
     * service before creating a new incident.
     */
    const existingIncident = await tx.incident.findFirst({
      where: {
        serviceId,
        status: {
          in: ['OPEN', 'INVESTIGATING', 'MITIGATING'],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        number: true,
        title: true,
        severity: true,
        status: true,
        startedAt: true,
        resolvedAt: true,
      },
    });

    if (existingIncident) {
      const updatedIncident = await tx.incident.update({
        where: {
          id: existingIncident.id,
        },
        data: {
          severity: input.severity,
          rootCause: input.rootCause,
          impact: input.impact,
          confidence: input.confidence,
          evidence: input.evidence as any,
          updatedAt: now,
        },
        select: {
          id: true,
          number: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
        },
      });

      const updatedAlert = await tx.alert.update({
        where: {
          id: alert.id,
        },
        data: {
          status: 'FIRING',
          incidentId: existingIncident.id,
          triggeredAt: now,
          resolvedAt: null,
        },
        select: {
          id: true,
          name: true,
          status: true,
          enabled: true,
          triggeredAt: true,
          resolvedAt: true,
          incidentId: true,
        },
      });

      return {
        ok: true as const,
        action: 'CORRELATED_EXISTING_INCIDENT' as const,
        alert: updatedAlert,
        incident: updatedIncident,
      };
    }

    const incidentNumber = await getNextIncidentNumber(tx, serviceId);

    const incident = await tx.incident.create({
      data: {
        serviceId,
        number: incidentNumber,
        title: buildIncidentTitle(alert.name, input.title),
        severity: input.severity,
        status: 'OPEN',
        startedAt: now,
        rootCause: input.rootCause,
        impact: input.impact,
        confidence: input.confidence,
        evidence: input.evidence as any,
      },
      select: {
        id: true,
        number: true,
        title: true,
        severity: true,
        status: true,
        startedAt: true,
        resolvedAt: true,
      },
    });

    const updatedAlert = await tx.alert.update({
      where: {
        id: alert.id,
      },
      data: {
        status: 'FIRING',
        incidentId: incident.id,
        triggeredAt: now,
        resolvedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        enabled: true,
        triggeredAt: true,
        resolvedAt: true,
        incidentId: true,
      },
    });

    return {
      ok: true as const,
      action: 'CREATED_INCIDENT' as const,
      alert: updatedAlert,
      incident,
    };
  });
}

async function resolveAlertAndIncident(
  alertId: string,
  resolutionNote?: string,
) {
  return prisma.$transaction(async (tx) => {
    const alert = await tx.alert.findUnique({
      where: {
        id: alertId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        incidentId: true,
      },
    });

    if (!alert) {
      return {
        ok: false as const,
        error: 'ALERT_NOT_FOUND',
      };
    }

    const now = new Date();

    let incident = null;

    if (alert.incidentId) {
      incident = await tx.incident.findUnique({
        where: {
          id: alert.incidentId,
        },
        select: {
          id: true,
          number: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
        },
      });

      if (
        incident &&
        incident.status !== 'RESOLVED' &&
        incident.status !== 'CLOSED'
      ) {
        incident = await tx.incident.update({
          where: {
            id: incident.id,
          },
          data: {
            status: 'RESOLVED',
            resolvedAt: now,
            impact: resolutionNote
              ? resolutionNote
              : undefined,
            updatedAt: now,
          },
          select: {
            id: true,
            number: true,
            title: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
          },
        });
      }
    }

    const updatedAlert = await tx.alert.update({
      where: {
        id: alert.id,
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: now,
      },
      select: {
        id: true,
        name: true,
        status: true,
        enabled: true,
        triggeredAt: true,
        resolvedAt: true,
        incidentId: true,
      },
    });

    return {
      ok: true as const,
      alert: updatedAlert,
      incident,
    };
  });
}

export async function alertRoutes(app: FastifyInstance) {
  /*
   * GET /api/v1/alerts
   */
  app.get(
    '/alerts',
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
      const parsedQuery = alertQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid alerts query parameters.',
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
        service,
        search,
        enabled,
        from,
        to,
      } = query;

      const organizationId = request.auth!.organizationId;

      const skip = (page - 1) * limit;

      const where = {
        organizationId,

        ...(status
          ? {
              status,
            }
          : {}),

        ...(enabled !== undefined
          ? {
              enabled,
            }
          : {}),

        ...(service
          ? {
              OR: [
                {
                  service: {
                    organizationId,
                    slug: service,
                  },
                },
                {
                  services: {
                    some: {
                      service: {
                        organizationId,
                        slug: service,
                      },
                    },
                  },
                },
              ],
            }
          : {}),

        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),

        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      };

      const [alerts, total] = await Promise.all([
        prisma.alert.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,

          select: {
            id: true,
            name: true,
            condition: true,
            status: true,
            enabled: true,
            triggeredAt: true,
            resolvedAt: true,
            createdAt: true,
            updatedAt: true,

            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },

            service: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                version: true,
              },
            },

            incident: {
              select: {
                id: true,
                number: true,
                title: true,
                severity: true,
                status: true,
              },
            },

            services: {
              select: {
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

        prisma.alert.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return reply.send({
        success: true,
        data: alerts,
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

  /*
   * POST /api/v1/alerts/:id/trigger
   *
   * Used by monitor execution / telemetry evaluation.
   * It changes the alert to FIRING and correlates it with
   * an existing Incident or creates a new Incident.
   */
  app.post(
    '/alerts/:id/trigger',
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
      const parsedId = alertIdSchema.safeParse(request.params);

      if (!parsedId.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid alert ID.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const parsedBody = triggerAlertSchema.safeParse(request.body ?? {});

      if (!parsedBody.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid alert trigger payload.',
            details: parsedBody.error.flatten(),
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const alert = await prisma.alert.findFirst({
        where: {
          id: parsedId.data.id,
          organizationId: request.auth!.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!alert) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Alert not found.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const result = await triggerAlertAndCorrelateIncident(
        alert.id,
        parsedBody.data,
      );

      if (!result.ok) {
        const statusCode =
          result.error === 'ALERT_NOT_FOUND'
            ? 404
            : result.error === 'ALERT_DISABLED'
              ? 409
              : result.error === 'ALERT_SERVICE_REQUIRED'
                ? 422
                : 400;

        return reply.status(statusCode).send({
          success: false,
          error: {
            code: result.error,
            message:
              result.error === 'ALERT_DISABLED'
                ? 'The alert is disabled and cannot be triggered.'
                : result.error === 'ALERT_SERVICE_REQUIRED'
                  ? 'The alert must be associated with a service before it can create an incident.'
                  : 'Unable to trigger alert.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.status(202).send({
        success: true,
        data: {
          action: result.action,
          alert: result.alert,
          incident: result.incident,
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  /*
   * POST /api/v1/alerts/:id/resolve
   *
   * Resolves the alert and its linked active incident.
   */
  app.post(
    '/alerts/:id/resolve',
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
      const parsedId = alertIdSchema.safeParse(request.params);

      if (!parsedId.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid alert ID.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const parsedBody = resolveAlertSchema.safeParse(
        request.body ?? {},
      );

      if (!parsedBody.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid alert resolution payload.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const alert = await prisma.alert.findFirst({
        where: {
          id: parsedId.data.id,
          organizationId: request.auth!.organizationId,
        },
        select: {
          id: true,
        },
      });

      if (!alert) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Alert not found.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const result = await resolveAlertAndIncident(
        alert.id,
        parsedBody.data.resolutionNote,
      );

      if (!result.ok) {
        return reply.status(404).send({
          success: false,
          error: {
            code: result.error,
            message: 'Alert not found.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        success: true,
        data: {
          alert: result.alert,
          incident: result.incident,
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}