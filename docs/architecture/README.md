# Architecture Decision Record — Foundation

NEXUS starts as a modular monolith with independent workers. This keeps local development manageable while preserving boundaries for later horizontal scaling.

## Runtime boundaries

Web console → API → event/queue boundary → workers → telemetry processors → PostgreSQL/Redis.

## Non-negotiables

- Multi-tenant data isolation
- Request/correlation IDs
- Versioned API contracts
- Async telemetry ingestion
- Explicit authorization at service boundaries
- Observable internal services
