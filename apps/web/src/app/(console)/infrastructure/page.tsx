"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Environment =
  | "PRODUCTION"
  | "STAGING"
  | "DEVELOPMENT";

type Status =
  | "HEALTHY"
  | "DEGRADED"
  | "CRITICAL"
  | "OFFLINE"
  | "UNKNOWN";

type HostService = {
  service: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
};

type Host = {
  id: string;
  name: string;
  hostname: string | null;
  ipAddress: string | null;
  region: string | null;
  status: Status;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  networkMbps: number | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  environment: {
    id: string;
    name: string;
    kind: Environment;
  } | null;
  services: HostService[];
  containers: {
    id: string;
    name: string;
    image: string | null;
    imageTag: string | null;
    status: string;
    cpuUsage: number | null;
    memoryUsage: number | null;
    restartCount: number;
    lastSeenAt: string | null;
  }[];
};

type HostsResponse = {
  success: boolean;
  data: Host[];
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

const ENVIRONMENTS: Environment[] = [
  "PRODUCTION",
  "STAGING",
  "DEVELOPMENT",
];

const STATUS_OPTIONS: Array<"ALL" | Status> = [
  "ALL",
  "HEALTHY",
  "DEGRADED",
  "CRITICAL",
  "OFFLINE",
  "UNKNOWN",
];

function formatStatus(status: Status) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatEnvironment(environment: Environment) {
  return (
    environment.charAt(0) +
    environment.slice(1).toLowerCase()
  );
}

function formatPercentage(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatNetwork(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(1)} Mbps`;
}

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const minutes = Math.floor(diffSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

function getAverage(
  hosts: Host[],
  selector: (host: Host) => number | null,
) {
  const values = hosts
    .map(selector)
    .filter(
      (value): value is number =>
        value !== null &&
        Number.isFinite(value),
    );

  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function StatusBadge({
  status,
}: {
  status: Status;
}) {
  const Icon =
    status === "HEALTHY"
      ? CheckCircle2
      : status === "DEGRADED"
        ? AlertTriangle
        : status === "CRITICAL"
          ? Activity
          : AlertTriangle;

  return (
    <span
      className={`${styles.statusBadge} ${
        styles[status.toLowerCase()]
      }`}
    >
      <Icon size={13} />
      {formatStatus(status)}
    </span>
  );
}

function UsageBar({
  value,
  danger = false,
}: {
  value: number | null;
  danger?: boolean;
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className={styles.unavailable}>
        —
      </span>
    );
  }

  const safeValue = Math.min(
    100,
    Math.max(0, value),
  );

  return (
    <div className={styles.usage}>
      <div className={styles.usageTrack}>
        <i
          className={danger ? styles.dangerBar : ""}
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>

      <strong>
        {safeValue.toFixed(1)}%
      </strong>
    </div>
  );
}

export default function InfrastructurePage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [environment, setEnvironment] =
    useState<Environment>("PRODUCTION");
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<"ALL" | Status>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const fetchHosts = useCallback(
    async (
      showRefreshState = false,
    ) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "100",
          environment,
        });

        if (status !== "ALL") {
          params.set("status", status);
        }

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        const response = await fetch(
          `${API_URL}/api/v1/hosts?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        const payload =
          (await response.json()) as HostsResponse;

        if (!response.ok || !payload.success) {
          throw new Error(
            "Unable to load infrastructure hosts.",
          );
        }

        setHosts(payload.data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load infrastructure data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [environment, search, status],
  );

  useEffect(() => {
    void fetchHosts();
  }, [fetchHosts]);

  const healthy = hosts.filter(
    (host) => host.status === "HEALTHY",
  ).length;

  const degraded = hosts.filter(
    (host) => host.status === "DEGRADED",
  ).length;

  const critical = hosts.filter(
    (host) => host.status === "CRITICAL",
  ).length;

  const offline = hosts.filter(
    (host) => host.status === "OFFLINE",
  ).length;

  const fleetCpu = useMemo(
    () => getAverage(hosts, (host) => host.cpuUsage),
    [hosts],
  );

  const fleetMemory = useMemo(
    () =>
      getAverage(
        hosts,
        (host) => host.memoryUsage,
      ),
    [hosts],
  );

  const fleetDisk = useMemo(
    () =>
      getAverage(
        hosts,
        (host) => host.diskUsage,
      ),
    [hosts],
  );

  const telemetryCoverage = useMemo(() => {
    if (hosts.length === 0) {
      return null;
    }

    const reportingHosts = hosts.filter(
      (host) => host.lastSeenAt,
    ).length;

    return (
      (reportingHosts / hosts.length) * 100
    );
  }, [hosts]);

  const totalContainers = hosts.reduce(
    (sum, host) =>
      sum + host.containers.length,
    0,
  );

  const totalServices = new Set(
    hosts.flatMap((host) =>
      host.services.map(
        ({ service }) => service.id,
      ),
    ),
  ).size;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            OBSERVE <span>/</span> INFRASTRUCTURE
          </div>

          <h1>Infrastructure</h1>

          <p>
            Monitor compute resources,
            infrastructure health and capacity
            across your monitored environment.
          </p>

          {!loading && !error && (
            <small>
              Live host telemetry •{" "}
              {hosts.length} nodes
            </small>
          )}
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={() => void fetchHosts(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing ? styles.spin : ""
              }
            />
            Refresh
          </button>

          <label
            className={
              styles.environmentButton
            }
          >
            <select
              value={environment}
              onChange={(event) =>
                setEnvironment(
                  event.target
                    .value as Environment,
                )
              }
              aria-label="Environment"
            >
              {ENVIRONMENTS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {formatEnvironment(item)}
                </option>
              ))}
            </select>

            <ChevronDown size={14} />
          </label>
        </div>
      </header>

      {error && (
        <section className={styles.errorState}>
          <AlertTriangle size={18} />

          <div>
            <strong>
              Infrastructure data unavailable
            </strong>

            <span>{error}</span>
          </div>

          <button
            onClick={() => void fetchHosts(true)}
          >
            Retry
          </button>
        </section>
      )}

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.blue}`}
          >
            <Server size={18} />
          </div>

          <div>
            <span>Total nodes</span>

            <strong>
              {loading ? "—" : hosts.length}
            </strong>

            <small>
              {formatEnvironment(environment)}
              {" "}infrastructure
            </small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.green}`}
          >
            <ShieldCheck size={18} />
          </div>

          <div>
            <span>Healthy</span>

            <strong>
              {loading ? "—" : healthy}
            </strong>

            <small>
              Operating normally
            </small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.amber}`}
          >
            <AlertTriangle size={18} />
          </div>

          <div>
            <span>Degraded</span>

            <strong>
              {loading ? "—" : degraded}
            </strong>

            <small>
              Needs attention
            </small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div
            className={`${styles.summaryIcon} ${styles.red}`}
          >
            <Activity size={18} />
          </div>

          <div>
            <span>Critical</span>

            <strong>
              {loading ? "—" : critical}
            </strong>

            <small>
              {offline > 0
                ? `${offline} offline`
                : "No critical hosts"}
            </small>
          </div>
        </article>
      </section>

      <section className={styles.capacityGrid}>
        <article className={styles.capacityCard}>
          <div className={styles.capacityTop}>
            <div
              className={`${styles.capacityIcon} ${styles.blue}`}
            >
              <Cpu size={17} />
            </div>

            <span>Fleet CPU</span>
          </div>

          <strong>
            {formatPercentage(fleetCpu)}
          </strong>

          <small>
            Average across reporting hosts
          </small>

          <div className={styles.capacityTrack}>
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    fleetCpu ?? 0,
                  ),
                )}%`,
              }}
            />
          </div>
        </article>

        <article className={styles.capacityCard}>
          <div className={styles.capacityTop}>
            <div
              className={`${styles.capacityIcon} ${styles.purple}`}
            >
              <MemoryStick size={17} />
            </div>

            <span>Fleet Memory</span>
          </div>

          <strong>
            {formatPercentage(fleetMemory)}
          </strong>

          <small>
            Average across reporting hosts
          </small>

          <div className={styles.capacityTrack}>
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    fleetMemory ?? 0,
                  ),
                )}%`,
              }}
            />
          </div>
        </article>

        <article className={styles.capacityCard}>
          <div className={styles.capacityTop}>
            <div
              className={`${styles.capacityIcon} ${styles.amber}`}
            >
              <HardDrive size={17} />
            </div>

            <span>Fleet Storage</span>
          </div>

          <strong>
            {formatPercentage(fleetDisk)}
          </strong>

          <small>
            Average disk utilization
          </small>

          <div className={styles.capacityTrack}>
            <i
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    fleetDisk ?? 0,
                  ),
                )}%`,
              }}
            />
          </div>
        </article>

        <article className={styles.capacityCard}>
          <div className={styles.capacityTop}>
            <div
              className={`${styles.capacityIcon} ${styles.green}`}
            >
              <Database size={17} />
            </div>

            <span>Telemetry Coverage</span>
          </div>

          <strong>
            {formatPercentage(
              telemetryCoverage,
            )}
          </strong>

          <small>
            Hosts reporting last-seen telemetry
          </small>

          <div className={styles.databaseHealth}>
            <span />
            {totalContainers} containers •{" "}
            {totalServices} services
          </div>
        </article>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Infrastructure nodes</h2>

            <span>
              Live compute and resource status
              across {formatEnvironment(environment)}
            </span>
          </div>

          <div className={styles.tableControls}>
            <div className={styles.searchBox}>
              <Search size={15} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search nodes..."
              />
            </div>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | "ALL"
                    | Status,
                )
              }
              aria-label="Host status"
            >
              {STATUS_OPTIONS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item === "ALL"
                    ? "All status"
                    : formatStatus(item)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.emptyState}>
              <RefreshCw
                size={24}
                className={styles.spin}
              />

              <strong>
                Loading infrastructure...
              </strong>

              <span>
                Fetching live host telemetry.
              </span>
            </div>
          ) : hosts.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={24} />

              <strong>
                No infrastructure nodes found
              </strong>

              <span>
                Try another environment, search
                term, or status filter.
              </span>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>NODE</th>
                  <th>STATUS</th>
                  <th>CPU</th>
                  <th>MEMORY</th>
                  <th>DISK</th>
                  <th>NETWORK</th>
                  <th>LAST SEEN</th>
                  <th>SERVICES</th>
                </tr>
              </thead>

              <tbody>
                {hosts.map((host) => (
                  <tr key={host.id}>
                    <td>
                      <div
                        className={
                          styles.nodeCell
                        }
                      >
                        <div
                          className={
                            styles.nodeIcon
                          }
                        >
                          <Server size={15} />
                        </div>

                        <div>
                          <strong>
                            {host.name}
                          </strong>

                          <small>
                            {host.hostname ??
                              host.ipAddress ??
                              host.region ??
                              "Unknown host"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <StatusBadge
                        status={host.status}
                      />
                    </td>

                    <td>
                      <UsageBar
                        value={host.cpuUsage}
                        danger={
                          (host.cpuUsage ??
                            0) >= 85
                        }
                      />
                    </td>

                    <td>
                      <UsageBar
                        value={
                          host.memoryUsage
                        }
                        danger={
                          (host.memoryUsage ??
                            0) >= 85
                        }
                      />
                    </td>

                    <td>
                      <UsageBar
                        value={host.diskUsage}
                        danger={
                          (host.diskUsage ??
                            0) >= 85
                        }
                      />
                    </td>

                    <td>
                      {formatNetwork(
                        host.networkMbps,
                      )}
                    </td>

                    <td className={styles.uptime}>
                      <strong>
                        {formatRelativeTime(
                          host.lastSeenAt,
                        )}
                      </strong>

                      <small>
                        {formatLastSeen(
                          host.lastSeenAt,
                        )}
                      </small>
                    </td>

                    <td>
                      <span
                        className={
                          styles.serviceCount
                        }
                      >
                        {host.services.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer
          className={styles.tableFooter}
        >
          <span>
            Showing{" "}
            <strong>{hosts.length}</strong>{" "}
            nodes
          </span>

          <span className={styles.live}>
            <i />
            Live database telemetry
          </span>
        </footer>
      </section>
    </main>
  );
}