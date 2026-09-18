"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  RefreshCw,
  Search,
  Server,
  X,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

type LogLevel =
  | "ERROR"
  | "WARN"
  | "INFO"
  | "DEBUG";

type Service = {
  id: string;
  name: string;
  slug: string;
  status: string;
  version: string | null;
};

type LogRecord = {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  traceId: string | null;
  spanId: string | null;
  requestId: string | null;
  metadata: unknown;
  service: Service;
};

type LogsResponse = {
  success: boolean;
  data: LogRecord[];
  summary: {
    totalLogs: number;
    errors: number;
    warnings: number;
    logSources: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  requestId?: string;
  error?: {
    code: string;
    message: string;
  };
};

type ServicesResponse = {
  success: boolean;
  data: Service[];
};

const levelConfig: Record<
  string,
  {
    icon: typeof XCircle;
    className: string;
  }
> = {
  ERROR: {
    icon: XCircle,
    className: "error",
  },
  WARN: {
    icon: AlertCircle,
    className: "warn",
  },
  INFO: {
    icon: CheckCircle2,
    className: "info",
  },
  DEBUG: {
    icon: Database,
    className: "info",
  },
};

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString(
    undefined,
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  );
}

function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "medium",
    },
  );
}

function getMetadataValue(
  metadata: unknown,
  key: string,
) {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const value = (
    metadata as Record<string, unknown>
  )[key];

  return typeof value === "string"
    ? value
    : null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [services, setServices] = useState<Service[]>(
    [],
  );

  const [summary, setSummary] = useState<
    LogsResponse["summary"]
  >({
    totalLogs: 0,
    errors: 0,
    warnings: 0,
    logSources: 0,
  });

  const [pagination, setPagination] =
    useState<LogsResponse["pagination"]>({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<
    "ALL" | LogLevel
  >("ALL");
  const [service, setService] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  const [selectedLog, setSelectedLog] =
    useState<LogRecord | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/services?limit=100`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        window.localStorage.removeItem(
          "nexus_user",
        );
        window.localStorage.removeItem(
          "nexus_organization",
        );
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        return;
      }

      const result =
        (await response.json()) as ServicesResponse;

      if (result.success) {
        setServices(result.data);
      }
    } catch {
      // Logs remain usable even if service discovery fails.
    }
  }, []);

  const fetchLogs = useCallback(
    async (
      targetPage = 1,
      showSpinner = true,
    ) => {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();

        params.set("page", String(targetPage));
        params.set("limit", "25");

        const from = new Date(
          Date.now() - 60 * 60 * 1000,
        );

        params.set("from", from.toISOString());
        params.set(
          "to",
          new Date().toISOString(),
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        if (level !== "ALL") {
          params.set("level", level);
        }

        if (service !== "ALL") {
          params.set("service", service);
        }

        const response = await fetch(
          `${API_URL}/api/v1/logs?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          window.localStorage.removeItem(
            "nexus_user",
          );
          window.localStorage.removeItem(
            "nexus_organization",
          );
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Logs API returned ${response.status}`,
          );
        }

        const result =
          (await response.json()) as LogsResponse;

        if (!result.success) {
          throw new Error(
            result.error?.message ??
              "Failed to load logs.",
          );
        }

        setLogs(result.data);
        setSummary(result.summary);
        setPagination(result.pagination);
        setLastUpdated(new Date());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load logs.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [level, search, service],
  );

useEffect(() => {
  const timer = window.setTimeout(() => {
    void fetchServices();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };
}, [fetchServices]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchLogs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchLogs(
        pagination.page,
        false,
      );
    }, 15_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchLogs, pagination.page]);

  const errorRate = useMemo(() => {
    if (summary.totalLogs === 0) {
      return "0.00";
    }

    return (
      (summary.errors / summary.totalLogs) *
      100
    ).toFixed(2);
  }, [summary]);

  const handleRefresh = () => {
    void fetchLogs(
      pagination.page,
      false,
    );
  };

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
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div>
          <p className="eyebrow">
            OBSERVE / LOGS
          </p>

          <h1
            style={{
              margin: "6px 0 8px",
              fontSize: 30,
              lineHeight: 1.1,
            }}
          >
            Logs
          </h1>

          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            Search, filter and investigate
            application logs across your
            observability environment.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 11px",
              border: "1px solid var(--border)",
              borderRadius: 7,
              color: "var(--muted)",
              fontSize: 11,
            }}
          >
            <Clock3 size={14} />
            Last 1 hour
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              opacity: refreshing ? 0.6 : 1,
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
            Refresh
          </button>

          <div className="avatar">DC</div>
        </div>
      </header>

      {/* SUMMARY */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <article className="metric-card">
          <div className="icon info">
            <Database size={18} />
          </div>

          <div>
            <p>Matching Logs</p>
            <strong>
              {loading
                ? "—"
                : summary.totalLogs.toLocaleString()}
            </strong>
            <small>Last 60 minutes</small>
          </div>
        </article>

        <article className="metric-card">
          <div
            className="icon"
            style={{
              color: "var(--red)",
            }}
          >
            <XCircle size={18} />
          </div>

          <div>
            <p>Errors</p>
            <strong>
              {loading
                ? "—"
                : summary.errors.toLocaleString()}
            </strong>
            <small>
              {errorRate}% of matching logs
            </small>
          </div>
        </article>

        <article className="metric-card">
          <div
            className="icon"
            style={{
              color: "var(--amber)",
            }}
          >
            <AlertCircle size={18} />
          </div>

          <div>
            <p>Warnings</p>
            <strong>
              {loading
                ? "—"
                : summary.warnings.toLocaleString()}
            </strong>
            <small>Across selected scope</small>
          </div>
        </article>

        <article className="metric-card">
          <div
            className="icon"
            style={{
              color: "var(--green)",
            }}
          >
            <Server size={18} />
          </div>

          <div>
            <p>Log Sources</p>
            <strong>
              {loading
                ? "—"
                : summary.logSources.toLocaleString()}
            </strong>
            <small>Distinct services</small>
          </div>
        </article>
      </section>

      {/* SEARCH + FILTERS */}
      <section
        className="panel"
        style={{
          marginBottom: 12,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 280,
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "var(--surface)",
              border:
                "1px solid var(--border)",
              borderRadius: 7,
              padding: "9px 11px",
            }}
          >
            <Search
              size={15}
              color="var(--muted)"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search log messages..."
              style={{
                width: "100%",
                background: "transparent",
                border: 0,
                outline: "none",
                color: "var(--text)",
                fontSize: 12,
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  padding: 3,
                  background: "transparent",
                  border: 0,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={service}
            onChange={(event) =>
              setService(event.target.value)
            }
            style={{
              minWidth: 160,
              padding: "9px 11px",
              borderRadius: 7,
              border:
                "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="ALL">
              All services
            </option>

            {services.map((item) => (
              <option
                key={item.id}
                value={item.slug}
              >
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={level}
            onChange={(event) =>
              setLevel(
                event.target.value as
                  | "ALL"
                  | LogLevel,
              )
            }
            style={{
              minWidth: 130,
              padding: "9px 11px",
              borderRadius: 7,
              border:
                "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="ALL">
              All levels
            </option>
            <option value="ERROR">
              Errors
            </option>
            <option value="WARN">
              Warnings
            </option>
            <option value="INFO">
              Info
            </option>
            <option value="DEBUG">
              Debug
            </option>
          </select>
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <section
          className="panel"
          style={{
            marginBottom: 12,
            padding: 14,
            borderColor:
              "color-mix(in srgb, var(--red) 35%, var(--border))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              color: "var(--red)",
              fontSize: 12,
            }}
          >
            <XCircle size={15} />
            {error}
          </div>

          <button
            type="button"
            onClick={() =>
              void fetchLogs(
                pagination.page,
                false,
              )
            }
          >
            Retry
          </button>
        </section>
      )}

      {/* LOG TABLE */}
      <section
        className="panel"
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div
          className="panel-head"
          style={{
            padding: "16px 18px",
            marginBottom: 0,
            borderBottom:
              "1px solid var(--border)",
          }}
        >
          <div>
            <h2>Live Logs</h2>

            <span>
              Production telemetry · newest
              entries first
            </span>
          </div>

          <span
            style={{
              fontSize: 10,
              color: "var(--green)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--green)",
              }}
            />
            Auto-refresh · 15s
          </span>
        </div>

        {/* TABLE HEADER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "90px 90px 150px 1fr 150px",
            gap: 12,
            padding: "12px 18px",
            borderBottom:
              "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          <span>Time</span>
          <span>Level</span>
          <span>Service</span>
          <span>Message</span>
          <span>Trace / Request</span>
        </div>

        {/* LOADING */}
        {loading && (
          <div
            style={{
              padding: "42px 18px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 12,
            }}
          >
            Loading logs...
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && logs.length === 0 && (
          <div
            style={{
              padding: "48px 18px",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <Database
              size={22}
              style={{
                marginBottom: 10,
                opacity: 0.6,
              }}
            />

            <div
              style={{
                fontSize: 13,
                color: "var(--text)",
                marginBottom: 5,
              }}
            >
              No logs found
            </div>

            <div
              style={{
                fontSize: 11,
              }}
            >
              Try changing the search or
              filters.
            </div>
          </div>
        )}

        {/* LOG ROWS */}
        {!loading &&
          logs.map((log) => {
            const config =
              levelConfig[log.level] ??
              levelConfig.INFO;

            const Icon = config.icon;

            const traceOrRequest =
              log.traceId ??
              log.requestId ??
              "—";

            return (
              <button
                key={log.id}
                type="button"
                onClick={() =>
                  setSelectedLog(log)
                }
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns:
                    "90px 90px 150px 1fr 150px",
                  gap: 12,
                  alignItems: "center",
                  padding: "14px 18px",
                  border: 0,
                  borderBottom:
                    "1px solid #202a34",
                  background: "transparent",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  {formatTime(
                    log.timestamp,
                  )}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color:
                      config.className ===
                      "error"
                        ? "var(--red)"
                        : config.className ===
                            "warn"
                          ? "var(--amber)"
                          : "var(--green)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  <Icon size={13} />
                  {log.level}
                </span>

                <span
                  style={{
                    color: "var(--blue)",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.service.name}
                </span>

                <span
                  style={{
                    color: "#c5ced7",
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.message}
                </span>

                <span
                  style={{
                    color: "var(--purple)",
                    fontFamily: "monospace",
                    fontSize: 10,
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {traceOrRequest}
                </span>
              </button>
            );
          })}

        {/* FOOTER */}
        {!loading && (
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              padding: "14px 18px",
              color: "var(--muted)",
              fontSize: 11,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>
              Showing{" "}
              {logs.length.toLocaleString()} of{" "}
              {pagination.total.toLocaleString()}{" "}
              logs
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage
                }
                onClick={() =>
                  void fetchLogs(
                    pagination.page - 1,
                  )
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ChevronLeft size={13} />
                Previous
              </button>

              <span>
                Page {pagination.page} of{" "}
                {Math.max(
                  1,
                  pagination.totalPages,
                )}
              </span>

              <button
                type="button"
                disabled={
                  !pagination.hasNextPage
                }
                onClick={() =>
                  void fetchLogs(
                    pagination.page + 1,
                  )
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>

            <span
              style={{
                color: "var(--blue)",
              }}
            >
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString()}`
                : "Waiting for data"}
            </span>
          </div>
        )}
      </section>

      {/* DETAIL DRAWER */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background:
              "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() =>
            setSelectedLog(null)
          }
        >
          <aside
            style={{
              width: "min(560px, 92vw)",
              height: "100%",
              background:
                "var(--background)",
              borderLeft:
                "1px solid var(--border)",
              padding: 24,
              overflowY: "auto",
              boxSizing: "border-box",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <p className="eyebrow">
                  LOG DETAIL
                </p>

                <h2
                  style={{
                    margin:
                      "6px 0 0",
                    fontSize: 20,
                  }}
                >
                  Log Event
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                style={{
                  padding: 7,
                  display: "inline-flex",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {(() => {
                const config =
                  levelConfig[
                    selectedLog.level
                  ] ??
                  levelConfig.INFO;

                const Icon = config.icon;

                return (
                  <span
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: 6,
                      color:
                        config.className ===
                        "error"
                          ? "var(--red)"
                          : config.className ===
                              "warn"
                            ? "var(--amber)"
                            : "var(--green)",
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    <Icon size={14} />
                    {selectedLog.level}
                  </span>
                );
              })()}

              <span
                style={{
                  color:
                    "var(--muted)",
                  fontSize: 11,
                }}
              >
                {formatDateTime(
                  selectedLog.timestamp,
                )}
              </span>
            </div>

            <div
              className="panel"
              style={{
                padding: 16,
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  margin:
                    "0 0 8px",
                  color:
                    "var(--muted)",
                  fontSize: 10,
                  textTransform:
                    "uppercase",
                  fontWeight: 700,
                }}
              >
                Message
              </p>

              <div
                style={{
                  color:
                    "var(--text)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  wordBreak:
                    "break-word",
                }}
              >
                {selectedLog.message}
              </div>
            </div>

            <div
              className="panel"
              style={{
                padding: 16,
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  margin:
                    "0 0 12px",
                  color:
                    "var(--muted)",
                  fontSize: 10,
                  textTransform:
                    "uppercase",
                  fontWeight: 700,
                }}
              >
                Correlation
              </p>

              <DetailRow
                label="Service"
                value={
                  selectedLog.service.name
                }
              />

              <DetailRow
                label="Trace ID"
                value={
                  selectedLog.traceId ??
                  "—"
                }
              />

              <DetailRow
                label="Span ID"
                value={
                  selectedLog.spanId ??
                  "—"
                }
              />

              <DetailRow
                label="Request ID"
                value={
                  selectedLog.requestId ??
                  "—"
                }
              />

              <DetailRow
                label="Host"
                value={
                  getMetadataValue(
                    selectedLog.metadata,
                    "host",
                  ) ??
                  getMetadataValue(
                    selectedLog.metadata,
                    "hostname",
                  ) ??
                  "—"
                }
              />
            </div>

            <div
              className="panel"
              style={{
                padding: 16,
              }}
            >
              <p
                style={{
                  margin:
                    "0 0 12px",
                  color:
                    "var(--muted)",
                  fontSize: 10,
                  textTransform:
                    "uppercase",
                  fontWeight: 700,
                }}
              >
                Metadata
              </p>

              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 7,
                  background:
                    "var(--surface)",
                  border:
                    "1px solid var(--border)",
                  overflowX: "auto",
                  color:
                    "var(--text)",
                  fontSize: 10,
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(
                  selectedLog.metadata ??
                    {},
                  null,
                  2,
                )}
              </pre>
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          main {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }

          section[style*="repeat(4"] {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          section[style*="repeat(4"] {
            grid-template-columns:
              1fr !important;
          }

          header {
            flex-direction: column !important;
          }
        }
      `}</style>
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "110px 1fr",
        gap: 12,
        padding: "8px 0",
        borderBottom:
          "1px solid var(--border)",
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "var(--text)",
          fontFamily:
            label === "Service"
              ? "inherit"
              : "monospace",
          fontSize: 10,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}