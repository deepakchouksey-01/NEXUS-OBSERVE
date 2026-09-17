import "dotenv/config";

import os from "node:os";

import pino from "pino";

import * as IORedis from "ioredis";

import { PrismaClient } from "@nexus/database";

import { PrismaPg } from "@prisma/adapter-pg";

const logger = pino({
  name: "nexus-worker",
  level: process.env.LOG_LEVEL ?? "info",
});

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://nexus:nexus@localhost:5432/nexus_observe?schema=public";

const REDIS_URL =
  process.env.REDIS_URL ??
  "redis://localhost:6379";

const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"],
});

const redis = new IORedis.Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

let heartbeatTimer: NodeJS.Timeout | undefined;

let shuttingDown = false;

/* -------------------------------------------------------------------------- */
/* DATABASE HEALTH                                                            */
/* -------------------------------------------------------------------------- */

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    logger.info(
      "PostgreSQL connection healthy",
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error,
      },
      "PostgreSQL connection failed",
    );

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* REDIS HEALTH                                                               */
/* -------------------------------------------------------------------------- */

async function checkRedis() {
  try {
    if (redis.status !== "ready") {
      logger.warn(
        {
          status: redis.status,
        },
        "Redis is not ready",
      );

      return false;
    }

    await redis.ping();

    logger.info(
      "Redis connection healthy",
    );

    return true;
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Redis connection failed",
    );

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* WORKER HEALTH                                                              */
/* -------------------------------------------------------------------------- */

async function collectWorkerHealth() {
  const databaseHealthy =
    await checkDatabase();

  const redisHealthy =
    await checkRedis();

  if (
    !databaseHealthy ||
    !redisHealthy
  ) {
    logger.warn(
      {
        databaseHealthy,
        redisHealthy,
      },
      "Worker dependencies are unhealthy",
    );

    return;
  }

  logger.debug(
    {
      timestamp: new Date().toISOString(),
    },
    "Worker dependency health check passed",
  );
}

/* -------------------------------------------------------------------------- */
/* LOG INGESTION                                                              */
/* -------------------------------------------------------------------------- */

async function collectLogs() {
  try {
    const timestamp = new Date();

    const services =
      await prisma.service.findMany({
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: 100,
      });

    if (services.length === 0) {
      logger.warn(
        "No services available for log ingestion",
      );

      return;
    }

    const logs = services.map(
      (service) => {
        const level =
          service.status === "CRITICAL"
            ? "ERROR"
            : service.status === "DEGRADED"
              ? "WARN"
              : "INFO";

        const message =
          level === "ERROR"
            ? `${service.name} reported a critical health state`
            : level === "WARN"
              ? `${service.name} health state requires attention`
              : `${service.name} health check completed successfully`;

        return {
          serviceId: service.id,
          level,
          message,
          timestamp,
          metadata: {
            source: "nexus-worker",
            collector: "service-health",
            serviceStatus:
              service.status,
          },
        };
      },
    );

    await prisma.log.createMany({
      data: logs,
    });

    logger.info(
      {
        logs: logs.length,
      },
      "Operational logs ingested",
    );
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Log collection failed",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* METRIC INGESTION                                                           */
/* -------------------------------------------------------------------------- */

async function collectTelemetry() {
  try {
    const timestamp = new Date();

    const memoryTotal = os.totalmem();

    const memoryFree = os.freemem();

    const memoryUsage =
      ((memoryTotal - memoryFree) /
        memoryTotal) *
      100;

    const loadAverage =
      os.loadavg()[0];

    const cpuCount =
      os.cpus().length;

    const cpuUsage =
      Math.min(
        100,
        Math.max(
          0,
          (loadAverage / cpuCount) *
            100,
        ),
      );

    const services =
      await prisma.service.findMany({
        select: {
          id: true,
          name: true,
        },
        take: 100,
      });

    if (services.length === 0) {
      logger.warn(
        "No services available for telemetry ingestion",
      );

      return;
    }

    const metrics =
      services.flatMap(
        (service) => [
          {
            serviceId: service.id,
            name: "cpu_usage",
            value: Number(
              cpuUsage.toFixed(2),
            ),
            timestamp,
            labels: {},
          },
          {
            serviceId: service.id,
            name: "memory_usage",
            value: Number(
              memoryUsage.toFixed(2),
            ),
            timestamp,
            labels: {},
          },
        ],
      );

    await prisma.metric.createMany({
      data: metrics,
    });

    logger.info(
      {
        services: services.length,
        metrics: metrics.length,
        cpuUsage: Number(
          cpuUsage.toFixed(2),
        ),
        memoryUsage: Number(
          memoryUsage.toFixed(2),
        ),
      },
      "Telemetry metrics ingested",
    );
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Telemetry collection failed",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DISTRIBUTED TRACE + SPAN INGESTION                                         */
/* -------------------------------------------------------------------------- */

async function collectTraces() {
  try {
    const timestamp = new Date();

    const services =
      await prisma.service.findMany({
        select: {
          id: true,
          name: true,
          status: true,
        },
        take: 10,
      });

    if (services.length === 0) {
      logger.warn(
        "No services available for trace ingestion",
      );

      return;
    }

    const traces = [];

    const spans = [];

    /*
     * We create a small distributed execution
     * chain for each root service.
     *
     * Example:
     *
     * API Gateway
     *   └── Auth Service
     *       └── Database Service
     *           └── Telemetry Service
     */

    const traceCount = Math.min(
      services.length,
      5,
    );

    for (
      let index = 0;
      index < traceCount;
      index++
    ) {
      const rootService =
        services[index];

      const uniqueSuffix =
        `${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

      const traceId =
        `trace_${uniqueSuffix}`;

      const rootSpanId =
        `span_${uniqueSuffix}_root`;

      const rootDurationMs =
        120 +
        Math.floor(
          Math.random() * 450,
        );

      const rootStatus =
        rootService.status === "CRITICAL"
          ? "ERROR"
          : rootService.status ===
              "DEGRADED"
            ? "WARNING"
            : "OK";

      /*
       * Root trace record.
       */

      traces.push({
        serviceId: rootService.id,
        traceId,
        spanId: rootSpanId,
        name: `${rootService.name} request`,
        durationMs: rootDurationMs,
        status: rootStatus,
        timestamp,
        metadata: {
          source: "nexus-worker",
          collector: "distributed-trace",
          operation: "http.request",
          traceType: "distributed",
        },
      });

      /*
       * Root span.
       */

      spans.push({
        traceId,
        spanId: rootSpanId,
        parentSpanId: null,
        serviceId: rootService.id,
        name: `${rootService.name}.request`,
        durationMs: rootDurationMs,
        status: rootStatus,
        timestamp,
        attributes: {
          "service.name":
            rootService.name,
          "service.status":
            rootService.status,
          "span.kind": "server",
          "http.method": "GET",
          "http.route": "/api/request",
          "collector": "nexus-worker",
        },
      });

      /*
       * Select up to three child services.
       */

      const childServices =
        services
          .filter(
            (service) =>
              service.id !==
              rootService.id,
          )
          .slice(0, 3);

      let parentSpanId =
        rootSpanId;

      /*
       * Create linked child spans.
       */

      for (
        let childIndex = 0;
        childIndex <
        childServices.length;
        childIndex++
      ) {
        const childService =
          childServices[childIndex];

        const spanId =
          `span_${uniqueSuffix}_${childIndex}`;

        const durationMs =
          40 +
          Math.floor(
            Math.random() * 250,
          );

        const childStatus =
          childService.status ===
          "CRITICAL"
            ? "ERROR"
            : childService.status ===
                "DEGRADED"
              ? "WARNING"
              : "OK";

        let operationName =
          "internal.operation";

        let spanKind =
          "internal";

        if (childIndex === 0) {
          operationName =
            "authenticate";

          spanKind = "internal";
        } else if (childIndex === 1) {
          operationName =
            "database.query";

          spanKind = "client";
        } else {
          operationName =
            "telemetry.collect";

          spanKind = "client";
        }

        spans.push({
          traceId,
          spanId,
          parentSpanId,
          serviceId:
            childService.id,
          name: `${childService.name}.${operationName}`,
          durationMs,
          status: childStatus,
          timestamp,
          attributes: {
            "service.name":
              childService.name,
            "service.status":
              childService.status,
            "span.kind": spanKind,
            "operation.name":
              operationName,
            "collector":
              "nexus-worker",
          },
        });

        /*
         * Make the next span a child
         * of the current span.
         */

        parentSpanId =
          spanId;
      }

      logger.debug(
        {
          traceId,
          rootService:
            rootService.name,
          spans:
            childServices.length + 1,
        },
        "Distributed trace constructed",
      );
    }

    /*
     * Insert root traces.
     */

    await prisma.trace.createMany({
      data: traces,
    });

    /*
     * Insert all spans.
     */

    await prisma.span.createMany({
      data: spans,
    });

    logger.info(
      {
        traces: traces.length,
        spans: spans.length,
      },
      "Distributed traces ingested",
    );
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Trace collection failed",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* WORKER STARTUP                                                             */
/* -------------------------------------------------------------------------- */

async function startWorker() {
  logger.info(
    {
      timestamp:
        new Date().toISOString(),
    },
    "NEXUS worker initialized",
  );

  logger.info(
    {
      database:
        DATABASE_URL.replace(
          /:\/\/[^@]+@/,
          "://***@",
        ),

      redis:
        REDIS_URL.replace(
          /:\/\/[^@]+@/,
          "://***@",
        ),
    },
    "Worker configuration loaded",
  );

  await collectWorkerHealth();

  await collectTelemetry();

  await collectLogs();

  await collectTraces();

  heartbeatTimer =
    setInterval(() => {
      void collectWorkerHealth();

      void collectTelemetry();

      void collectLogs();

      void collectTraces();

      logger.info(
        {
          timestamp:
            new Date().toISOString(),

          redisStatus:
            redis.status,
        },
        "worker heartbeat",
      );
    }, 30_000);
}

/* -------------------------------------------------------------------------- */
/* SHUTDOWN                                                                   */
/* -------------------------------------------------------------------------- */

async function shutdown(
  signal: string,
) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.info(
    {
      signal,
    },
    "Worker shutdown initiated",
  );

  if (heartbeatTimer) {
    clearInterval(
      heartbeatTimer,
    );

    heartbeatTimer = undefined;
  }

  try {
    await redis.quit();
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Failed to close Redis connection",
    );
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Failed to disconnect Prisma",
    );
  }

  logger.info(
    "NEXUS worker shutdown complete",
  );

  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/* PROCESS SIGNALS                                                            */
/* -------------------------------------------------------------------------- */

process.on(
  "SIGINT",
  () => {
    void shutdown("SIGINT");
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown("SIGTERM");
  },
);

process.on(
  "uncaughtException",
  (error) => {
    logger.fatal(
      {
        error,
      },
      "Uncaught worker exception",
    );

    void shutdown(
      "uncaughtException",
    );
  },
);

process.on(
  "unhandledRejection",
  (reason) => {
    logger.fatal(
      {
        reason,
      },
      "Unhandled worker rejection",
    );

    void shutdown(
      "unhandled_rejection",
    );
  },
);

/* -------------------------------------------------------------------------- */
/* START                                                                      */
/* -------------------------------------------------------------------------- */

void startWorker().catch(
  (error) => {
    logger.fatal(
      {
        error,
      },
      "Worker failed to start",
    );

    void shutdown(
      "startup_failure",
    );
  },
);