import 'dotenv/config';
import argon2 from 'argon2';

import { PrismaClient } from '../generated/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://nexus:nexus@localhost:5432/nexus_observe?schema=public';

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting NEXUS-OBSERVE database seed...');

  // ---------------------------------------------------------
  // 0. LOCAL DEVELOPMENT PASSWORD
  // ---------------------------------------------------------

  const developmentPassword = 'NexusDev!2026';

  const developmentPasswordHash = await argon2.hash(
    developmentPassword,
    {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    },
  );

  // ---------------------------------------------------------
  // 1. ORGANIZATION
  // ---------------------------------------------------------

  const organization = await prisma.organization.upsert({
    where: {
      slug: 'nexus-observe',
    },
    update: {},
    create: {
      name: 'NEXUS Observe',
      slug: 'nexus-observe',
    },
  });

  // ---------------------------------------------------------
  // 2. USERS
  // ---------------------------------------------------------

  const owner = await prisma.user.upsert({
    where: {
      email: 'admin@nexus-observe.local',
    },
    update: {
      name: 'NEXUS Administrator',
      passwordHash: developmentPasswordHash,
    },
    create: {
      email: 'admin@nexus-observe.local',
      name: 'NEXUS Administrator',
      passwordHash: developmentPasswordHash,
    },
  });

  const engineer = await prisma.user.upsert({
    where: {
      email: 'engineer@nexus-observe.local',
    },
    update: {
      name: 'Platform Engineer',
      passwordHash: developmentPasswordHash,
    },
    create: {
      email: 'engineer@nexus-observe.local',
      name: 'Platform Engineer',
      passwordHash: developmentPasswordHash,
    },
  });

  const incidentResponder = await prisma.user.upsert({
    where: {
      email: 'incident@nexus-observe.local',
    },
    update: {
      name: 'Incident Responder',
      passwordHash: developmentPasswordHash,
    },
    create: {
      email: 'incident@nexus-observe.local',
      name: 'Incident Responder',
      passwordHash: developmentPasswordHash,
    },
  });

  // ---------------------------------------------------------
  // 3. ORGANIZATION MEMBERS
  // ---------------------------------------------------------

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: {
      role: 'OWNER',
    },
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: 'OWNER',
    },
  });

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: engineer.id,
      },
    },
    update: {
      role: 'ENGINEER',
    },
    create: {
      organizationId: organization.id,
      userId: engineer.id,
      role: 'ENGINEER',
    },
  });

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: incidentResponder.id,
      },
    },
    update: {
      role: 'INCIDENT_RESPONDER',
    },
    create: {
      organizationId: organization.id,
      userId: incidentResponder.id,
      role: 'INCIDENT_RESPONDER',
    },
  });

  // ---------------------------------------------------------
  // 4. PROJECT
  // ---------------------------------------------------------

  const project = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: 'nexus-platform',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'NEXUS Platform',
      slug: 'nexus-platform',
    },
  });

  // ---------------------------------------------------------
  // 5. ENVIRONMENTS
  // ---------------------------------------------------------

  const production = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'Production',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'Production',
      kind: 'PRODUCTION',
    },
  });

  const staging = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'Staging',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'Staging',
      kind: 'STAGING',
    },
  });

  const development = await prisma.environment.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'Development',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'Development',
      kind: 'DEVELOPMENT',
    },
  });

  // ---------------------------------------------------------
  // 6. SERVICES
  // ---------------------------------------------------------

  const apiService = await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: production.id,
        slug: 'api-gateway',
      },
    },
    update: {
      status: 'HEALTHY',
      version: '2.4.1',
    },
    create: {
      projectId: project.id,
      environmentId: production.id,
      name: 'API Gateway',
      slug: 'api-gateway',
      status: 'HEALTHY',
      version: '2.4.1',
      description: 'Primary API gateway and request routing service.',
    },
  });

  const authService = await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: production.id,
        slug: 'auth-service',
      },
    },
    update: {
      status: 'HEALTHY',
      version: '1.8.3',
    },
    create: {
      projectId: project.id,
      environmentId: production.id,
      name: 'Auth Service',
      slug: 'auth-service',
      status: 'HEALTHY',
      version: '1.8.3',
      description: 'Authentication and authorization service.',
    },
  });

  const telemetryService = await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: production.id,
        slug: 'telemetry-service',
      },
    },
    update: {
      status: 'DEGRADED',
      version: '3.1.0',
    },
    create: {
      projectId: project.id,
      environmentId: production.id,
      name: 'Telemetry Service',
      slug: 'telemetry-service',
      status: 'DEGRADED',
      version: '3.1.0',
      description: 'Metrics, logs and telemetry ingestion pipeline.',
    },
  });

  const databaseService = await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: production.id,
        slug: 'database-service',
      },
    },
    update: {
      status: 'HEALTHY',
      version: '16.4',
    },
    create: {
      projectId: project.id,
      environmentId: production.id,
      name: 'Database Service',
      slug: 'database-service',
      status: 'HEALTHY',
      version: '16.4',
      description: 'Primary PostgreSQL data service.',
    },
  });

  const workerService = await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: production.id,
        slug: 'background-worker',
      },
    },
    update: {
      status: 'HEALTHY',
      version: '1.5.2',
    },
    create: {
      projectId: project.id,
      environmentId: production.id,
      name: 'Background Worker',
      slug: 'background-worker',
      status: 'HEALTHY',
      version: '1.5.2',
      description: 'Background jobs and asynchronous processing.',
    },
  });

  await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: staging.id,
        slug: 'api-gateway',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      environmentId: staging.id,
      name: 'API Gateway',
      slug: 'api-gateway',
      status: 'HEALTHY',
      version: '2.5.0-rc1',
      description: 'Staging API gateway.',
    },
  });

  await prisma.service.upsert({
    where: {
      environmentId_slug: {
        environmentId: development.id,
        slug: 'api-gateway',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      environmentId: development.id,
      name: 'API Gateway',
      slug: 'api-gateway',
      status: 'UNKNOWN',
      version: '2.5.0-dev',
      description: 'Development API gateway.',
    },
  });

  // ---------------------------------------------------------
  // 7. HOSTS
  // ---------------------------------------------------------

  const host1 = await prisma.host.upsert({
    where: {
      id: 'seed-host-prod-01',
    },
    update: {
      status: 'HEALTHY',
      cpuUsage: 42.5,
      memoryUsage: 61.2,
      diskUsage: 48.7,
      networkMbps: 184.3,
    },
    create: {
      id: 'seed-host-prod-01',
      organizationId: organization.id,
      environmentId: production.id,
      name: 'prod-node-01',
      hostname: 'prod-node-01.internal',
      ipAddress: '10.10.1.11',
      region: 'ap-south-1',
      status: 'HEALTHY',
      cpuUsage: 42.5,
      memoryUsage: 61.2,
      diskUsage: 48.7,
      networkMbps: 184.3,
      lastSeenAt: new Date(),
      metadata: {
        provider: 'internal',
        os: 'Linux',
        architecture: 'x86_64',
      },
    },
  });

  const host2 = await prisma.host.upsert({
    where: {
      id: 'seed-host-prod-02',
    },
    update: {
      status: 'DEGRADED',
      cpuUsage: 74.8,
      memoryUsage: 78.1,
      diskUsage: 67.3,
      networkMbps: 291.7,
    },
    create: {
      id: 'seed-host-prod-02',
      organizationId: organization.id,
      environmentId: production.id,
      name: 'prod-node-02',
      hostname: 'prod-node-02.internal',
      ipAddress: '10.10.1.12',
      region: 'ap-south-1',
      status: 'DEGRADED',
      cpuUsage: 74.8,
      memoryUsage: 78.1,
      diskUsage: 67.3,
      networkMbps: 291.7,
      lastSeenAt: new Date(),
      metadata: {
        provider: 'internal',
        os: 'Linux',
        architecture: 'x86_64',
      },
    },
  });

  const host3 = await prisma.host.upsert({
    where: {
      id: 'seed-host-stage-01',
    },
    update: {},
    create: {
      id: 'seed-host-stage-01',
      organizationId: organization.id,
      environmentId: staging.id,
      name: 'stage-node-01',
      hostname: 'stage-node-01.internal',
      ipAddress: '10.20.1.11',
      region: 'ap-south-1',
      status: 'HEALTHY',
      cpuUsage: 31.4,
      memoryUsage: 45.8,
      diskUsage: 39.1,
      networkMbps: 96.4,
      lastSeenAt: new Date(),
    },
  });

  // ---------------------------------------------------------
  // 8. SERVICE ↔ HOST RELATIONSHIPS
  // ---------------------------------------------------------

  const serviceHostMappings = [
    [apiService.id, host1.id],
    [apiService.id, host2.id],
    [authService.id, host1.id],
    [telemetryService.id, host2.id],
    [databaseService.id, host1.id],
    [databaseService.id, host2.id],
    [workerService.id, host2.id],
  ] as const;

  for (const [serviceId, hostId] of serviceHostMappings) {
    await prisma.serviceHost.upsert({
      where: {
        serviceId_hostId: {
          serviceId,
          hostId,
        },
      },
      update: {},
      create: {
        serviceId,
        hostId,
      },
    });
  }

  // ---------------------------------------------------------
  // 9. CONTAINERS
  // ---------------------------------------------------------

  const containers = [
    {
      id: 'seed-container-api-01',
      serviceId: apiService.id,
      hostId: host1.id,
      name: 'api-gateway-01',
      image: 'nexus/api-gateway',
      imageTag: '2.4.1',
      containerId: 'a1b2c3d4e5f6',
      status: 'RUNNING' as const,
      cpuUsage: 28.4,
      memoryUsage: 42.7,
      restartCount: 0,
    },
    {
      id: 'seed-container-api-02',
      serviceId: apiService.id,
      hostId: host2.id,
      name: 'api-gateway-02',
      image: 'nexus/api-gateway',
      imageTag: '2.4.1',
      containerId: 'b2c3d4e5f6a7',
      status: 'RUNNING' as const,
      cpuUsage: 46.2,
      memoryUsage: 55.1,
      restartCount: 1,
    },
    {
      id: 'seed-container-auth-01',
      serviceId: authService.id,
      hostId: host1.id,
      name: 'auth-service-01',
      image: 'nexus/auth-service',
      imageTag: '1.8.3',
      containerId: 'c3d4e5f6a7b8',
      status: 'RUNNING' as const,
      cpuUsage: 21.7,
      memoryUsage: 37.2,
      restartCount: 0,
    },
    {
      id: 'seed-container-telemetry-01',
      serviceId: telemetryService.id,
      hostId: host2.id,
      name: 'telemetry-service-01',
      image: 'nexus/telemetry',
      imageTag: '3.1.0',
      containerId: 'd4e5f6a7b8c9',
      status: 'RUNNING' as const,
      cpuUsage: 69.8,
      memoryUsage: 72.4,
      restartCount: 3,
    },
    {
      id: 'seed-container-worker-01',
      serviceId: workerService.id,
      hostId: host2.id,
      name: 'background-worker-01',
      image: 'nexus/worker',
      imageTag: '1.5.2',
      status: 'RUNNING' as const,
      cpuUsage: 34.9,
      memoryUsage: 48.5,
      restartCount: 0,
      containerId: 'e5f6a7b8c9d0',
    },
  ];

  for (const container of containers) {
    await prisma.container.upsert({
      where: {
        id: container.id,
      },
      update: {
        status: container.status,
        cpuUsage: container.cpuUsage,
        memoryUsage: container.memoryUsage,
      },
      create: {
        id: container.id,
        organizationId: organization.id,
        environmentId: production.id,
        serviceId: container.serviceId,
        hostId: container.hostId,
        name: container.name,
        image: container.image,
        imageTag: container.imageTag,
        containerId: container.containerId,
        status: container.status,
        cpuUsage: container.cpuUsage,
        memoryUsage: container.memoryUsage,
        restartCount: container.restartCount,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        lastSeenAt: new Date(),
      },
    });
  }

  // ---------------------------------------------------------
  // 10. METRICS
  // ---------------------------------------------------------

  const now = Date.now();

  const metricDefinitions = [
    {
      serviceId: apiService.id,
      name: 'http.request.rate',
      value: 1842,
      labels: {
        method: 'GET',
        route: '/api/*',
        status: '2xx',
      },
    },
    {
      serviceId: apiService.id,
      name: 'http.request.duration.p95',
      value: 284,
      labels: {
        unit: 'ms',
      },
    },
    {
      serviceId: authService.id,
      name: 'http.request.rate',
      value: 736,
      labels: {
        method: 'POST',
        route: '/auth/*',
      },
    },
    {
      serviceId: telemetryService.id,
      name: 'telemetry.ingestion.rate',
      value: 12450,
      labels: {
        unit: 'events/s',
      },
    },
    {
      serviceId: telemetryService.id,
      name: 'telemetry.queue.depth',
      value: 1820,
      labels: {
        queue: 'default',
      },
    },
    {
      serviceId: databaseService.id,
      name: 'database.connections.active',
      value: 84,
      labels: {
        database: 'postgresql',
      },
    },
    {
      serviceId: workerService.id,
      name: 'worker.jobs.processed',
      value: 4821,
      labels: {
        unit: 'jobs/min',
      },
    },
  ];

  for (let i = 0; i < metricDefinitions.length; i++) {
    const metric = metricDefinitions[i];

    await prisma.metric.create({
      data: {
        serviceId: metric.serviceId,
        name: metric.name,
        value: metric.value,
        timestamp: new Date(now - i * 60_000),
        labels: metric.labels,
      },
    });
  }

  // ---------------------------------------------------------
  // 11. LOGS
  // ---------------------------------------------------------

  await prisma.log.createMany({
    data: [
      {
        serviceId: apiService.id,
        level: 'INFO',
        message: 'HTTP request completed successfully',
        timestamp: new Date(now - 2 * 60_000),
        requestId: 'req_01HXNEXUS001',
        metadata: {
          method: 'GET',
          route: '/api/v1/services',
          statusCode: 200,
          durationMs: 42,
        },
      },
      {
        serviceId: telemetryService.id,
        level: 'WARN',
        message: 'Telemetry ingestion queue depth is above threshold',
        timestamp: new Date(now - 4 * 60_000),
        requestId: 'req_01HXNEXUS002',
        metadata: {
          queueDepth: 1820,
          threshold: 1500,
        },
      },
      {
        serviceId: apiService.id,
        level: 'INFO',
        message: 'Authentication middleware completed',
        timestamp: new Date(now - 6 * 60_000),
        requestId: 'req_01HXNEXUS003',
      },
      {
        serviceId: databaseService.id,
        level: 'INFO',
        message: 'Database connection pool operating normally',
        timestamp: new Date(now - 8 * 60_000),
        metadata: {
          activeConnections: 84,
          maxConnections: 200,
        },
      },
      {
        serviceId: telemetryService.id,
        level: 'ERROR',
        message: 'Telemetry batch processing exceeded expected duration',
        timestamp: new Date(now - 12 * 60_000),
        requestId: 'req_01HXNEXUS004',
        metadata: {
          durationMs: 4310,
          expectedMs: 2000,
        },
      },
    ],
  });

  // ---------------------------------------------------------
  // 12. TRACE
  // ---------------------------------------------------------

  const traceId = 'trace_seed_000001';
  const rootSpanId = 'span_seed_root_001';

  await prisma.trace.upsert({
    where: {
      traceId,
    },
    update: {},
    create: {
      serviceId: apiService.id,
      traceId,
      spanId: rootSpanId,
      name: 'GET /api/v1/services',
      durationMs: 284,
      status: 'OK',
      timestamp: new Date(now - 5 * 60_000),
      metadata: {
        httpMethod: 'GET',
        httpStatus: 200,
      },
    },
  });

  await prisma.span.upsert({
    where: {
      traceId_spanId: {
        traceId,
        spanId: rootSpanId,
      },
    },
    update: {},
    create: {
      traceId,
      spanId: rootSpanId,
      serviceId: apiService.id,
      name: 'GET /api/v1/services',
      durationMs: 284,
      status: 'OK',
      timestamp: new Date(now - 5 * 60_000),
      attributes: {
        httpMethod: 'GET',
        route: '/api/v1/services',
      },
    },
  });

  await prisma.span.upsert({
    where: {
      traceId_spanId: {
        traceId,
        spanId: 'span_seed_auth_001',
      },
    },
    update: {},
    create: {
      traceId,
      spanId: 'span_seed_auth_001',
      parentSpanId: rootSpanId,
      serviceId: authService.id,
      name: 'authenticate request',
      durationMs: 41,
      status: 'OK',
      timestamp: new Date(now - 5 * 60_000),
    },
  });

  await prisma.span.upsert({
    where: {
      traceId_spanId: {
        traceId,
        spanId: 'span_seed_db_001',
      },
    },
    update: {},
    create: {
      traceId,
      spanId: 'span_seed_db_001',
      parentSpanId: rootSpanId,
      serviceId: databaseService.id,
      name: 'SELECT services',
      durationMs: 96,
      status: 'OK',
      timestamp: new Date(now - 5 * 60_000),
      attributes: {
        database: 'postgresql',
      },
    },
  });

  // ---------------------------------------------------------
  // 13. INCIDENT
  // ---------------------------------------------------------

  const incident = await prisma.incident.upsert({
    where: {
      serviceId_number: {
        serviceId: telemetryService.id,
        number: 1001,
      },
    },
    update: {},
    create: {
      serviceId: telemetryService.id,
      number: 1001,
      title: 'Telemetry ingestion latency elevated',
      severity: 'SEV2',
      status: 'INVESTIGATING',
      startedAt: new Date(now - 45 * 60_000),
      impact:
        'Telemetry ingestion latency is elevated for a subset of production traffic.',
      confidence: 0.91,
      evidence: {
        queueDepth: 1820,
        p95LatencyMs: 4310,
        thresholdMs: 2000,
      },
    },
  });

  // ---------------------------------------------------------
  // 14. ALERTS
  // ---------------------------------------------------------

  const alert = await prisma.alert.upsert({
    where: {
      id: 'seed-alert-telemetry-latency',
    },
    update: {
      status: 'FIRING',
      incidentId: incident.id,
    },
    create: {
      id: 'seed-alert-telemetry-latency',
      organizationId: organization.id,
      serviceId: telemetryService.id,
      incidentId: incident.id,
      name: 'Telemetry ingestion latency',
      condition: {
        metric: 'telemetry.ingestion.latency.p95',
        operator: '>',
        threshold: 2000,
        duration: '5m',
      },
      status: 'FIRING',
      enabled: true,
      triggeredAt: new Date(now - 45 * 60_000),
    },
  });

  await prisma.alertService.upsert({
    where: {
      alertId_serviceId: {
        alertId: alert.id,
        serviceId: telemetryService.id,
      },
    },
    update: {},
    create: {
      alertId: alert.id,
      serviceId: telemetryService.id,
    },
  });

  // ---------------------------------------------------------
  // 15. MONITOR
  // ---------------------------------------------------------

  const monitor = await prisma.monitor.upsert({
    where: {
      id: 'seed-monitor-api-health',
    },
    update: {},
    create: {
      id: 'seed-monitor-api-health',
      organizationId: organization.id,
      name: 'API Gateway Health',
      query: {
        metric: 'http.request.duration.p95',
        operator: '<',
        threshold: 500,
      },
      intervalSeconds: 60,
      enabled: true,
      lastRunAt: new Date(now - 30_000),
      lastSuccessAt: new Date(now - 30_000),
    },
  });

  await prisma.monitorService.upsert({
    where: {
      monitorId_serviceId: {
        monitorId: monitor.id,
        serviceId: apiService.id,
      },
    },
    update: {},
    create: {
      monitorId: monitor.id,
      serviceId: apiService.id,
    },
  });

  // ---------------------------------------------------------
  // 16. SLO
  // ---------------------------------------------------------

  await prisma.sLO.upsert({
    where: {
      serviceId_name: {
        serviceId: apiService.id,
        name: 'API Availability',
      },
    },
    update: {
      current: 99.97,
    },
    create: {
      serviceId: apiService.id,
      name: 'API Availability',
      target: 99.95,
      windowSeconds: 30 * 24 * 60 * 60,
      current: 99.97,
      errorBudget: 0.03,
      burnRate: 0.42,
    },
  });

  await prisma.sLO.upsert({
    where: {
      serviceId_name: {
        serviceId: telemetryService.id,
        name: 'Telemetry Ingestion Success',
      },
    },
    update: {
      current: 99.82,
    },
    create: {
      serviceId: telemetryService.id,
      name: 'Telemetry Ingestion Success',
      target: 99.9,
      windowSeconds: 30 * 24 * 60 * 60,
      current: 99.82,
      errorBudget: 0.08,
      burnRate: 1.37,
    },
  });

  // ---------------------------------------------------------
  // 17. DEPLOYMENTS
  // ---------------------------------------------------------

  await prisma.deployment.createMany({
    data: [
      {
        serviceId: apiService.id,
        version: '2.4.1',
        deployedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        status: 'SUCCESS',
        commitSha: '8a91f3c',
        deployedBy: 'deployment-bot',
      },
      {
        serviceId: authService.id,
        version: '1.8.3',
        deployedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
        status: 'SUCCESS',
        commitSha: 'c712aa4',
        deployedBy: 'deployment-bot',
      },
      {
        serviceId: telemetryService.id,
        version: '3.1.0',
        deployedAt: new Date(now - 6 * 60 * 60 * 1000),
        status: 'SUCCESS',
        commitSha: 'f51e2d9',
        deployedBy: 'deployment-bot',
      },
    ],
  });

  // ---------------------------------------------------------
  // 18. INTEGRATIONS
  // ---------------------------------------------------------

  await prisma.integration.upsert({
    where: {
      id: 'seed-integration-slack',
    },
    update: {
      status: 'CONNECTED',
    },
    create: {
      id: 'seed-integration-slack',
      organizationId: organization.id,
      name: 'Slack',
      type: 'SLACK',
      status: 'CONNECTED',
      configuration: {
        channel: '#nexus-alerts',
      },
      lastSyncAt: new Date(now - 5 * 60_000),
    },
  });

  await prisma.integration.upsert({
    where: {
      id: 'seed-integration-github',
    },
    update: {
      status: 'CONNECTED',
    },
    create: {
      id: 'seed-integration-github',
      organizationId: organization.id,
      name: 'GitHub',
      type: 'GITHUB',
      status: 'CONNECTED',
      configuration: {
        repository: 'nexus-observe',
      },
      lastSyncAt: new Date(now - 15 * 60_000),
    },
  });

  await prisma.integration.upsert({
    where: {
      id: 'seed-integration-pagerduty',
    },
    update: {
      status: 'DISCONNECTED',
    },
    create: {
      id: 'seed-integration-pagerduty',
      organizationId: organization.id,
      name: 'PagerDuty',
      type: 'PAGERDUTY',
      status: 'DISCONNECTED',
    },
  });

  // ---------------------------------------------------------
  // 19. API KEY
  // ---------------------------------------------------------

  await prisma.apiKey.upsert({
    where: {
      keyHash: 'seed-api-key-hash',
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Local Development Key',
      keyPrefix: 'nxs_live_',
      keyHash: 'seed-api-key-hash',
      status: 'ACTIVE',
      scopes: [
        'telemetry:write',
        'metrics:read',
        'logs:read',
        'traces:read',
      ],
      environment: 'development',
    },
  });

  // ---------------------------------------------------------
  // 20. NOTIFICATIONS
  // ---------------------------------------------------------

  await prisma.notification.createMany({
    data: [
      {
        organizationId: organization.id,
        type: 'INCIDENT',
        recipient: 'incident@nexus-observe.local',
        subject: 'SEV2 Incident Investigating',
        message: 'Telemetry ingestion latency is currently elevated.',
        status: 'SENT',
        sentAt: new Date(now - 30 * 60_000),
      },
      {
        organizationId: organization.id,
        type: 'ALERT',
        recipient: 'admin@nexus-observe.local',
        subject: 'Telemetry Alert Firing',
        message:
          'Telemetry ingestion latency exceeded the configured threshold.',
        status: 'SENT',
        sentAt: new Date(now - 40 * 60_000),
      },
    ],
  });

  // ---------------------------------------------------------
  // 21. AUDIT LOGS
  // ---------------------------------------------------------

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: owner.id,
        action: 'CREATE',
        resource: 'PROJECT',
        resourceId: project.id,
        severity: 'INFO',
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'NEXUS-OBSERVE',
      },
      {
        organizationId: organization.id,
        userId: engineer.id,
        action: 'DEPLOY',
        resource: 'SERVICE',
        resourceId: apiService.id,
        severity: 'INFO',
        success: true,
        ipAddress: '10.10.1.50',
        userAgent: 'NEXUS-CLI',
      },
      {
        organizationId: organization.id,
        userId: incidentResponder.id,
        action: 'ACKNOWLEDGE',
        resource: 'INCIDENT',
        resourceId: incident.id,
        severity: 'WARNING',
        success: true,
        ipAddress: '10.10.1.51',
        userAgent: 'NEXUS-OBSERVE',
      },
    ],
  });

  // ---------------------------------------------------------
  // SEED SUMMARY
  // ---------------------------------------------------------

  console.log('');
  console.log('✅ NEXUS-OBSERVE seed completed successfully.');
  console.log('');
  console.log(`Organization : ${organization.name}`);
  console.log(`Project      : ${project.name}`);
  console.log('Services     : 7');
  console.log('Hosts        : 3');
  console.log('Environments : 3');
  console.log('Incident     : INC-1001');
  console.log('');
  console.log('Local development accounts:');
  console.log('  admin@nexus-observe.local');
  console.log('  engineer@nexus-observe.local');
  console.log('  incident@nexus-observe.local');
  console.log('');
  console.log(`Local development password: ${developmentPassword}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });