"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  Search,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import styles from "./page.module.css";

type Severity = "Critical" | "Warning" | "Info";
type AlertStatus = "Firing" | "Acknowledged" | "Resolved";

type AlertItem = {
  id: string;
  title: string;
  service: string;
  environment: string;
  severity: Severity;
  status: AlertStatus;
  rule: string;
  value: string;
  threshold: string;
  duration: string;
  triggered: string;
  description: string;
};

const alerts: AlertItem[] = [
  {
    id: "ALT-1042",
    title: "High API latency detected",
    service: "API Gateway",
    environment: "Production",
    severity: "Critical",
    status: "Firing",
    rule: "P95 latency > 500ms",
    value: "684ms",
    threshold: "500ms",
    duration: "18m",
    triggered: "8 min ago",
    description:
      "The API Gateway P95 latency has remained above the configured threshold.",
  },
  {
    id: "ALT-1041",
    title: "Payment service error rate elevated",
    service: "Payments",
    environment: "Production",
    severity: "Critical",
    status: "Acknowledged",
    rule: "5xx rate > 2%",
    value: "3.8%",
    threshold: "2%",
    duration: "31m",
    triggered: "31 min ago",
    description:
      "Payment requests are returning an elevated number of server errors.",
  },
  {
    id: "ALT-1040",
    title: "CPU utilization above threshold",
    service: "Orders",
    environment: "Production",
    severity: "Warning",
    status: "Firing",
    rule: "CPU > 80%",
    value: "86%",
    threshold: "80%",
    duration: "12m",
    triggered: "12 min ago",
    description:
      "The Orders service is experiencing sustained CPU utilization above threshold.",
  },
  {
    id: "ALT-1039",
    title: "Redis memory pressure",
    service: "Redis",
    environment: "Production",
    severity: "Warning",
    status: "Acknowledged",
    rule: "Memory > 75%",
    value: "78%",
    threshold: "75%",
    duration: "46m",
    triggered: "46 min ago",
    description:
      "Redis memory utilization is approaching the configured capacity threshold.",
  },
  {
    id: "ALT-1038",
    title: "Authentication request spike",
    service: "Auth Service",
    environment: "Staging",
    severity: "Info",
    status: "Firing",
    rule: "Requests > 2k/min",
    value: "2.4k/min",
    threshold: "2k/min",
    duration: "7m",
    triggered: "7 min ago",
    description:
      "Authentication traffic has increased significantly compared with the baseline.",
  },
  {
    id: "ALT-1037",
    title: "Database connection pool recovered",
    service: "PostgreSQL",
    environment: "Production",
    severity: "Info",
    status: "Resolved",
    rule: "Connections > 85%",
    value: "61%",
    threshold: "85%",
    duration: "22m",
    triggered: "1h ago",
    description:
      "Database connection utilization returned below the configured threshold.",
  },
];

const severityOptions = ["All", "Critical", "Warning", "Info"];
const statusOptions = ["All", "Firing", "Acknowledged", "Resolved"];

export default function AlertsPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [items, setItems] = useState(alerts);

  const filteredAlerts = useMemo(() => {
    const query = search.toLowerCase().trim();

    return items.filter((alert) => {
      const matchesSearch =
        !query ||
        alert.title.toLowerCase().includes(query) ||
        alert.service.toLowerCase().includes(query) ||
        alert.rule.toLowerCase().includes(query) ||
        alert.id.toLowerCase().includes(query);

      const matchesSeverity =
        severity === "All" || alert.severity === severity;

      const matchesStatus = status === "All" || alert.status === status;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [items, search, severity, status]);

  const firingCount = items.filter((item) => item.status === "Firing").length;
  const criticalCount = items.filter(
    (item) => item.severity === "Critical" && item.status !== "Resolved",
  ).length;
  const acknowledgedCount = items.filter(
    (item) => item.status === "Acknowledged",
  ).length;
  const resolvedCount = items.filter(
    (item) => item.status === "Resolved",
  ).length;

  function updateAlertStatus(id: string, nextStatus: AlertStatus) {
    setItems((current) =>
      current.map((alert) =>
        alert.id === id ? { ...alert, status: nextStatus } : alert,
      ),
    );

    setSelectedAlert((current) =>
      current && current.id === id
        ? { ...current, status: nextStatus }
        : current,
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>OPERATE / ALERTS</div>
          <h1>Alerts</h1>
          <p>
            Monitor triggered alert rules and manage operational response.
          </p>
        </div>

        <div className={styles.actions}>
          <div className={styles.live}>
            <span />
            Live monitoring
          </div>

          <button className={styles.actionButton}>
            <Bell size={14} />
            Alert rules
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric
          icon={<Zap size={17} />}
          label="Firing"
          value={firingCount}
          detail="Currently active"
          tone="critical"
        />

        <Metric
          icon={<ShieldAlert size={17} />}
          label="Critical"
          value={criticalCount}
          detail="Requires attention"
          tone="critical"
        />

        <Metric
          icon={<Clock3 size={17} />}
          label="Acknowledged"
          value={acknowledgedCount}
          detail="Being investigated"
          tone="warning"
        />

        <Metric
          icon={<CheckCircle2 size={17} />}
          label="Resolved"
          value={resolvedCount}
          detail="Recently recovered"
          tone="success"
        />
      </section>

      <section className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alerts, services or rules..."
          />
        </div>

        <div className={styles.filters}>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {severityOptions.map((option) => (
              <option key={option}>{option} severity</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option}>{option} status</option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Alert activity</h2>
            <span>
              {filteredAlerts.length} alerts matching current filters
            </span>
          </div>

          <div className={styles.panelStatus}>
            <span />
            Monitoring active
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Service</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Value</th>
                <th>Duration</th>
                <th>Triggered</th>
              </tr>
            </thead>

            <tbody>
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className={styles.row}
                >
                  <td>
                    <div className={styles.alertName}>
                      <div
                        className={`${styles.alertIcon} ${
                          styles[alert.severity.toLowerCase()]
                        }`}
                      >
                        <AlertCircle size={15} />
                      </div>

                      <div>
                        <strong>{alert.title}</strong>
                        <span>
                          {alert.id} · {alert.rule}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className={styles.service}>
                      <strong>{alert.service}</strong>
                      <span>{alert.environment}</span>
                    </div>
                  </td>

                  <td>
                    <SeverityBadge severity={alert.severity} />
                  </td>

                  <td>
                    <StatusBadge status={alert.status} />
                  </td>

                  <td>
                    <span className={styles.value}>{alert.value}</span>
                    <span className={styles.threshold}>
                      / {alert.threshold}
                    </span>
                  </td>

                  <td>{alert.duration}</td>
                  <td>{alert.triggered}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAlerts.length === 0 && (
            <div className={styles.empty}>
              <CheckCircle2 size={22} />
              <strong>No alerts found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Alert response</h2>
              <span>Current operational workload</span>
            </div>
          </div>

          <div className={styles.responseList}>
            <ResponseRow
              label="Critical alerts"
              value={`${criticalCount}`}
              description="Need immediate investigation"
            />

            <ResponseRow
              label="Firing alerts"
              value={`${firingCount}`}
              description="Currently impacting monitored systems"
            />

            <ResponseRow
              label="Acknowledged"
              value={`${acknowledgedCount}`}
              description="Assigned to an active investigation"
            />

            <ResponseRow
              label="Resolved"
              value={`${resolvedCount}`}
              description="Recovered alerts"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent activity</h2>
              <span>Latest alert lifecycle events</span>
            </div>
          </div>

          <div className={styles.timeline}>
            <TimelineItem
              type="critical"
              title="API Gateway alert triggered"
              detail="P95 latency exceeded 500ms"
              time="8 min ago"
            />

            <TimelineItem
              type="warning"
              title="Orders alert triggered"
              detail="CPU utilization reached 86%"
              time="12 min ago"
            />

            <TimelineItem
              type="success"
              title="PostgreSQL alert resolved"
              detail="Connection utilization returned to normal"
              time="1h ago"
            />

            <TimelineItem
              type="info"
              title="Auth traffic threshold crossed"
              detail="Requests exceeded baseline"
              time="7 min ago"
            />
          </div>
        </div>
      </section>

      {selectedAlert && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedAlert(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>
                  {selectedAlert.id}
                </span>
                <h2>{selectedAlert.title}</h2>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setSelectedAlert(null)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.drawerBadges}>
              <SeverityBadge severity={selectedAlert.severity} />
              <StatusBadge status={selectedAlert.status} />
            </div>

            <div className={styles.detailBlock}>
              <span>Description</span>
              <p>{selectedAlert.description}</p>
            </div>

            <div className={styles.detailGrid}>
              <Detail label="Service" value={selectedAlert.service} />
              <Detail
                label="Environment"
                value={selectedAlert.environment}
              />
              <Detail label="Rule" value={selectedAlert.rule} />
              <Detail label="Current value" value={selectedAlert.value} />
              <Detail label="Threshold" value={selectedAlert.threshold} />
              <Detail label="Duration" value={selectedAlert.duration} />
              <Detail label="Triggered" value={selectedAlert.triggered} />
            </div>

            <div className={styles.drawerActions}>
              {selectedAlert.status === "Firing" && (
                <button
                  className={styles.primaryButton}
                  onClick={() =>
                    updateAlertStatus(selectedAlert.id, "Acknowledged")
                  }
                >
                  <CheckCircle2 size={15} />
                  Acknowledge
                </button>
              )}

              {selectedAlert.status !== "Resolved" && (
                <button
                  className={styles.secondaryButton}
                  onClick={() =>
                    updateAlertStatus(selectedAlert.id, "Resolved")
                  }
                >
                  Resolve alert
                </button>
              )}
            </div>
          </aside>
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
  tone: "critical" | "warning" | "success";
}) {
  return (
    <div className={styles.metric}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`${styles.badge} ${
        styles[`severity${severity}`]
      }`}
    >
      <i />
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <span
      className={`${styles.badge} ${styles[`status${status}`]}`}
    >
      <i />
      {status}
    </span>
  );
}

function ResponseRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className={styles.responseRow}>
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>

      <b>{value}</b>
    </div>
  );
}

function TimelineItem({
  type,
  title,
  detail,
  time,
}: {
  type: "critical" | "warning" | "success" | "info";
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className={styles.timelineItem}>
      <div className={`${styles.timelineDot} ${styles[type]}`} />

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