"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  Network,
  RefreshCw,
  Search,
  Server,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

type Status = "Healthy" | "Degraded" | "Critical";

type Dependency = {
  name: string;
  type: string;
  source: string;
  target: string;
  status: Status;
  latency: string;
  traffic: string;
  errorRate: string;
  trend: "up" | "down";
};

const dependencies: Dependency[] = [
  {
    name: "Gateway → Payments",
    type: "Service",
    source: "Gateway",
    target: "Payments",
    status: "Critical",
    latency: "842 ms",
    traffic: "842 req/s",
    errorRate: "8.4%",
    trend: "up",
  },
  {
    name: "Gateway → Orders",
    type: "Service",
    source: "Gateway",
    target: "Orders",
    status: "Healthy",
    latency: "118 ms",
    traffic: "624 req/s",
    errorRate: "0.2%",
    trend: "down",
  },
  {
    name: "Gateway → Inventory",
    type: "Service",
    source: "Gateway",
    target: "Inventory",
    status: "Degraded",
    latency: "421 ms",
    traffic: "418 req/s",
    errorRate: "2.8%",
    trend: "up",
  },
  {
    name: "Gateway → Auth",
    type: "Service",
    source: "Gateway",
    target: "Auth",
    status: "Healthy",
    latency: "96 ms",
    traffic: "931 req/s",
    errorRate: "0.1%",
    trend: "down",
  },
  {
    name: "Payments → PostgreSQL",
    type: "Database",
    source: "Payments",
    target: "PostgreSQL",
    status: "Critical",
    latency: "516 ms",
    traffic: "412 req/s",
    errorRate: "6.7%",
    trend: "up",
  },
  {
    name: "Orders → PostgreSQL",
    type: "Database",
    source: "Orders",
    target: "PostgreSQL",
    status: "Healthy",
    latency: "82 ms",
    traffic: "318 req/s",
    errorRate: "0.1%",
    trend: "down",
  },
  {
    name: "Inventory → Redis",
    type: "Cache",
    source: "Inventory",
    target: "Redis",
    status: "Degraded",
    latency: "214 ms",
    traffic: "8.41K ops/s",
    errorRate: "1.9%",
    trend: "up",
  },
  {
    name: "Auth → PostgreSQL",
    type: "Database",
    source: "Auth",
    target: "PostgreSQL",
    status: "Healthy",
    latency: "91 ms",
    traffic: "286 req/s",
    errorRate: "0.1%",
    trend: "down",
  },
];

const statusColor: Record<Status, string> = {
  Healthy: "#22c55e",
  Degraded: "#f59e0b",
  Critical: "#ef4444",
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "Healthy") {
    return <CheckCircle2 size={14} />;
  }

  if (status === "Degraded") {
    return <Clock3 size={14} />;
  }

  return <AlertTriangle size={14} />;
}

function DependencyIcon({ type }: { type: string }) {
  if (type === "Database") return <Database size={16} />;
  if (type === "Cache") return <Zap size={16} />;
  return <Network size={16} />;
}

export default function DependenciesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Dependency | null>(null);

  const filteredDependencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dependencies.filter((dependency) => {
      const matchesSearch =
        !query ||
        dependency.name.toLowerCase().includes(query) ||
        dependency.source.toLowerCase().includes(query) ||
        dependency.target.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || dependency.status === statusFilter;

      const matchesType =
        typeFilter === "All" || dependency.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter]);

  const refresh = () => {
    setRefreshing(true);

    window.setTimeout(() => {
      setRefreshing(false);
    }, 700);
  };

  const healthy = dependencies.filter(
    (dependency) => dependency.status === "Healthy",
  ).length;

  const degraded = dependencies.filter(
    (dependency) => dependency.status === "Degraded",
  ).length;

  const critical = dependencies.filter(
    (dependency) => dependency.status === "Critical",
  ).length;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">UNDERSTAND / DEPENDENCIES</p>

          <h1>Dependencies</h1>

          <p
            style={{
              marginTop: 8,
              maxWidth: 680,
              color: "var(--muted)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Monitor service-to-service relationships, dependency health,
            latency and production impact across your environment.
          </p>
        </div>

        <div className="top-actions">
          <button type="button">
            <Clock3 size={14} />
            Last 1 hour
          </button>

          <button type="button" onClick={refresh}>
            <RefreshCw
              size={14}
              style={{
                animation: refreshing
                  ? "spin .7s linear infinite"
                  : undefined,
              }}
            />
            Refresh
          </button>

          <div className="avatar">DC</div>
        </div>
      </header>

      <section className="metrics-grid">
        <article className="metric-card">
          <div className="icon info">
            <GitBranch size={18} />
          </div>

          <div>
            <p>Total Dependencies</p>
            <strong>{dependencies.length}</strong>
            <small>Production relationships monitored</small>
          </div>
        </article>

        <article className="metric-card">
          <div className="icon success">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <p>Healthy</p>
            <strong>{healthy}</strong>
            <small>Operating within normal thresholds</small>
          </div>
        </article>

        <article className="metric-card">
          <div className="icon critical">
            <AlertTriangle size={18} />
          </div>

          <div>
            <p>Critical</p>
            <strong>{critical}</strong>
            <small>Immediate investigation required</small>
          </div>
        </article>

        <article className="metric-card">
          <div className="icon ai">
            <Activity size={18} />
          </div>

          <div>
            <p>Degraded</p>
            <strong>{degraded}</strong>
            <small>Performance degradation detected</small>
          </div>
        </article>
      </section>

      <section
        className="panel"
        style={{
          marginBottom: 12,
          padding: 12,
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
              flex: "1 1 320px",
              minWidth: 240,
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <Search size={16} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dependencies..."
              style={{
                width: "100%",
                border: 0,
                outline: 0,
                background: "transparent",
                color: "inherit",
                fontSize: 12,
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "0 10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
            }}
          >
            <span
              style={{
                color: "var(--muted)",
                fontSize: 10,
              }}
            >
              Status
            </span>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                color: "inherit",
                fontSize: 11,
              }}
            >
              <option>All</option>
              <option>Healthy</option>
              <option>Degraded</option>
              <option>Critical</option>
            </select>
          </label>

          <label
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "0 10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
            }}
          >
            <span
              style={{
                color: "var(--muted)",
                fontSize: 10,
              }}
            >
              Type
            </span>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                color: "inherit",
                fontSize: 11,
              }}
            >
              <option>All</option>
              <option>Service</option>
              <option>Database</option>
              <option>Cache</option>
            </select>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 12,
            color: "var(--muted)",
            fontSize: 11,
          }}
        >
          <span>
            <b style={{ color: "var(--text)" }}>
              {filteredDependencies.length}
            </b>{" "}
            dependencies visible
          </span>

          <span>•</span>

          <span>Production environment</span>
        </div>
      </section>

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
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2>Dependency Health</h2>
            <span>
              Service relationships and real-time dependency performance
            </span>
          </div>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--blue)",
              fontSize: 11,
            }}
          >
            <i
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "currentColor",
              }}
            />
            Live
          </span>
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <div
            style={{
              minWidth: 900,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr 1fr 1fr 1.1fr 1fr",
                gap: 14,
                padding: "11px 18px",
                background: "#121a22",
                color: "#6f7d8b",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".06em",
              }}
            >
              <span>DEPENDENCY</span>
              <span>TYPE</span>
              <span>STATUS</span>
              <span>LATENCY</span>
              <span>TRAFFIC</span>
              <span>ERROR RATE</span>
            </div>

            {filteredDependencies.map((dependency) => (
              <button
                key={dependency.name}
                type="button"
                onClick={() => setSelected(dependency)}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 1fr 1fr 1fr 1.1fr 1fr",
                  gap: 14,
                  alignItems: "center",
                  padding: "12px 18px",
                  minHeight: 68,
                  border: 0,
                  borderTop: "1px solid var(--border)",
                  background: "transparent",
                  color: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 31,
                      height: 31,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 7,
                      background: "rgba(56,189,248,.08)",
                      color: "var(--blue)",
                    }}
                  >
                    <DependencyIcon type={dependency.type} />
                  </span>

                  <span>
                    <strong
                      style={{
                        display: "block",
                        fontSize: 11,
                      }}
                    >
                      {dependency.name}
                    </strong>

                    <small
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "var(--muted)",
                        fontSize: 9,
                      }}
                    >
                      {dependency.source} → {dependency.target}
                    </small>
                  </span>
                </span>

                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                  }}
                >
                  {dependency.type}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: statusColor[dependency.status],
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  <StatusIcon status={dependency.status} />
                  {dependency.status}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {dependency.latency}
                </span>

                <span
                  style={{
                    fontSize: 11,
                  }}
                >
                  {dependency.traffic}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color:
                      parseFloat(dependency.errorRate) > 2
                        ? "var(--red)"
                        : "var(--green)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {dependency.errorRate}

                  {dependency.trend === "up" ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                </span>
              </button>
            ))}

            {filteredDependencies.length === 0 && (
              <div
                style={{
                  minHeight: 220,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  textAlign: "center",
                }}
              >
                <div>
                  <Search size={22} />
                  <p
                    style={{
                      margin: "10px 0 4px",
                      color: "var(--text)",
                      fontSize: 13,
                    }}
                  >
                    No dependencies found
                  </p>
                  <span style={{ fontSize: 10 }}>
                    Try changing your search or filters.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="panel"
        style={{
          marginTop: 12,
          padding: 16,
        }}
      >
        <div className="panel-head">
          <div>
            <h2>Dependency Insights</h2>
            <span>Signals detected across production relationships</span>
          </div>

          <Network size={18} />
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 11,
              padding: 14,
              border: "1px solid rgba(239,68,68,.3)",
              borderRadius: 8,
              background: "rgba(239,68,68,.05)",
            }}
          >
            <AlertTriangle
              size={17}
              style={{
                color: "var(--red)",
                flexShrink: 0,
              }}
            />

            <div>
              <strong
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 12,
                }}
              >
                Payments dependency is critical
              </strong>

              <span
                style={{
                  color: "var(--muted)",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Gateway → Payments is experiencing elevated latency and an
                8.4% error rate.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 11,
              padding: 14,
              border: "1px solid rgba(245,158,11,.3)",
              borderRadius: 8,
              background: "rgba(245,158,11,.05)",
            }}
          >
            <Clock3
              size={17}
              style={{
                color: "var(--amber)",
                flexShrink: 0,
              }}
            />

            <div>
              <strong
                style={{
                  display: "block",
                  marginBottom: 4,
                  fontSize: 12,
                }}
              >
                Inventory → Redis requires monitoring
              </strong>

              <span
                style={{
                  color: "var(--muted)",
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Cache dependency P95 latency is currently 214 ms.
              </span>
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <aside
          style={{
            position: "fixed",
            zIndex: 50,
            top: 0,
            right: 0,
            width: 380,
            maxWidth: "100%",
            height: "100vh",
            overflowY: "auto",
            padding: 22,
            background: "#10171f",
            borderLeft: "1px solid var(--border)",
            boxShadow: "-20px 0 50px rgba(0,0,0,.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  color: "var(--blue)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".1em",
                }}
              >
                DEPENDENCY DETAILS
              </span>

              <h2
                style={{
                  margin: "7px 0 0",
                  fontSize: 18,
                }}
              >
                {selected.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{
                width: 30,
                height: 30,
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--panel)",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: statusColor[selected.status],
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <i
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "currentColor",
              }}
            />

            {selected.status}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 18,
            }}
          >
            {[
              ["Source", selected.source],
              ["Target", selected.target],
              ["Latency", selected.latency],
              ["Traffic", selected.traffic],
              ["Error rate", selected.errorRate],
              ["Type", selected.type],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  background: "var(--card)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "var(--muted)",
                    fontSize: 9,
                  }}
                >
                  {label}
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                    fontSize: 12,
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "var(--muted)",
                fontSize: 10,
              }}
            >
              <Server size={14} />
              Dependency path
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: 14,
                fontSize: 11,
              }}
            >
              <strong>{selected.source}</strong>
              <ArrowDownRight size={14} />
              <strong>{selected.target}</strong>
            </div>
          </div>
        </aside>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        button:hover {
          background: rgba(255, 255, 255, 0.025);
        }
      `}</style>
    </>
  );
}