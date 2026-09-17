# Database Schema

The initial PostgreSQL schema models organizations, users, projects, environments, services, telemetry, incidents, alerts, SLOs, deployments and audit logs. High-volume telemetry tables are indexed by service and timestamp and are intended to receive retention/partitioning policies before large-scale production workloads.
