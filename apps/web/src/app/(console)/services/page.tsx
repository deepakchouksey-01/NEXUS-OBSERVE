"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  Clock3,
  Database,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type ServiceStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "CRITICAL"
  | "UNKNOWN";

type Service = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  version: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;

  project: {
    id: string;
    name: string;
    slug: string;
  };

  environment: {
    id: string;
    name: string;
    kind: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
  } | null;

  _count: {
    hosts: number;
    containers: number;
    metrics: number;
    logs: number;
    traces: number;
    incidents: number;
    deployments: number;
  };
};

type ServicesResponse = {
  success: boolean;
  data: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  requestId?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const statusOptions = [
  { label: "All", value: "" },
  { label: "Healthy", value: "HEALTHY" },
  { label: "Degraded", value: "DEGRADED" },
  { label: "Critical", value: "CRITICAL" },
];

function formatStatus(status: ServiceStatus) {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "DEGRADED":
      return "Degraded";
    case "CRITICAL":
      return "Critical";
    default:
      return "Unknown";
  }
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const className =
    status === "HEALTHY"
      ? styles.healthy
      : status === "DEGRADED"
        ? styles.degraded
        : status === "CRITICAL"
          ? styles.critical
          : styles.unknown;

  return (
    <span className={`${styles.statusBadge} ${className}`}>
      <i />
      {formatStatus(status)}
    </span>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return "Just now";

  const minutes = Math.floor(diff / 60_000);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [pagination, setPagination] =
    useState<ServicesResponse["pagination"] | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [environment, setEnvironment] = useState("PRODUCTION");

  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedService, setSelectedService] =
    useState<string | null>(null);

  const loadServices = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        }

        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        if (environment) {
          params.set("environment", environment);
        }

        const response = await fetch(
          `${API_URL}/api/v1/services?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const result =
          (await response.json()) as ServicesResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            "Unable to load services from the observability API.",
          );
        }

        setServices(result.data);
        setPagination(result.pagination);
      } catch (err) {
        console.error("Failed to load services:", err);

        setServices([]);
        setPagination(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load services.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [environment, page, search, statusFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadServices();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadServices]);

useEffect(() => {
  const timer = window.setTimeout(() => {
    setPage(1);
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [search, statusFilter, environment]);

  const healthy = services.filter(
    (service) => service.status === "HEALTHY",
  ).length;

  const degraded = services.filter(
    (service) => service.status === "DEGRADED",
  ).length;

  const critical = services.filter(
    (service) => service.status === "CRITICAL",
  ).length;

  const fleetHealth = useMemo(() => {
    if (!services.length) return 0;

    return Math.round((healthy / services.length) * 1000) / 10;
  }, [healthy, services.length]);

  const selected = services.find(
    (service) => service.id === selectedService,
  );

  const refresh = () => {
    void loadServices(true);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            OBSERVE <span>/</span> SERVICES
          </div>

          <h1>Services</h1>

          <p>
            Monitor service health, infrastructure footprint and
            observability coverage across your environments.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? styles.spin : ""}
            />
            Refresh
          </button>

          <button className={styles.primaryButton}>
            <Boxes size={15} />
            Add service
          </button>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.blue}`}>
            <Boxes size={18} />
          </div>

          <div>
            <span>Total services</span>
            <strong>{pagination?.total ?? 0}</strong>
            <small>
              {environment === "PRODUCTION"
                ? "Across production"
                : `Across ${environment.toLowerCase()}`}
            </small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.green}`}>
            <ShieldCheck size={18} />
          </div>

          <div>
            <span>Healthy</span>
            <strong>{healthy}</strong>
            <small>Operating normally</small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.amber}`}>
            <AlertTriangle size={18} />
          </div>

          <div>
            <span>Degraded</span>
            <strong>{degraded}</strong>
            <small>Needs attention</small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.red}`}>
            <AlertTriangle size={18} />
          </div>

          <div>
            <span>Critical</span>
            <strong>{critical}</strong>
            <small>Immediate attention</small>
          </div>
        </article>
      </section>

      <section className={styles.performanceStrip}>
        <div>
          <span>Environment health</span>
          <strong>{fleetHealth}%</strong>
        </div>

        <div className={styles.healthTrack}>
          <i style={{ width: `${fleetHealth}%` }} />
        </div>

        <div className={styles.performanceMeta}>
          <span>
            <Activity size={13} />
            {pagination?.total ?? 0} services tracked
          </span>

          <span>
            <Server size={13} />
            {services.reduce(
              (total, service) =>
                total + service._count.hosts,
              0,
            )}{" "}
            hosts
          </span>

          <span>
            <Clock3 size={13} />
            Updated just now
          </span>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search services..."
          />

          {search && (
            <button onClick={() => setSearch("")}>
              Clear
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <div className={styles.filter}>
            <span>Environment</span>

            <select
              value={environment}
              onChange={(event) =>
                setEnvironment(event.target.value)
              }
            >
              <option value="PRODUCTION">
                Production
              </option>

              <option value="STAGING">
                Staging
              </option>

              <option value="DEVELOPMENT">
                Development
              </option>
            </select>

            <ChevronDown size={13} />
          </div>

          <div className={styles.statusFilters}>
            {statusOptions.map((status) => (
              <button
                key={status.label}
                className={
                  statusFilter === status.value
                    ? styles.activeFilter
                    : ""
                }
                onClick={() => {
                  setStatusFilter(status.value);
                  setPage(1);
                }}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Service inventory</h2>

            <span>
              {loading
                ? "Loading services..."
                : `${services.length} services in current view`}
            </span>
          </div>

          <button className={styles.viewButton}>
            <Server size={14} />
            Infrastructure view
          </button>
        </div>

        {error && (
          <div className={styles.emptyState}>
            <AlertTriangle size={24} />

            <strong>Unable to load services</strong>

            <span>{error}</span>

            <button onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {!error && loading && (
          <div className={styles.emptyState}>
            <RefreshCw
              size={24}
              className={styles.spin}
            />

            <strong>Loading service inventory</strong>

            <span>
              Fetching the latest service data from NEXUS API.
            </span>
          </div>
        )}

        {!error && !loading && services.length > 0 && (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>SERVICE</th>
                  <th>STATUS</th>
                  <th>HOSTS</th>
                  <th>CONTAINERS</th>
                  <th>TELEMETRY</th>
                  <th>INCIDENTS</th>
                  <th>VERSION</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className={
                      selectedService === service.id
                        ? styles.selectedRow
                        : ""
                    }
                    onClick={() =>
                      setSelectedService(
                        selectedService === service.id
                          ? null
                          : service.id,
                      )
                    }
                  >
                    <td>
                      <div className={styles.serviceCell}>
                        <div className={styles.serviceIcon}>
                          {service.name
                            .toLowerCase()
                            .includes("redis") ? (
                            <Database size={16} />
                          ) : (
                            <Server size={16} />
                          )}
                        </div>

                        <div>
                          <strong>{service.name}</strong>

                          <span>
                            {service.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <StatusBadge
                        status={service.status}
                      />
                    </td>

                    <td>
                      <div className={styles.metricCell}>
                        <strong>
                          {service._count.hosts}
                        </strong>

                        <small>hosts</small>
                      </div>
                    </td>

                    <td>
                      <div className={styles.metricCell}>
                        <strong>
                          {service._count.containers}
                        </strong>

                        <small>containers</small>
                      </div>
                    </td>

                    <td>
                      <div className={styles.resourceCell}>
                        <span>
                          <small>LOGS</small>
                          <b>
                            {service._count.logs}
                          </b>
                        </span>

                        <span>
                          <small>TRACES</small>
                          <b>
                            {service._count.traces}
                          </b>
                        </span>

                        <span>
                          <small>METRICS</small>
                          <b>
                            {service._count.metrics}
                          </b>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          service._count.incidents > 0
                            ? styles.badMetric
                            : styles.goodMetric
                        }
                      >
                        {service._count.incidents}
                      </span>
                    </td>

                    <td>
                      <div className={styles.versionCell}>
                        <strong>
                          {service.version ?? "—"}
                        </strong>

                        <small>
                          {formatRelativeTime(
                            service.updatedAt,
                          )}
                        </small>
                      </div>
                    </td>

                    <td>
                      <button
                        className={styles.moreButton}
                        onClick={(event) => {
                          event.stopPropagation();

                          setSelectedService(
                            service.id,
                          );
                        }}
                        aria-label={`Open ${service.name}`}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && !loading && services.length === 0 && (
          <div className={styles.emptyState}>
            <Search size={24} />

            <strong>No services found</strong>

            <span>
              Try changing your search, environment or
              status filter.
            </span>
          </div>
        )}

        <div className={styles.tableFooter}>
          <span>
            Showing <strong>{services.length}</strong> of{" "}
            <strong>{pagination?.total ?? 0}</strong>{" "}
            services
          </span>

          <div className={styles.pagination}>
            <button
              disabled={
                !pagination ||
                !pagination.hasPreviousPage
              }
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
            >
              Previous
            </button>

            <button className={styles.pageNumber}>
              {pagination?.page ?? 1}
            </button>

            <button
              disabled={
                !pagination ||
                !pagination.hasNextPage
              }
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selected && (
        <aside className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <div className={styles.detailTitle}>
              <div className={styles.serviceIcon}>
                <Server size={17} />
              </div>

              <div>
                <strong>{selected.name}</strong>

                <span>{selected.slug}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedService(null)}
              aria-label="Close service details"
            >
              ×
            </button>
          </div>

          <StatusBadge status={selected.status} />

          <div className={styles.detailStats}>
            <div>
              <span>Environment</span>
              <strong>
                {selected.environment?.name ?? "—"}
              </strong>
            </div>

            <div>
              <span>Hosts</span>
              <strong>
                {selected._count.hosts}
              </strong>
            </div>

            <div>
              <span>Containers</span>
              <strong>
                {selected._count.containers}
              </strong>
            </div>

            <div>
              <span>Incidents</span>
              <strong>
                {selected._count.incidents}
              </strong>
            </div>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <Wifi size={14} />
              Observability coverage
            </div>

            <div className={styles.miniChart}>
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          </div>

          {selected.description && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>
                <Activity size={14} />
                Description
              </div>

              <p>{selected.description}</p>
            </div>
          )}

          <button className={styles.openService}>
            Open service details
            <ExternalLink size={14} />
          </button>
        </aside>
      )}
    </main>
  );
}