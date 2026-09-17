# NEXUS OBSERVE

Enterprise-grade observability, incident intelligence, and reliability platform.

## Architecture

- `apps/web` — Next.js 16 web console
- `apps/api` — API boundary and application services
- `apps/worker` — asynchronous processing and scheduled jobs
- `packages/*` — shared UI, types, config, validation, logging, telemetry
- `services/*` — ingestion, alerting, correlation, anomaly detection, RCA
- `database/prisma` — PostgreSQL schema and migrations
- `infrastructure` — Docker, Kubernetes, Nginx, monitoring, Terraform
- `docs` — architecture, API, security, deployment and runbooks

## Development principles

1. Tenant isolation is mandatory.
2. Every request carries a request/correlation ID.
3. APIs are versioned under `/api/v1`.
4. Telemetry ingestion is asynchronous and never blocks user-facing queries.
5. Production UI favors information density and clarity over decoration.
6. Features are not considered complete without validation, authorization, error states and tests.

## Start

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

PostgreSQL and Redis can be started with Docker Compose once infrastructure services are added.
