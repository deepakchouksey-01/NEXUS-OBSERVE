"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Globe2,
  Pause,
  Play,
  Plus,
  Search,
  Server,
  X,
} from "lucide-react";
import styles from "./page.module.css";

type MonitorStatus = "Up" | "Degraded" | "Down" | "Paused";
type MonitorType = "HTTP" | "API" | "TCP" | "Health Check";

type Monitor = {
  id: string;
  name: string;
  type: MonitorType;
  endpoint: string;
  environment: string;
  status: MonitorStatus;
  uptime: string;
  responseTime: string;
  interval: string;
  location: string;
  lastChecked: string;
  failures: number;
  description: string;
};

const initialMonitors: Monitor[] = [
  {
    id: "MON-001",
    name: "Public API",
    type: "HTTP",
    endpoint: "https://api.nexus.example.com/health",
    environment: "Production",
    status: "Up",
    uptime: "99.98%",
    responseTime: "142ms",
    interval: "30 sec",
    location: "Mumbai",
    lastChecked: "12 sec ago",
    failures: 0,
    description:
      "Primary public API availability monitor for production traffic.",
  },
  {
    id: "MON-002",
    name: "Payment API",
    type: "API",
    endpoint: "/api/v1/payments/health",
    environment: "Production",
    status: "Degraded",
    uptime: "99.72%",
    responseTime: "486ms",
    interval: "30 sec",
    location: "Singapore",
    lastChecked: "18 sec ago",
    failures: 3,
    description:
      "Monitors payment API availability and response performance.",
  },
  {
    id: "MON-003",
    name: "Orders Service",
    type: "Health Check",
    endpoint: "/health/orders",
    environment: "Production",
    status: "Up",
    uptime: "99.94%",
    responseTime: "96ms",
    interval: "1 min",
    location: "Mumbai",
    lastChecked: "24 sec ago",
    failures: 0,
    description:
      "Application-level health check for the Orders service.",
  },
  {
    id: "MON-004",
    name: "PostgreSQL",
    type: "TCP",
    endpoint: "postgres.internal:5432",
    environment: "Production",
    status: "Up",
    uptime: "100%",
    responseTime: "21ms",
    interval: "1 min",
    location: "Mumbai",
    lastChecked: "31 sec ago",
    failures: 0,
    description:
      "TCP connectivity monitor for the primary PostgreSQL cluster.",
  },
  {
    id: "MON-005",
    name: "Auth Service",
    type: "HTTP",
    endpoint: "https://auth.nexus.example.com/health",
    environment: "Staging",
    status: "Up",
    uptime: "99.87%",
    responseTime: "118ms",
    interval: "1 min",
    location: "Bangalore",
    lastChecked: "42 sec ago",
    failures: 1,
    description:
      "Staging authentication service availability monitor.",
  },
  {
    id: "MON-006",
    name: "Legacy Worker",
    type: "Health Check",
    endpoint: "/health/worker",
    environment: "Production",
    status: "Paused",
    uptime: "98.61%",
    responseTime: "—",
    interval: "5 min",
    location: "Delhi",
    lastChecked: "2h ago",
    failures: 8,
    description:
      "Background worker monitor temporarily paused during maintenance.",
  },
];

const statusOptions = ["All", "Up", "Degraded", "Down", "Paused"];
const typeOptions = ["All", "HTTP", "API", "TCP", "Health Check"];

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState(initialMonitors);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(false);

  const filteredMonitors = useMemo(() => {
    const query = search.toLowerCase().trim();

    return monitors.filter((monitor) => {
      const matchesSearch =
        !query ||
        monitor.name.toLowerCase().includes(query) ||
        monitor.endpoint.toLowerCase().includes(query) ||
        monitor.environment.toLowerCase().includes(query);

      const matchesStatus =
        status === "All" || monitor.status === status;

      const matchesType = type === "All" || monitor.type === type;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [monitors, search, status, type]);

  const upCount = monitors.filter((m) => m.status === "Up").length;
  const degradedCount = monitors.filter(
    (m) => m.status === "Degraded",
  ).length;
  const downCount = monitors.filter((m) => m.status === "Down").length;
  const pausedCount = monitors.filter(
    (m) => m.status === "Paused",
  ).length;

  function toggleMonitor(id: string) {
    setMonitors((current) =>
      current.map((monitor) => {
        if (monitor.id !== id) return monitor;

        const nextStatus: MonitorStatus =
          monitor.status === "Paused" ? "Up" : "Paused";

        return {
          ...monitor,
          status: nextStatus,
        };
      }),
    );

    setSelectedMonitor((current) => {
      if (!current || current.id !== id) return current;

      return {
        ...current,
        status: current.status === "Paused" ? "Up" : "Paused",
      };
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>OPERATE / MONITORS</div>
          <h1>Monitors</h1>
          <p>
            Continuously verify availability, connectivity and endpoint
            health.
          </p>
        </div>

        <div className={styles.actions}>
          <div className={styles.live}>
            <span />
            Monitoring active
          </div>

          <button
            className={styles.primaryButton}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />
            Create monitor
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric
          icon={<Activity size={17} />}
          label="Operational"
          value={upCount}
          detail="Healthy monitors"
          tone="success"
        />

        <Metric
          icon={<Clock3 size={17} />}
          label="Degraded"
          value={degradedCount}
          detail="Performance issues"
          tone="warning"
        />

        <Metric
          icon={<Server size={17} />}
          label="Down"
          value={downCount}
          detail="Availability failures"
          tone="critical"
        />

        <Metric
          icon={<Pause size={17} />}
          label="Paused"
          value={pausedCount}
          detail="Temporarily disabled"
          tone="muted"
        />
      </section>

      <section className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={15} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search monitors, endpoints or environments..."
          />
        </div>

        <div className={styles.filters}>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option} status
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option} type
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Monitor inventory</h2>
            <span>
              {filteredMonitors.length} monitors matching current filters
            </span>
          </div>

          <div className={styles.checkStatus}>
            <Globe2 size={14} />
            Global checks enabled
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Monitor</th>
                <th>Type</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>Response</th>
                <th>Interval</th>
                <th>Location</th>
                <th>Last check</th>
              </tr>
            </thead>

            <tbody>
              {filteredMonitors.map((monitor) => (
                <tr
                  key={monitor.id}
                  className={styles.row}
                  onClick={() => setSelectedMonitor(monitor)}
                >
                  <td>
                    <div className={styles.monitorName}>
                      <div
                        className={`${styles.monitorIcon} ${
                          styles[monitor.status.toLowerCase()]
                        }`}
                      >
                        <Activity size={15} />
                      </div>

                      <div>
                        <strong>{monitor.name}</strong>
                        <span>{monitor.endpoint}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={styles.typeBadge}>
                      {monitor.type}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={monitor.status} />
                  </td>

                  <td>
                    <strong className={styles.uptime}>
                      {monitor.uptime}
                    </strong>
                  </td>

                  <td>
                    <span className={styles.response}>
                      {monitor.responseTime}
                    </span>
                  </td>

                  <td>{monitor.interval}</td>

                  <td>
                    <span className={styles.location}>
                      <Globe2 size={11} />
                      {monitor.location}
                    </span>
                  </td>

                  <td>{monitor.lastChecked}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMonitors.length === 0 && (
            <div className={styles.empty}>
              <Search size={22} />
              <strong>No monitors found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Availability overview</h2>
              <span>Current monitor health distribution</span>
            </div>
          </div>

          <div className={styles.healthOverview}>
            <HealthBar
              label="Operational"
              value={upCount}
              total={monitors.length}
              tone="success"
            />

            <HealthBar
              label="Degraded"
              value={degradedCount}
              total={monitors.length}
              tone="warning"
            />

            <HealthBar
              label="Down"
              value={downCount}
              total={monitors.length}
              tone="critical"
            />

            <HealthBar
              label="Paused"
              value={pausedCount}
              total={monitors.length}
              tone="muted"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Check activity</h2>
              <span>Latest monitoring events</span>
            </div>
          </div>

          <div className={styles.timeline}>
            <TimelineItem
              tone="success"
              title="Public API check passed"
              detail="142ms response from Mumbai"
              time="12 sec ago"
            />

            <TimelineItem
              tone="warning"
              title="Payment API degraded"
              detail="Response time increased to 486ms"
              time="18 sec ago"
            />

            <TimelineItem
              tone="success"
              title="Orders health check passed"
              detail="96ms response"
              time="24 sec ago"
            />

            <TimelineItem
              tone="success"
              title="PostgreSQL connectivity verified"
              detail="21ms TCP response"
              time="31 sec ago"
            />
          </div>
        </div>
      </section>

      {selectedMonitor && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedMonitor(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>
                  {selectedMonitor.id}
                </span>

                <h2>{selectedMonitor.name}</h2>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setSelectedMonitor(null)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.drawerBadges}>
              <StatusBadge status={selectedMonitor.status} />

              <span className={styles.typeBadge}>
                {selectedMonitor.type}
              </span>
            </div>

            <div className={styles.detailBlock}>
              <span>Endpoint</span>
              <code>{selectedMonitor.endpoint}</code>
            </div>

            <div className={styles.detailBlock}>
              <span>Description</span>
              <p>{selectedMonitor.description}</p>
            </div>

            <div className={styles.detailGrid}>
              <Detail label="Environment" value={selectedMonitor.environment} />
              <Detail label="Uptime" value={selectedMonitor.uptime} />
              <Detail
                label="Response time"
                value={selectedMonitor.responseTime}
              />
              <Detail label="Interval" value={selectedMonitor.interval} />
              <Detail label="Location" value={selectedMonitor.location} />
              <Detail
                label="Last checked"
                value={selectedMonitor.lastChecked}
              />
              <Detail
                label="Recent failures"
                value={String(selectedMonitor.failures)}
              />
            </div>

            <div className={styles.drawerActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => toggleMonitor(selectedMonitor.id)}
              >
                {selectedMonitor.status === "Paused" ? (
                  <>
                    <Play size={14} />
                    Resume monitor
                  </>
                ) : (
                  <>
                    <Pause size={14} />
                    Pause monitor
                  </>
                )}
              </button>

              <button className={styles.primaryButton}>
                Edit monitor
              </button>
            </div>
          </aside>
        </div>
      )}

      {showCreate && (
        <div
          className={styles.overlay}
          onClick={() => setShowCreate(false)}
        >
          <div
            className={styles.createModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.drawerEyebrow}>
                  MONITOR CONFIGURATION
                </span>
                <h2>Create monitor</h2>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.form}>
              <label>
                Monitor name
                <input placeholder="e.g. Checkout API" />
              </label>

              <label>
                Monitor type
                <select defaultValue="HTTP">
                  <option>HTTP</option>
                  <option>API</option>
                  <option>TCP</option>
                  <option>Health Check</option>
                </select>
              </label>

              <label>
                Endpoint
                <input placeholder="https://example.com/health" />
              </label>

              <div className={styles.formGrid}>
                <label>
                  Environment
                  <select defaultValue="Production">
                    <option>Production</option>
                    <option>Staging</option>
                    <option>Development</option>
                  </select>
                </label>

                <label>
                  Check interval
                  <select defaultValue="30 sec">
                    <option>30 sec</option>
                    <option>1 min</option>
                    <option>5 min</option>
                  </select>
                </label>
              </div>

              <label>
                Monitoring location
                <select defaultValue="Mumbai">
                  <option>Mumbai</option>
                  <option>Bangalore</option>
                  <option>Delhi</option>
                  <option>Singapore</option>
                  <option>Global</option>
                </select>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>

              <button
                className={styles.primaryButton}
                onClick={() => setShowCreate(false)}
              >
                Create monitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone: "success" | "warning" | "critical" | "muted";
}) {
  return (
    <div className={styles.metric}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorStatus }) {
  return (
    <span className={`${styles.status} ${styles[status.toLowerCase()]}`}>
      <i />
      {status}
    </span>
  );
}

function HealthBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "success" | "warning" | "critical" | "muted";
}) {
  const percentage = total ? Math.round((value / total) * 100) : 0;

  return (
    <div className={styles.healthRow}>
      <div className={styles.healthLabel}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className={styles.progress}>
        <div
          className={`${styles.progressFill} ${styles[tone]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <small>{percentage}%</small>
    </div>
  );
}

function TimelineItem({
  tone,
  title,
  detail,
  time,
}: {
  tone: "success" | "warning" | "critical";
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className={styles.timelineItem}>
      <div className={`${styles.timelineDot} ${styles[tone]}`} />

      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>

      <time>{time}</time>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detail}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}