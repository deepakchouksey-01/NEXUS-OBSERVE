"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./page.module.css";

type Status =
  | "Healthy"
  | "Degraded"
  | "Critical"
  | "Unknown";

type EnvironmentKind =
  | "PRODUCTION"
  | "STAGING"
  | "DEVELOPMENT";

type ServiceNode = {
  id: string;
  name: string;
  slug: string;
  status: Status;
  version: string | null;
  environment: {
    id: string;
    name: string;
    kind: EnvironmentKind;
  };
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latencyP95: number;
  icon: "server" | "payment" | "activity" | "shield" | "database";
};

type DependencyEdge = {
  id: string;
  source: string;
  target: string;
  sourceService: {
    id: string;
    name: string;
    slug: string;
  };
  targetService: {
    id: string;
    name: string;
    slug: string;
  };
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latencyP95: number;
};

type DependencyResponse = {
  success: boolean;
  data?: {
    services: ServiceNode[];
    dependencies: DependencyEdge[];
    summary: {
      services: number;
      dependencies: number;
      healthy: number;
      degraded: number;
      critical: number;
      impactedPaths: number;
    };
    window: {
      from: string;
      to: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  requestId?: string;
  timestamp?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const statusColor: Record<Status, string> = {
  Healthy: "#22c55e",
  Degraded: "#f59e0b",
  Critical: "#ef4444",
  Unknown: "#94a3b8",
};

function normalizeStatus(status: string): Status {
  switch (status.toUpperCase()) {
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

function getServiceIcon(
  service: {
    name: string;
    slug: string;
  },
): ServiceNode["icon"] {
  const value =
    `${service.name} ${service.slug}`.toLowerCase();

  if (
    value.includes("payment") ||
    value.includes("billing") ||
    value.includes("checkout")
  ) {
    return "payment";
  }

  if (
    value.includes("auth") ||
    value.includes("identity")
  ) {
    return "shield";
  }

  if (
    value.includes("redis") ||
    value.includes("postgres") ||
    value.includes("database") ||
    value.includes("cache")
  ) {
    return "database";
  }

  if (
    value.includes("gateway") ||
    value.includes("api")
  ) {
    return "server";
  }

  return "activity";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRate(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }

  return `${Math.round(value)}`;
}

function formatLatency(value: number): string {
  return `${Math.round(value)} ms`;
}

function formatEnvironment(
  environment: EnvironmentKind,
): string {
  return (
    environment.charAt(0) +
    environment.slice(1).toLowerCase()
  );
}

function NodeIcon({
  type,
}: {
  type: ServiceNode["icon"];
}) {
  if (type === "payment") {
    return <Zap size={18} />;
  }

  if (type === "activity") {
    return <Activity size={18} />;
  }

  if (type === "shield") {
    return <ShieldCheck size={18} />;
  }

  if (type === "database") {
    return <Database size={18} />;
  }

  return <Server size={18} />;
}

function getGraphPosition(index: number, total: number) {
  const layouts = [
    { x: 50, y: 16 },
    { x: 20, y: 43 },
    { x: 50, y: 43 },
    { x: 80, y: 43 },
    { x: 30, y: 72 },
    { x: 70, y: 72 },
    { x: 50, y: 90 },
  ];

  if (total <= layouts.length) {
    return layouts[index] ?? layouts[0];
  }

  if (index === 0) {
    return layouts[0];
  }

  const angle =
    ((index - 1) / Math.max(total - 2, 1)) *
      Math.PI *
      2 -
    Math.PI / 2;

  return {
    x: 50 + Math.cos(angle) * 30,
    y: 50 + Math.sin(angle) * 29,
  };
}

export default function ServiceMapPage() {
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] =
    useState<EnvironmentKind>("PRODUCTION");

  const [view, setView] =
    useState("All services");

  const [dependencyType, setDependencyType] =
    useState("Dependencies");

  const [services, setServices] =
    useState<ServiceNode[]>([]);

  const [dependencies, setDependencies] =
    useState<DependencyEdge[]>([]);

  const [summary, setSummary] = useState({
    services: 0,
    dependencies: 0,
    healthy: 0,
    degraded: 0,
    critical: 0,
    impactedPaths: 0,
  });

  const [selectedService, setSelectedService] =
    useState<ServiceNode | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadDependencies = useCallback(
    async (
      showRefreshState = false,
    ) => {
      if (showRefreshState) {
        setRefreshing(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({
          environment,
        });

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        const response = await fetch(
          `${API_URL}/api/v1/dependencies?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as DependencyResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.error?.message ??
              "Unable to load service dependencies.",
          );
        }

        const normalizedServices =
          (result.data?.services ?? []).map(
            (service) => ({
              ...service,
              status: normalizeStatus(
                service.status,
              ),
              icon: getServiceIcon(service),
            }),
          );

        setServices(normalizedServices);
        setDependencies(
          result.data?.dependencies ?? [],
        );

        setSummary(
          result.data?.summary ?? {
            services: normalizedServices.length,
            dependencies:
              result.data?.dependencies.length ?? 0,
            healthy: normalizedServices.filter(
              (item) =>
                item.status === "Healthy",
            ).length,
            degraded: normalizedServices.filter(
              (item) =>
                item.status === "Degraded",
            ).length,
            critical: normalizedServices.filter(
              (item) =>
                item.status === "Critical",
            ).length,
            impactedPaths: 0,
          },
        );

        setSelectedService((current) => {
          if (!current) {
            return null;
          }

          return (
            normalizedServices.find(
              (service) =>
                service.id === current.id,
            ) ?? null
          );
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load service dependencies.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [environment, search],
  );

useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadDependencies();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [loadDependencies]);

  const filteredServices = useMemo(() => {
    if (view === "All services") {
      return services;
    }

    return services.filter(
      (service) =>
        service.status === view,
    );
  }, [services, view]);

  const visibleServiceIds = useMemo(
    () =>
      new Set(
        filteredServices.map(
          (service) => service.id,
        ),
      ),
    [filteredServices],
  );

  const visibleDependencies =
    useMemo(
      () =>
        dependencies.filter(
          (dependency) =>
            visibleServiceIds.has(
              dependency.source,
            ) &&
            visibleServiceIds.has(
              dependency.target,
            ),
        ),
      [dependencies, visibleServiceIds],
    );

  const graphServices = useMemo(
    () =>
      filteredServices.slice(0, 7),
    [filteredServices],
  );

  const graphDependencies =
    useMemo(
      () =>
        visibleDependencies.filter(
          (dependency) =>
            graphServices.some(
              (service) =>
                service.id ===
                dependency.source,
            ) &&
            graphServices.some(
              (service) =>
                service.id ===
                dependency.target,
            ),
        ),
      [visibleDependencies, graphServices],
    );

  const dependencyStatus = (
    dependency: DependencyEdge,
  ): Status => {
    if (dependency.errorRate > 5) {
      return "Critical";
    }

    if (
      dependency.errorRate > 1 ||
      dependency.latencyP95 > 500
    ) {
      return "Degraded";
    }

    return "Healthy";
  };

  const refresh = () => {
    void loadDependencies(true);
  };

  const handleEnvironmentChange = (
    value: string,
  ) => {
    setEnvironment(
      value as EnvironmentKind,
    );
    setView("All services");
  };

  return (
    <main className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            UNDERSTAND{" "}
            <span>/</span> SERVICE MAP
          </div>

          <h1>Service Map</h1>

          <p>
            Visualize service dependencies,
            traffic flow and production health
            across your environment.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            type="button"
          >
            <Clock3 size={14} />
            Last 1 hour
          </button>

          <button
            className={styles.secondaryButton}
            onClick={refresh}
            type="button"
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? styles.spin
                  : ""
              }
            />
            Refresh
          </button>

          <div className={styles.avatar}>
            DC
          </div>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <section className={styles.panel}>
          <div
            className={styles.criticalInsight}
          >
            <div
              className={styles.insightIcon}
            >
              <AlertTriangle size={17} />
            </div>

            <div>
              <strong>
                Unable to load dependency
                topology
              </strong>

              <p>{error}</p>
            </div>
          </div>
        </section>
      )}

      {/* SUMMARY */}
      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.info}`}
          >
            <Network size={18} />
          </div>

          <div>
            <span>Services</span>

            <strong>
              {loading
                ? "—"
                : summary.services}
            </strong>

            <small>
              {summary.healthy} healthy •{" "}
              {summary.degraded} degraded •{" "}
              {summary.critical} critical
            </small>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.success}`}
          >
            <GitBranch size={18} />
          </div>

          <div>
            <span>Dependencies</span>

            <strong>
              {loading
                ? "—"
                : summary.dependencies}
            </strong>

            <small>
              {visibleDependencies.length} visible
              relationships
            </small>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.critical}`}
          >
            <AlertTriangle size={18} />
          </div>

          <div>
            <span>Impacted Paths</span>

            <strong>
              {loading
                ? "—"
                : summary.impactedPaths}
            </strong>

            <small>
              Elevated latency or error
              rate
            </small>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div
            className={`${styles.metricIcon} ${styles.ai}`}
          >
            <Activity size={18} />
          </div>

          <div>
            <span>Traffic Flow</span>

            <strong>
              {loading
                ? "—"
                : `${Math.max(
                    0,
                    100 -
                      (services.reduce(
                        (
                          total,
                          service,
                        ) =>
                          total +
                          service.errorRate,
                        0,
                      ) /
                        Math.max(
                          1,
                          services.length,
                        )),
                  ).toFixed(1)}%`}
            </strong>

            <small>
              Based on observed service
              error rates
            </small>
          </div>
        </article>
      </section>

      {/* CONTROLS */}
      <section className={styles.controlsPanel}>
        <div className={styles.controlRow}>
          <div className={styles.searchBox}>
            <Search size={16} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search services..."
            />

            {search && (
              <button
                type="button"
                className={
                  styles.clearButton
                }
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label
            className={
              styles.selectControl
            }
          >
            <span>Environment</span>

            <select
              value={environment}
              onChange={(event) =>
                handleEnvironmentChange(
                  event.target.value,
                )
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
          </label>

          <label
            className={
              styles.selectControl
            }
          >
            <span>Services</span>

            <select
              value={view}
              onChange={(event) =>
                setView(
                  event.target.value,
                )
              }
            >
              <option>
                All services
              </option>

              <option>
                Healthy
              </option>

              <option>
                Degraded
              </option>

              <option>
                Critical
              </option>
            </select>
          </label>

          <label
            className={
              styles.selectControl
            }
          >
            <span>View</span>

            <select
              value={dependencyType}
              onChange={(event) =>
                setDependencyType(
                  event.target.value,
                )
              }
            >
              <option>
                Dependencies
              </option>

              <option>
                Services only
              </option>

              <option>
                Infrastructure
              </option>
            </select>
          </label>
        </div>

        <div className={styles.legend}>
          <span>
            <i
              className={
                styles.healthyDot
              }
            />
            Healthy
          </span>

          <span>
            <i
              className={
                styles.degradedDot
              }
            />
            Degraded
          </span>

          <span>
            <i
              className={
                styles.criticalDot
              }
            />
            Critical
          </span>

          <span
            className={
              styles.environmentStatus
            }
          >
            <span>
              {formatEnvironment(
                environment,
              )}
            </span>

            <b>•</b>

            {filteredServices.length}{" "}
            visible services
          </span>
        </div>
      </section>

      {/* SERVICE GRAPH */}
      <section className={styles.graphPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>
              {formatEnvironment(environment)} Dependency Graph
            </h2>

            <span>
              Live service-to-service communication and dependency topology
            </span>
          </div>

          <div className={styles.liveIndicator}>
            <i />
            Live
          </div>
        </div>

        <div className={styles.graph}>
          {loading ? (
            <div className={styles.noResults}>
              <RefreshCw size={22} className={styles.spin} />
              <strong>Loading topology</strong>
              <span>Fetching live service dependencies...</span>
            </div>
          ) : graphServices.length === 0 ? (
            <div className={styles.noResults}>
              <Search size={22} />
              <strong>No services found</strong>
              <span>
                Try changing your search or environment filter.
              </span>
            </div>
          ) : (
            <>
              <svg
                className={styles.connectionLayer}
                viewBox="0 0 1000 560"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="dependency-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M 0 0 L 10 5 L 0 10 z"
                      fill="rgba(100, 116, 139, 0.75)"
                    />
                  </marker>
                </defs>

                {graphDependencies.map((dependency) => {
                  const sourceIndex = graphServices.findIndex(
                    (service) => service.id === dependency.source,
                  );

                  const targetIndex = graphServices.findIndex(
                    (service) => service.id === dependency.target,
                  );

                  if (sourceIndex < 0 || targetIndex < 0) {
                    return null;
                  }

                  const source = getGraphPosition(
                    sourceIndex,
                    graphServices.length,
                  );

                  const target = getGraphPosition(
                    targetIndex,
                    graphServices.length,
                  );

                  const sourceX = source.x * 10;
                  const sourceY = source.y * 5.6;
                  const targetX = target.x * 10;
                  const targetY = target.y * 5.6;
                  const midX = (sourceX + targetX) / 2;

                  return (
                    <path
                      key={dependency.id}
                      d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                      className={styles.connectionPath}
                      markerEnd="url(#dependency-arrow)"
                    />
                  );
                })}
              </svg>

              {graphServices.map((service, index) => {
                const position = getGraphPosition(
                  index,
                  graphServices.length,
                );

                return (
                  <GraphNode
                    key={service.id}
                    service={service}
                    className={styles.dynamicGraphNode}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    }}
                    onClick={() => setSelectedService(service)}
                  />
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* DEPENDENCY HEALTH */}
      <section
        className={styles.panel}
      >
        <div className={styles.panelHeader}>
          <div>
            <h2>
              Dependency Health
            </h2>

            <span>
              Current{" "}
              {formatEnvironment(
                environment,
              ).toLowerCase()}{" "}
              dependency state
            </span>
          </div>

          <Link
            href="/dependencies"
            className={
              styles.viewAll
            }
          >
            View all
          </Link>
        </div>

        <div
          className={
            styles.dependencyTable
          }
        >
          <div
            className={
              styles.tableHeader
            }
          >
            <span>
              Dependency
            </span>

            <span>Target</span>

            <span>Status</span>

            <span>Latency</span>

            <span>Traffic</span>
          </div>

          {visibleDependencies
            .slice(0, 8)
            .map((dependency) => {
              const status =
                dependencyStatus(
                  dependency,
                );

              return (
                <button
                  type="button"
                  key={
                    dependency.id
                  }
                  className={
                    styles.tableRow
                  }
                  onClick={() => {
                    const service =
                      services.find(
                        (item) =>
                          item.id ===
                          dependency.source,
                      );

                    if (service) {
                      setSelectedService(
                        service,
                      );
                    }
                  }}
                >
                  <span
                    className={
                      styles.dependencyName
                    }
                  >
                    <span
                      className={
                        styles.tableIcon
                      }
                    >
                      <NodeIcon
                        type={
                          getServiceIcon(
                            dependency.sourceService,
                          )
                        }
                      />
                    </span>

                    <strong>
                      {
                        dependency
                          .sourceService
                          .name
                      }
                    </strong>
                  </span>

                  <span
                    className={
                      styles.muted
                    }
                  >
                    {
                      dependency
                        .targetService
                        .name
                    }
                  </span>

                  <span
                    className={
                      styles.status
                    }
                    style={{
                      color:
                        statusColor[
                          status
                        ],
                    }}
                  >
                    {status ===
                    "Healthy" ? (
                      <CheckCircle2
                        size={14}
                      />
                    ) : status ===
                      "Degraded" ? (
                      <Clock3
                        size={14}
                      />
                    ) : (
                      <AlertTriangle
                        size={14}
                      />
                    )}

                    {status}
                  </span>

                  <span>
                    {formatLatency(
                      dependency.latencyP95,
                    )}
                  </span>

                  <span>
                    {formatRate(
                      dependency.requestCount,
                    )}{" "}
                    req
                  </span>
                </button>
              );
            })}

          {!loading &&
            visibleDependencies.length ===
              0 && (
              <div
                className={
                  styles.noResults
                }
              >
                <GitBranch
                  size={22}
                />

                <strong>
                  No dependencies detected
                </strong>

                <span>
                  No cross-service span
                  relationships were observed
                  in this environment and time
                  window.
                </span>
              </div>
            )}
        </div>
      </section>

      {/* INSIGHTS */}
      <section
        className={styles.panel}
      >
        <div className={styles.panelHeader}>
          <div>
            <h2>
              Map Insights
            </h2>

            <span>
              Signals detected across the
              live topology
            </span>
          </div>

          <Activity size={18} />
        </div>

        <div
          className={styles.insights}
        >
          {summary.critical > 0 && (
            <div
              className={
                styles.criticalInsight
              }
            >
              <div
                className={
                  styles.insightIcon
                }
              >
                <AlertTriangle
                  size={17}
                />
              </div>

              <div>
                <strong>
                  Critical service detected
                </strong>

                <p>
                  {summary.critical} service
                  {summary.critical ===
                  1
                    ? ""
                    : "s"}{" "}
                  currently report
                  critical health in the
                  selected environment.
                </p>
              </div>
            </div>
          )}

          {summary.degraded > 0 && (
            <div
              className={
                styles.warningInsight
              }
            >
              <div
                className={
                  styles.insightIcon
                }
              >
                <Clock3 size={17} />
              </div>

              <div>
                <strong>
                  Degraded services detected
                </strong>

                <p>
                  {summary.degraded} service
                  {summary.degraded ===
                  1
                    ? ""
                    : "s"}{" "}
                  show degraded health based
                  on current telemetry.
                </p>
              </div>
            </div>
          )}

          {summary.critical === 0 &&
            summary.degraded === 0 && (
              <div
                className={
                  styles.warningInsight
                }
              >
                <div
                  className={
                    styles.insightIcon
                  }
                >
                  <CheckCircle2
                    size={17}
                  />
                </div>

                <div>
                  <strong>
                    Topology is healthy
                  </strong>

                  <p>
                    No critical or degraded
                    services were detected in
                    the selected environment.
                  </p>
                </div>
              </div>
            )}
        </div>
      </section>

      {/* DETAIL DRAWER */}
      {selectedService && (
        <aside
          className={
            styles.detailPanel
          }
        >
          <div
            className={
              styles.detailHeader
            }
          >
            <div
              className={
                styles.detailTitle
              }
            >
              <div
                className={
                  styles.detailIcon
                }
                style={{
                  color:
                    statusColor[
                      selectedService
                        .status
                    ],
                }}
              >
                <NodeIcon
                  type={
                    selectedService.icon
                  }
                />
              </div>

              <div>
                <strong>
                  {
                    selectedService.name
                  }
                </strong>

                <span>
                  {
                    selectedService.slug
                  }
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedService(
                  null,
                )
              }
              aria-label="Close service details"
            >
              <X size={17} />
            </button>
          </div>

          <div
            className={
              styles.detailStatus
            }
            style={{
              color:
                statusColor[
                  selectedService
                    .status
                ],
            }}
          >
            <i
              style={{
                background:
                  statusColor[
                    selectedService
                      .status
                  ],
              }}
            />

            {selectedService.status}
          </div>

          <div
            className={
              styles.detailStats
            }
          >
            <div>
              <span>
                Observed spans
              </span>

              <strong>
                {formatNumber(
                  selectedService.requestCount,
                )}
              </strong>
            </div>

            <div>
              <span>
                P95 latency
              </span>

              <strong>
                {formatLatency(
                  selectedService.latencyP95,
                )}
              </strong>
            </div>

            <div>
              <span>
                Error rate
              </span>

              <strong>
                {
                  selectedService.errorRate
                }
                %
              </strong>
            </div>

            <div>
              <span>
                Environment
              </span>

              <strong>
                {formatEnvironment(
                  selectedService
                    .environment.kind,
                )}
              </strong>
            </div>
          </div>

          <div
            className={
              styles.telemetry
            }
          >
            <div
              className={
                styles.telemetryHeader
              }
            >
              <span>
                <Activity size={14} />
                Service telemetry
              </span>

              <small>
                Last 60 min
              </small>
            </div>

            <div
              className={
                styles.miniChart
              }
            >
              {[
                35, 48, 42, 62, 55,
                78, 68, 88, 72, 94,
                81, 90,
              ].map(
                (height, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${height}%`,
                    }}
                  />
                ),
              )}
            </div>
          </div>

          <Link
            href="/services"
            className={
              styles.openService
            }
          >
            Open service details

            <span>→</span>
          </Link>
        </aside>
      )}
    </main>
  );
}

function GraphNode({
  service,
  className,
  style,
  onClick,
}: {
  service: ServiceNode;
  className: string;
  style?: CSSProperties;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.graphNode} ${className} ${
        service.status ===
        "Critical"
          ? styles.criticalNode
          : service.status ===
              "Degraded"
            ? styles.degradedNode
            : ""
      }`}
      style={style}
      onClick={onClick}
    >
      <div
        className={
          styles.nodeTop
        }
      >
        <div
          className={
            styles.nodeIcon
          }
          style={{
            color:
              statusColor[
                service.status
              ],
            background: `${
              statusColor[
                service.status
              ]
            }14`,
          }}
        >
          <NodeIcon
            type={service.icon}
          />
        </div>

        <div
          className={
            styles.nodeInfo
          }
        >
          <strong>
            {service.name}
          </strong>

          <span>
            {service.slug}
          </span>
        </div>
      </div>

      <div
        className={
          styles.nodeBottom
        }
      >
        <span
          style={{
            color:
              statusColor[
                service.status
              ],
          }}
        >
          <i
            style={{
              background:
                statusColor[
                  service.status
                ],
            }}
          />

          {service.status}
        </span>

        <small>
          {formatLatency(
            service.latencyP95,
          )}
        </small>
      </div>
    </button>
  );
}