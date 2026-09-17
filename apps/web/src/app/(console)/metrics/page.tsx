"use client";

import {
  Activity,
  Clock3,
  Database,
  Gauge,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MetricRecord = {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  labels: unknown;
  service: {
    id: string;
    name: string;
    slug: string;
    status: "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
    version: string | null;
  };
};

type MetricsResponse = {
  success: boolean;
  data: MetricRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  requestId: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function formatMetricValue(name: string, value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  switch (name) {
    case "request_rate":
    case "requests_per_second":
      return `${value.toFixed(0)} req/s`;

    case "error_rate":
      return `${value.toFixed(2)}%`;

    case "latency_p95":
    case "p95_latency":
      return `${value.toFixed(0)} ms`;

    case "cpu_usage":
    case "memory_usage":
      return `${value.toFixed(1)}%`;

    default:
      return value.toFixed(2);
  }
}

function getLatestMetric(
  metrics: MetricRecord[],
  serviceId: string,
  names: string[],
) {
  return (
    metrics.find(
      (metric) =>
        metric.service.id === serviceId &&
        names.includes(metric.name),
    ) ?? null
  );
}

function statusLabel(
  status: MetricRecord["service"]["status"],
) {
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

function statusColor(
  status: MetricRecord["service"]["status"],
) {
  switch (status) {
    case "CRITICAL":
      return "#ef4444";
    case "DEGRADED":
      return "#f59e0b";
    case "HEALTHY":
      return "#22c55e";
    default:
      return "var(--muted)";
  }
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchMetrics = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_URL}/api/v1/metrics?limit=500`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Metrics request failed with status ${response.status}`,
          );
        }

        const result = (await response.json()) as MetricsResponse;

        if (!result.success) {
          throw new Error("Unable to load metrics.");
        }

        setMetrics(result.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load metrics.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const services = useMemo(() => {
    const serviceMap = new Map<
      string,
      MetricRecord["service"]
    >();

    for (const metric of metrics) {
      serviceMap.set(metric.service.id, metric.service);
    }

    return Array.from(serviceMap.values());
  }, [metrics]);

  const latestMetrics = useMemo(() => {
    const findMetric = (names: string[]) => {
      const candidates = metrics.filter((metric) =>
        names.includes(metric.name),
      );

      if (candidates.length === 0) {
        return null;
      }

      return candidates.reduce((latest, current) =>
        new Date(current.timestamp).getTime() >
        new Date(latest.timestamp).getTime()
          ? current
          : latest,
      );
    };

    return {
      requestRate: findMetric([
        "request_rate",
        "requests_per_second",
      ]),
      errorRate: findMetric(["error_rate"]),
      p95Latency: findMetric([
        "latency_p95",
        "p95_latency",
      ]),
      cpuUsage: findMetric(["cpu_usage"]),
    };
  }, [metrics]);

  const lastUpdated = useMemo(() => {
    if (metrics.length === 0) {
      return null;
    }

    return metrics.reduce((latest, current) =>
      new Date(current.timestamp).getTime() >
      new Date(latest.timestamp).getTime()
        ? current
        : latest,
    ).timestamp;
  }, [metrics]);

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        margin: 0,
        padding: "28px 32px 40px",
        boxSizing: "border-box",
      }}
    >
      {/* PAGE HEADER */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div>
          <p className="eyebrow">OBSERVE / METRICS</p>

          <h1
            style={{
              margin: "6px 0 8px",
              fontSize: 30,
              lineHeight: 1.1,
            }}
          >
            Metrics
          </h1>

          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Monitor application performance, traffic, latency and
            resource utilization across your monitored services.
          </p>

          {lastUpdated && (
            <p
              style={{
                margin: "8px 0 0",
                color: "var(--muted)",
                fontSize: 11,
              }}
            >
              Last telemetry update{" "}
              {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button type="button">Last 1 hour ▾</button>

          <button
            type="button"
            onClick={() => void fetchMetrics(true)}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              opacity: refreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing
                  ? "spin 1s linear infinite"
                  : undefined,
              }}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <div className="avatar">DC</div>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <section
          className="panel"
          style={{
            marginBottom: 12,
            padding: 16,
            borderColor: "#ef4444",
          }}
        >
          <strong>Unable to load metrics</strong>

          <p
            style={{
              margin: "6px 0 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() => void fetchMetrics(true)}
            style={{ marginTop: 12 }}
          >
            Try again
          </button>
        </section>
      )}

      {/* KPI CARDS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {[
          {
            name: "Request Rate",
            metric: latestMetrics.requestRate,
            icon: Activity,
            formatter: (value: number | null) =>
              formatMetricValue("request_rate", value),
          },
          {
            name: "Error Rate",
            metric: latestMetrics.errorRate,
            icon: Gauge,
            formatter: (value: number | null) =>
              formatMetricValue("error_rate", value),
          },
          {
            name: "P95 Latency",
            metric: latestMetrics.p95Latency,
            icon: Clock3,
            formatter: (value: number | null) =>
              formatMetricValue("latency_p95", value),
          },
          {
            name: "Host CPU",
            metric: latestMetrics.cpuUsage,
            icon: Database,
            formatter: (value: number | null) =>
              formatMetricValue("cpu_usage", value),
          },
        ].map(
          ({
            name,
            metric,
            icon: Icon,
            formatter,
          }) => (
            <article
              key={name}
              className="metric-card"
              style={{
                minHeight: 132,
              }}
            >
              <div className="icon info">
                <Icon size={19} />
              </div>

              <div>
                <p>{name}</p>

                <strong>
                  {loading
                    ? "Loading..."
                    : formatter(metric?.value ?? null)}
                </strong>

                <small
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {metric ? (
                    <>
                      <TrendingUp size={11} />
                      Live telemetry
                    </>
                  ) : (
                    "No telemetry available"
                  )}
                </small>
              </div>
            </article>
          ),
        )}
      </section>

      {/* TELEMETRY STATUS */}
      <section
        className="panel"
        style={{
          marginBottom: 12,
          padding: 16,
        }}
      >
        <div className="panel-head">
          <div>
            <h2>Telemetry Status</h2>

            <span>
              Current metrics available from the telemetry pipeline
            </span>
          </div>

          <span
            style={{
              fontSize: 12,
              color: "var(--blue)",
            }}
          >
            ● Live database telemetry
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {[
            ["CPU", "cpu_usage"],
            ["Memory", "memory_usage"],
            ["Requests", "request_rate"],
            ["Errors", "error_rate"],
          ].map(([label, metricName]) => {
            const count = metrics.filter(
              (metric) => metric.name === metricName,
            ).length;

            return (
              <div
                key={metricName}
                style={{
                  padding: 14,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                  }}
                >
                  {label}
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                    fontSize: 20,
                  }}
                >
                  {count}
                </strong>

                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                  }}
                >
                  records loaded
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* SERVICE METRICS */}
      <section
        className="panel"
        style={{
          padding: 16,
        }}
      >
        <div className="panel-head">
          <div>
            <h2>Service Metrics</h2>

            <span>
              Live telemetry across monitored services
            </span>
          </div>

          <a href="/services">View all services</a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1.5fr .8fr 1fr 1fr 1fr",
            gap: 16,
            padding: "14px 10px",
            borderBottom:
              "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          <span>Service</span>
          <span>Status</span>
          <span>CPU</span>
          <span>Memory</span>
          <span>Last Update</span>
        </div>

        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Loading telemetry...
          </div>
        ) : services.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            No telemetry records available.
          </div>
        ) : (
          services.map((service) => {
            const cpu = getLatestMetric(
              metrics,
              service.id,
              ["cpu_usage"],
            );

            const memory = getLatestMetric(
              metrics,
              service.id,
              ["memory_usage"],
            );

            const latest = [cpu, memory]
              .filter(Boolean)
              .reduce<MetricRecord | null>(
                (latestMetric, currentMetric) => {
                  if (!currentMetric) {
                    return latestMetric;
                  }

                  if (!latestMetric) {
                    return currentMetric;
                  }

                  return new Date(
                    currentMetric.timestamp,
                  ).getTime() >
                    new Date(
                      latestMetric.timestamp,
                    ).getTime()
                    ? currentMetric
                    : latestMetric;
                },
                null,
              );

            return (
              <div
                key={service.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1.5fr .8fr 1fr 1fr 1fr",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 10px",
                  borderBottom:
                    "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>{service.name}</strong>

                  {service.version && (
                    <small
                      style={{
                        display: "block",
                        color: "var(--muted)",
                        marginTop: 3,
                      }}
                    >
                      v{service.version}
                    </small>
                  )}
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <i
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      display: "inline-block",
                      background: statusColor(
                        service.status,
                      ),
                    }}
                  />

                  {statusLabel(service.status)}
                </span>

                <span>
                  {formatMetricValue(
                    "cpu_usage",
                    cpu?.value ?? null,
                  )}
                </span>

                <span>
                  {formatMetricValue(
                    "memory_usage",
                    memory?.value ?? null,
                  )}
                </span>

                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  {latest
                    ? new Date(
                        latest.timestamp,
                      ).toLocaleTimeString()
                    : "—"}
                </span>
              </div>
            );
          })
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 10px 2px",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          <span>
            Showing {services.length} services
          </span>

          <a href="/services">
            Open service inventory →
          </a>
        </div>
      </section>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          section[style*="repeat(4"] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          main {
            padding: 20px 16px 32px !important;
          }

          header {
            flex-direction: column;
          }

          section[style*="repeat(4"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}