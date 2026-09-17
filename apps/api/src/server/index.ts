import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { errorHandler } from '../middleware/error-handler.js';
import { requestContext } from '../middleware/request-context.js';

import { registerRequestTelemetry } from '../lib/request-telemetry.js';

import { healthRoutes } from '../routes/v1/health.js';
import { organizationRoutes } from '../routes/v1/organizations.js';
import { serviceRoutes } from '../routes/v1/services.js';
import { containerRoutes } from '../routes/v1/containers.js';
import { hostRoutes } from '../routes/v1/hosts.js';
import { metricRoutes } from '../routes/v1/metrics.js';
import { logRoutes } from '../routes/v1/logs.js';
import { traceRoutes } from '../routes/v1/traces.js';
import { dependencyRoutes } from '../routes/v1/dependencies.js';
import { incidentRoutes } from '../routes/v1/incidents.js';
import { alertRoutes } from '../routes/v1/alerts.js';
import { monitorRoutes } from '../routes/v1/monitors.js';
import { sloRoutes } from '../routes/v1/slos.js';
import { deploymentRoutes } from '../routes/v1/deployments.js';
import { integrationRoutes } from '../routes/v1/integrations.js';
import { apiKeyRoutes } from '../routes/v1/api-keys.js';
import { notificationRoutes } from '../routes/v1/notifications.js';
import { auditLogRoutes } from '../routes/v1/audit-logs.js';
import { overviewRoutes } from '../routes/v1/overview.js';
import { authRoutes } from '../routes/v1/auth.js';

const app = Fastify({
  logger: true,

  requestIdHeader: 'x-request-id',

  genReqId: () => crypto.randomUUID(),

  /*
   * Prevent excessively large request bodies.
   *
   * Large telemetry payloads should eventually use
   * dedicated ingestion endpoints with their own limits.
   */
  bodyLimit: 1_048_576,

  /*
   * Protect the API from requests that stay open too long.
   */
  requestTimeout: 30_000,

  /*
   * Keep HTTP connections alive efficiently.
   */
  keepAliveTimeout: 72_000,

  /*
   * Limit URL parameter size.
   */
  maxParamLength: 200,
});

/*
 * Request context.
 *
 * Adds request-scoped information such as request IDs
 * before the application routes execute.
 */
app.addHook('onRequest', requestContext);

/*
 * Request telemetry.
 *
 * IMPORTANT:
 * This must be registered before the API routes.
 *
 * It measures authenticated application traffic and
 * periodically persists:
 *
 * - request_rate
 * - error_rate
 * - p95_latency
 *
 * into the Metric table.
 */
registerRequestTelemetry(app);

/*
 * Security headers.
 */
await app.register(helmet);

/*
 * Cookie support.
 */
await app.register(cookie);

/*
 * CORS.
 */
await app.register(cors, {
  origin:
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000',

  credentials: true,
});

/*
 * Global API rate limiting.
 */
await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
});

/*
 * Centralized error handling.
 */
app.setErrorHandler(errorHandler);

/*
 * API v1 routes.
 *
 * Request telemetry has already been registered above,
 * so these routes are covered by the telemetry hooks.
 */

await app.register(healthRoutes, {
  prefix: '/api/v1',
});

await app.register(authRoutes, {
  prefix: '/api/v1',
});

await app.register(organizationRoutes, {
  prefix: '/api/v1',
});

await app.register(serviceRoutes, {
  prefix: '/api/v1',
});

await app.register(containerRoutes, {
  prefix: '/api/v1',
});

await app.register(hostRoutes, {
  prefix: '/api/v1',
});

await app.register(metricRoutes, {
  prefix: '/api/v1',
});

await app.register(logRoutes, {
  prefix: '/api/v1',
});

await app.register(traceRoutes, {
  prefix: '/api/v1',
});

await app.register(dependencyRoutes, {
  prefix: '/api/v1',
});

await app.register(incidentRoutes, {
  prefix: '/api/v1',
});

await app.register(alertRoutes, {
  prefix: '/api/v1',
});

await app.register(monitorRoutes, {
  prefix: '/api/v1',
});

await app.register(sloRoutes, {
  prefix: '/api/v1',
});

await app.register(deploymentRoutes, {
  prefix: '/api/v1',
});

await app.register(integrationRoutes, {
  prefix: '/api/v1',
});

await app.register(apiKeyRoutes, {
  prefix: '/api/v1',
});

await app.register(notificationRoutes, {
  prefix: '/api/v1',
});

await app.register(auditLogRoutes, {
  prefix: '/api/v1',
});

await app.register(overviewRoutes, {
  prefix: '/api/v1',
});

/*
 * Start API server.
 */
const port = Number(
  process.env.PORT ?? 4000,
);

await app.listen({
  port,
  host: '0.0.0.0',
});