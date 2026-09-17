import type {
  FastifyInstance,
  FastifyRequest,
} from 'fastify';

import { prisma } from './prisma.js';

type RequestStats = {
  requests: number;
  errors: number;
  latencies: number[];
};

const statsByOrganization = new Map<
  string,
  RequestStats
>();

const requestStartTimes = new WeakMap<
  FastifyRequest,
  bigint
>();

let flushTimer: NodeJS.Timeout | undefined;
let flushInProgress = false;

const FLUSH_INTERVAL_MS = 10_000;

function getStats(
  organizationId: string,
): RequestStats {
  const existing =
    statsByOrganization.get(organizationId);

  if (existing) {
    return existing;
  }

  const stats: RequestStats = {
    requests: 0,
    errors: 0,
    latencies: [],
  };

  statsByOrganization.set(
    organizationId,
    stats,
  );

  return stats;
}

function calculateP95(
  values: number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const index =
    Math.ceil(sorted.length * 0.95) - 1;

  return sorted[Math.max(0, index)];
}

async function flushTelemetry() {
  if (
    flushInProgress ||
    statsByOrganization.size === 0
  ) {
    return;
  }

  flushInProgress = true;

  try {
    const timestamp = new Date();

    for (const [
      organizationId,
      stats,
    ] of statsByOrganization.entries()) {
      if (stats.requests === 0) {
        continue;
      }

      const service =
        await prisma.service.findFirst({
          where: {
            slug: 'api-gateway',
            project: {
              organizationId,
            },
          },
          select: {
            id: true,
          },
        });

      if (!service) {
        continue;
      }

      const requestRate =
        stats.requests /
        (FLUSH_INTERVAL_MS / 1000);

      const errorRate =
        (stats.errors / stats.requests) * 100;

      const p95Latency =
        calculateP95(stats.latencies);

      const metrics = [
        {
          serviceId: service.id,
          name: 'request_rate',
          value: requestRate,
          timestamp,
          labels: {},
        },
        {
          serviceId: service.id,
          name: 'error_rate',
          value: errorRate,
          timestamp,
          labels: {},
        },
      ];

      if (p95Latency !== null) {
        metrics.push({
          serviceId: service.id,
          name: 'p95_latency',
          value: p95Latency,
          timestamp,
          labels: {},
        });
      }

      await prisma.metric.createMany({
        data: metrics,
      });
    }

    statsByOrganization.clear();
  } catch (error) {
    console.error(
      'Failed to flush request telemetry',
      error,
    );
  } finally {
    flushInProgress = false;
  }
}

export function registerRequestTelemetry(
  app: FastifyInstance,
) {
  app.addHook(
    'onRequest',
    async (request) => {
      requestStartTimes.set(
        request,
        process.hrtime.bigint(),
      );
    },
  );

  app.addHook(
    'onResponse',
    async (request, reply) => {
      const organizationId =
        request.auth?.organizationId;

      if (!organizationId) {
        return;
      }

      const startTime =
        requestStartTimes.get(request);

      if (!startTime) {
        return;
      }

      const durationMs =
        Number(
          process.hrtime.bigint() -
            startTime,
        ) / 1_000_000;

      const stats =
        getStats(organizationId);

      stats.requests += 1;

      if (reply.statusCode >= 400) {
        stats.errors += 1;
      }

      stats.latencies.push(
        durationMs,
      );

      if (stats.latencies.length > 1000) {
        stats.latencies.splice(
          0,
          stats.latencies.length - 1000,
        );
      }
    },
  );

  flushTimer = setInterval(
    () => {
      void flushTelemetry();
    },
    FLUSH_INTERVAL_MS,
  );

  flushTimer.unref();
}

export async function stopRequestTelemetry() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = undefined;
  }

  await flushTelemetry();
}