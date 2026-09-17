"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Filter,
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

type TraceStatus =
  | "OK"
  | "WARNING"
  | "ERROR"
  | string;

type SpanRecord = {
  id: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  durationMs: number;
  status: TraceStatus;
  timestamp: string;
  attributes: Record<string, unknown> | null;
  service: {
    id: string;
    name: string;
    slug: string;
    status: string;
    version: string | null;
  };
};

type TraceRecord = {
  id: string;
  traceId: string;
  spanId: string;
  name: string;
  durationMs: number;
  status: TraceStatus;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  service: {
    id: string;
    name: string;
    slug: string;
    status: string;
    version: string | null;
  };
  spans: SpanRecord[];
};

type TracesResponse = {
  success: boolean;
  data: TraceRecord[];
  summary: {
    totalTraces: number;
    errorTraces: number;
    slowTraces: number;
    servicesTraced: number;
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
};

type ServiceRecord = {
  id: string;
  name: string;
  slug: string;
};

type ServicesResponse = {
  success: boolean;
  data: ServiceRecord[];
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatStatus(status: string) {
  switch (status.toUpperCase()) {
    case "OK":
    case "SUCCESS":
      return "Success";

    case "WARNING":
    case "WARN":
      return "Warning";

    case "ERROR":
    case "FAILED":
      return "Error";

    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "OK":
    case "SUCCESS":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";

    case "WARNING":
    case "WARN":
      return "border-amber-500/20 bg-amber-500/10 text-amber-400";

    case "ERROR":
    case "FAILED":
      return "border-red-500/20 bg-red-500/10 text-red-400";

    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }
}

function getTraceStatusIcon(status: string) {
  switch (status.toUpperCase()) {
    case "ERROR":
    case "FAILED":
      return <XCircle className="h-4 w-4" />;

    case "WARNING":
    case "WARN":
      return <AlertTriangle className="h-4 w-4" />;

    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

function getMetadataValue(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  if (!metadata) {
    return "—";
  }

  const value = metadata[key];

  if (value === undefined || value === null) {
    return "—";
  }

  return String(value);
}

/**
 * Calculates how deep a span is inside the trace tree.
 *
 * Root span:
 * depth = 0
 *
 * Child span:
 * depth = 1
 *
 * Grandchild:
 * depth = 2
 *
 * This uses parentSpanId returned by the API.
 */
function getSpanIndent(
  span: SpanRecord,
  spans: SpanRecord[],
) {
  let depth = 0;
  let parentId = span.parentSpanId;

  while (parentId) {
    const parent = spans.find(
      (item) => item.spanId === parentId,
    );

    if (!parent) {
      break;
    }

    depth += 1;
    parentId = parent.parentSpanId;

    /*
     * Safety guard against malformed/cyclic
     * trace relationships.
     */
    if (depth > 10) {
      break;
    }
  }

  return depth;
}

export default function TracesPage() {
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [service, setService] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] =
    useState<TracesResponse["pagination"] | null>(null);

  const [summary, setSummary] =
    useState<TracesResponse["summary"]>({
      totalTraces: 0,
      errorTraces: 0,
      slowTraces: 0,
      servicesTraced: 0,
    });

  const [selectedTrace, setSelectedTrace] =
    useState<TraceRecord | null>(null);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const limit = 25;

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
        localStorage.removeItem(
          "nexus_access_token",
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
      /*
       * Trace API remains the primary data source.
       */
    }
  }, []);

  const fetchTraces = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const now = new Date();

        const from = new Date(
          now.getTime() -
            60 * 60 * 1000,
        );

        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          from: from.toISOString(),
          to: now.toISOString(),
        });

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        if (service) {
          params.set(
            "service",
            service,
          );
        }

        if (status) {
          params.set(
            "status",
            status,
          );
        }

        const response = await fetch(
          `${API_URL}/api/v1/traces?${params.toString()}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          localStorage.removeItem(
            "nexus_access_token",
          );

          window.location.href = "/login";

          return;
        }

        if (!response.ok) {
          throw new Error(
            `Trace API returned ${response.status}`,
          );
        }

        const result =
          (await response.json()) as TracesResponse;

        if (!result.success) {
          throw new Error(
            "Trace API returned an unsuccessful response.",
          );
        }

        setTraces(result.data);
        setSummary(result.summary);
        setPagination(result.pagination);
        setLastUpdated(new Date());
      } catch (fetchError) {
        console.error(fetchError);

        setError(
          "Unable to load distributed traces. Check the API and worker.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      search,
      service,
      status,
    ],
  );

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    void fetchTraces();

    const interval =
      window.setInterval(() => {
        void fetchTraces(true);
      }, 15_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchTraces]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    service,
    status,
  ]);

  const visibleTraces = useMemo(
    () => traces,
    [traces],
  );

  const activeFilterCount =
    Number(Boolean(service)) +
    Number(Boolean(status)) +
    Number(Boolean(search.trim()));

  const clearFilters = () => {
    setSearch("");
    setService("");
    setStatus("");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="mx-auto max-w-[1800px] px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Activity className="h-4 w-4" />
              Observability / Traces
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Distributed Traces
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Trace execution paths across your services and
              inspect individual spans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
              <Clock3 className="mr-2 inline h-3.5 w-3.5" />
              Last 1 hour
            </div>

            <button
              type="button"
              onClick={() =>
                void fetchTraces(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold">
              DC
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Traces"
            value={summary.totalTraces.toLocaleString()}
            icon={
              <Activity className="h-5 w-5" />
            }
            loading={loading}
          />

          <SummaryCard
            label="Error Traces"
            value={summary.errorTraces.toLocaleString()}
            icon={
              <XCircle className="h-5 w-5" />
            }
            loading={loading}
          />

          <SummaryCard
            label="Slow Traces"
            value={summary.slowTraces.toLocaleString()}
            icon={
              <Clock3 className="h-5 w-5" />
            }
            loading={loading}
          />

          <SummaryCard
            label="Services Traced"
            value={summary.servicesTraced.toLocaleString()}
            icon={
              <Server className="h-5 w-5" />
            }
            loading={loading}
          />
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search trace ID, operation or service..."
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-10 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-600"
              />
            </div>

            <select
              value={service}
              onChange={(event) =>
                setService(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300 outline-none focus:border-slate-600"
            >
              <option value="">
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
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300 outline-none focus:border-slate-600"
            >
              <option value="">
                All statuses
              </option>

              <option value="OK">
                Success
              </option>

              <option value="WARNING">
                Warning
              </option>

              <option value="ERROR">
                Error
              </option>
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-800 px-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-200"
              >
                <Filter className="h-4 w-4" />

                Clear filters

                <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px]">
                  {activeFilterCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            <XCircle className="h-4 w-4 shrink-0" />

            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-slate-800 bg-slate-900/60">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">
                    Trace ID
                  </th>

                  <th className="px-5 py-3">
                    Time
                  </th>

                  <th className="px-5 py-3">
                    Service
                  </th>

                  <th className="px-5 py-3">
                    Operation
                  </th>

                  <th className="px-5 py-3">
                    Duration
                  </th>

                  <th className="px-5 py-3">
                    Spans
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  Array.from({
                    length: 8,
                  }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({
                        length: 7,
                      }).map(
                        (_, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-5 py-4"
                          >
                            <div className="h-4 animate-pulse rounded bg-slate-800/70" />
                          </td>
                        ),
                      )}
                    </tr>
                  ))
                ) : visibleTraces.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <Activity className="mx-auto mb-3 h-8 w-8 text-slate-700" />

                      <p className="text-sm font-medium text-slate-400">
                        No traces found
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Try changing the search or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleTraces.map(
                    (trace) => (
                      <tr
                        key={trace.id}
                        onClick={() =>
                          setSelectedTrace(
                            trace,
                          )
                        }
                        className="cursor-pointer transition hover:bg-slate-900/60"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-cyan-400">
                            {trace.traceId}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-400">
                          {formatTime(
                            trace.timestamp,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-slate-200">
                            {trace.service.name}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-600">
                            {trace.service.slug}
                          </div>
                        </td>

                        <td className="max-w-[320px] px-5 py-4">
                          <div className="truncate text-sm text-slate-300">
                            {trace.name}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              trace.durationMs >
                              500
                                ? "font-medium text-amber-400"
                                : "text-slate-400"
                            }
                          >
                            {formatDuration(
                              trace.durationMs,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-400">
                          {trace.spans.length}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${statusClass(
                              trace.status,
                            )}`}
                          >
                            {getTraceStatusIcon(
                              trace.status,
                            )}

                            {formatStatus(
                              trace.status,
                            )}
                          </span>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination && (
            <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing{" "}
                <span className="text-slate-300">
                  {visibleTraces.length}
                </span>{" "}
                of{" "}
                <span className="text-slate-300">
                  {pagination.total.toLocaleString()}
                </span>{" "}
                traces
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1,
                        ),
                    )
                  }
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-400 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-slate-500">
                  Page{" "}
                  {pagination.page} of{" "}
                  {Math.max(
                    pagination.totalPages,
                    1,
                  )}
                </span>

                <button
                  type="button"
                  disabled={
                    !pagination.hasNextPage
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1,
                    )
                  }
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-400 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <span>
            Distributed tracing active · newest traces first
          </span>

          {lastUpdated && (
            <span>
              Updated{" "}
              {lastUpdated.toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                },
              )}
            </span>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedTrace && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close trace details"
            onClick={() =>
              setSelectedTrace(null)
            }
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <aside className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-slate-800 bg-[#080d18] shadow-2xl">
            {/* Drawer Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-[#080d18]/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Trace details
                </p>

                <h2 className="mt-1 truncate text-lg font-semibold text-slate-100">
                  {selectedTrace.name}
                </h2>

                <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
                  {selectedTrace.traceId}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTrace(null)
                }
                className="ml-4 shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-7 p-6">
              {/* Trace Overview */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-200">
                    Overview
                  </h3>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${statusClass(
                      selectedTrace.status,
                    )}`}
                  >
                    {getTraceStatusIcon(
                      selectedTrace.status,
                    )}

                    {formatStatus(
                      selectedTrace.status,
                    )}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Trace ID"
                    value={
                      selectedTrace.traceId
                    }
                    mono
                  />

                  <DetailItem
                    label="Root Span ID"
                    value={
                      selectedTrace.spanId
                    }
                    mono
                  />

                  <DetailItem
                    label="Service"
                    value={
                      selectedTrace.service.name
                    }
                  />

                  <DetailItem
                    label="Duration"
                    value={formatDuration(
                      selectedTrace.durationMs,
                    )}
                  />

                  <DetailItem
                    label="Timestamp"
                    value={new Date(
                      selectedTrace.timestamp,
                    ).toLocaleString()}
                  />

                  <DetailItem
                    label="Version"
                    value={
                      selectedTrace.service
                        .version ?? "—"
                    }
                  />
                </div>
              </section>

              {/* Trace Metadata */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-slate-200">
                  Trace Metadata
                </h3>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="space-y-2 text-xs">
                    <MetadataRow
                      label="Source"
                      value={getMetadataValue(
                        selectedTrace.metadata,
                        "source",
                      )}
                    />

                    <MetadataRow
                      label="Collector"
                      value={getMetadataValue(
                        selectedTrace.metadata,
                        "collector",
                      )}
                    />

                    <MetadataRow
                      label="Operation"
                      value={getMetadataValue(
                        selectedTrace.metadata,
                        "operation",
                      )}
                    />

                    <MetadataRow
                      label="Trace Type"
                      value={getMetadataValue(
                        selectedTrace.metadata,
                        "traceType",
                      )}
                    />
                  </div>
                </div>
              </section>

              {/* Span Waterfall */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">
                      Span Waterfall
                    </h3>

                    <p className="mt-1 text-xs text-slate-600">
                      Parent-child execution path across services
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    {selectedTrace.spans.length}{" "}
                    spans
                  </span>
                </div>

                {selectedTrace.spans.length ===
                0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-8 text-center text-xs text-slate-600">
                    No spans available for this trace.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTrace.spans.map(
                      (span, index) => {
                        const depth =
                          getSpanIndent(
                            span,
                            selectedTrace.spans,
                          );

                        const maxDuration =
                          Math.max(
                            ...selectedTrace.spans.map(
                              (item) =>
                                item.durationMs,
                            ),
                            1,
                          );

                        const width =
                          Math.max(
                            8,
                            Math.round(
                              (span.durationMs /
                                maxDuration) *
                                100,
                            ),
                          );

                        const isRoot =
                          span.parentSpanId ===
                          null;

                        return (
                          <div
                            key={span.id}
                            className="relative"
                            style={{
                              marginLeft:
                                `${depth * 24}px`,
                            }}
                          >
                            {/* Hierarchy connector */}
                            {depth > 0 && (
                              <div className="absolute -left-3 top-0 h-full border-l border-slate-800" />
                            )}

                            {depth > 0 && (
                              <div className="absolute -left-3 top-7 w-3 border-t border-slate-800" />
                            )}

                            <div
                              className={`rounded-xl border bg-slate-950/70 p-4 transition ${
                                isRoot
                                  ? "border-cyan-500/20"
                                  : "border-slate-800"
                              } hover:border-slate-700`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Span index */}
                                <div
                                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                                    isRoot
                                      ? "bg-cyan-500/10 text-cyan-400"
                                      : "bg-slate-900 text-slate-500"
                                  }`}
                                >
                                  {index + 1}
                                </div>

                                <div className="min-w-0 flex-1">
                                  {/* Span header */}
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="truncate text-sm font-medium text-slate-200">
                                          {span.name}
                                        </div>

                                        {isRoot && (
                                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-cyan-400">
                                            Root
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-1 text-xs text-slate-600">
                                        {span.service.name}
                                      </div>
                                    </div>

                                    <span
                                      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${statusClass(
                                        span.status,
                                      )}`}
                                    >
                                      {formatStatus(
                                        span.status,
                                      )}
                                    </span>
                                  </div>

                                  {/* Duration */}
                                  <div className="mt-4">
                                    <div className="mb-1 flex items-center justify-between text-[10px]">
                                      <span className="text-slate-600">
                                        Execution time
                                      </span>

                                      <span className="font-mono text-slate-400">
                                        {formatDuration(
                                          span.durationMs,
                                        )}
                                      </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                                      <div
                                        className="h-full rounded-full bg-cyan-500/60 transition-all"
                                        style={{
                                          width: `${width}%`,
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Span IDs */}
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider text-slate-600">
                                        Span ID
                                      </span>

                                      <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                                        {span.spanId}
                                      </div>
                                    </div>

                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider text-slate-600">
                                        Parent Span
                                      </span>

                                      <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                                        {span.parentSpanId ??
                                          "Root span"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Service metadata */}
                                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                                    <span>
                                      Service:{" "}
                                      <span className="text-slate-400">
                                        {
                                          span.service
                                            .name
                                        }
                                      </span>
                                    </span>

                                    <span>
                                      Version:{" "}
                                      <span className="text-slate-400">
                                        {
                                          span.service
                                            .version ??
                                          "—"
                                        }
                                      </span>
                                    </span>

                                    <span>
                                      Time:{" "}
                                      <span className="text-slate-400">
                                        {formatTime(
                                          span.timestamp,
                                        )}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </section>

              {/* Span Attributes */}
              {selectedTrace.spans.length >
                0 &&
                selectedTrace.spans.some(
                  (span) =>
                    span.attributes &&
                    Object.keys(
                      span.attributes,
                    ).length > 0,
                ) && (
                  <section>
                    <h3 className="mb-3 text-sm font-medium text-slate-200">
                      Span Attributes
                    </h3>

                    <div className="space-y-3">
                      {selectedTrace.spans
                        .filter(
                          (span) =>
                            span.attributes &&
                            Object.keys(
                              span.attributes,
                            ).length > 0,
                        )
                        .map((span) => (
                          <div
                            key={span.id}
                            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-slate-300">
                                  {span.name}
                                </p>

                                <p className="mt-1 text-[10px] text-slate-600">
                                  {
                                    span.service
                                      .name
                                  }
                                </p>
                              </div>

                              <span className="font-mono text-[10px] text-slate-600">
                                {span.spanId}
                              </span>
                            </div>

                            <pre className="overflow-x-auto rounded-lg border border-slate-900 bg-[#070b14] p-3 text-xs leading-6 text-slate-400">
                              {JSON.stringify(
                                span.attributes,
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {label}
        </span>

        <span className="text-slate-600">
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-slate-800/70" />
      ) : (
        <div className="text-2xl font-semibold tracking-tight text-slate-100">
          {value}
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[11px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p
        className={`mt-1 break-all text-sm text-slate-300 ${
          mono
            ? "font-mono text-xs"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-900 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-600">
        {label}
      </span>

      <span className="text-right font-mono text-slate-400">
        {value}
      </span>
    </div>
  );
}