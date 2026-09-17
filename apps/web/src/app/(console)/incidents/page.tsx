"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Filter,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./page.module.css";

type Severity = "Critical" | "High" | "Warning" | "Resolved";

type Incident = {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: "Investigating" | "Identified" | "Monitoring" | "Resolved";
  started: string;
  duration: string;
  assignee: string;
  description: string;
};

const incidents: Incident[] = [
  {
    id: "INC-1042",
    title: "Payment API latency elevated",
    service: "Payments",
    severity: "Critical",
    status: "Investigating",
    started: "12 min ago",
    duration: "12 min",
    assignee: "Rahul Sharma",
    description:
      "Payment requests are experiencing elevated latency and intermittent failures.",
  },
  {
    id: "INC-1041",
    title: "Inventory service response degradation",
    service: "Inventory",
    severity: "High",
    status: "Identified",
    started: "34 min ago",
    duration: "34 min",
    assignee: "Priya Mehta",
    description:
      "Inventory API P95 latency has increased above the configured production threshold.",
  },
  {
    id: "INC-1040",
    title: "Redis cache latency spike",
    service: "Redis",
    severity: "Warning",
    status: "Monitoring",
    started: "1 hr ago",
    duration: "1 hr",
    assignee: "Amit Verma",
    description:
      "Cache operations are slower than normal but service availability remains healthy.",
  },
  {
    id: "INC-1039",
    title: "Authentication error rate increased",
    service: "Auth",
    severity: "Resolved",
    status: "Resolved",
    started: "3 hrs ago",
    duration: "18 min",
    assignee: "Neha Patel",
    description:
      "Authentication errors increased temporarily following a configuration change.",
  },
];

const severityColor: Record<Severity, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Warning: "#f59e0b",
  Resolved: "#22c55e",
};

export default function IncidentsPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedIncident, setSelectedIncident] =
    useState<Incident | null>(null);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        !query ||
        incident.id.toLowerCase().includes(query) ||
        incident.title.toLowerCase().includes(query) ||
        incident.service.toLowerCase().includes(query);

      const matchesSeverity =
        severity === "All" || incident.severity === severity;

      const matchesStatus =
        status === "All" || incident.status === status;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [search, severity, status]);

  const activeCount = incidents.filter(
    (incident) => incident.status !== "Resolved",
  ).length;

  const criticalCount = incidents.filter(
    (incident) => incident.severity === "Critical",
  ).length;

  const investigatingCount = incidents.filter(
    (incident) => incident.status === "Investigating",
  ).length;

  const resolvedCount = incidents.filter(
    (incident) => incident.status === "Resolved",
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>OPERATE / INCIDENTS</div>

          <h1>Incidents</h1>

          <p>
            Monitor, investigate and resolve production incidents across your
            services and infrastructure.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.live}>
            <i />
            Monitoring
          </div>

          <div className={styles.avatar}>DC</div>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric
          icon={<ShieldAlert size={18} />}
          label="Active Incidents"
          value={activeCount}
          detail="Currently requiring attention"
          variant="critical"
        />

        <Metric
          icon={<AlertTriangle size={18} />}
          label="Critical"
          value={criticalCount}
          detail="Highest severity incidents"
          variant="critical"
        />

        <Metric
          icon={<Clock3 size={18} />}
          label="Investigating"
          value={investigatingCount}
          detail="Root cause investigation"
          variant="warning"
        />

        <Metric
          icon={<CheckCircle2 size={18} />}
          label="Resolved"
          value={resolvedCount}
          detail="Successfully resolved"
          variant="success"
        />
      </section>

      <section className={styles.controls}>
        <div className={styles.search}>
          <Search size={16} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search incidents, services..."
          />
        </div>

        <label className={styles.select}>
          <Filter size={14} />

          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option>All</option>
            <option>Critical</option>
            <option>High</option>
            <option>Warning</option>
            <option>Resolved</option>
          </select>
        </label>

        <label className={styles.select}>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>All</option>
            <option>Investigating</option>
            <option>Identified</option>
            <option>Monitoring</option>
            <option>Resolved</option>
          </select>
        </label>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Incident Management</h2>
            <span>
              {filteredIncidents.length} incident
              {filteredIncidents.length !== 1 ? "s" : ""} matching current
              filters
            </span>
          </div>

          <span className={styles.environment}>Production</span>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Incident</span>
            <span>Service</span>
            <span>Severity</span>
            <span>Status</span>
            <span>Started</span>
            <span>Assignee</span>
          </div>

          {filteredIncidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              className={styles.row}
              onClick={() => setSelectedIncident(incident)}
            >
              <span className={styles.incidentInfo}>
                <span
                  className={styles.incidentIcon}
                  style={{
                    color: severityColor[incident.severity],
                    background: `${severityColor[incident.severity]}14`,
                  }}
                >
                  <AlertTriangle size={16} />
                </span>

                <span>
                  <strong>{incident.title}</strong>
                  <small>{incident.id}</small>
                </span>
              </span>

              <span className={styles.service}>{incident.service}</span>

              <span
                className={styles.severity}
                style={{ color: severityColor[incident.severity] }}
              >
                <i
                  style={{
                    background: severityColor[incident.severity],
                  }}
                />
                {incident.severity}
              </span>

              <span className={styles.status}>
                {incident.status}
              </span>

              <span className={styles.muted}>{incident.started}</span>

              <span className={styles.assignee}>
                <UserRound size={13} />
                {incident.assignee}
              </span>
            </button>
          ))}

          {filteredIncidents.length === 0 && (
            <div className={styles.empty}>
              <Search size={22} />
              <strong>No incidents found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Incident Timeline</h2>
              <span>Recent production activity</span>
            </div>
          </div>

          <div className={styles.timeline}>
            <TimelineItem
              color="#ef4444"
              title="Payment API incident detected"
              detail="P95 latency crossed the critical threshold."
              time="12 min ago"
            />

            <TimelineItem
              color="#f97316"
              title="Inventory degradation identified"
              detail="Increased database response time detected."
              time="34 min ago"
            />

            <TimelineItem
              color="#f59e0b"
              title="Redis latency alert"
              detail="Cache operation latency is being monitored."
              time="1 hr ago"
            />

            <TimelineItem
              color="#22c55e"
              title="Authentication incident resolved"
              detail="Error rate returned to normal levels."
              time="3 hrs ago"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Response Overview</h2>
              <span>Current incident response state</span>
            </div>
          </div>

          <div className={styles.responseList}>
            <ResponseRow label="Mean time to acknowledge" value="3m 42s" />
            <ResponseRow label="Mean time to resolve" value="24m 18s" />
            <ResponseRow label="Open incidents" value={`${activeCount}`} />
            <ResponseRow label="Production services impacted" value="3" />
          </div>
        </div>
      </section>

      {selectedIncident && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setSelectedIncident(null)}
          />

          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>
                  {selectedIncident.id}
                </span>

                <h2>{selectedIncident.title}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                aria-label="Close incident details"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={styles.drawerSeverity}
              style={{
                color: severityColor[selectedIncident.severity],
              }}
            >
              <i
                style={{
                  background: severityColor[selectedIncident.severity],
                }}
              />
              {selectedIncident.severity} · {selectedIncident.status}
            </div>

            <div className={styles.drawerDescription}>
              <span>Description</span>
              <p>{selectedIncident.description}</p>
            </div>

            <div className={styles.detailStats}>
              <Detail label="Service" value={selectedIncident.service} />
              <Detail label="Started" value={selectedIncident.started} />
              <Detail label="Duration" value={selectedIncident.duration} />
              <Detail label="Assignee" value={selectedIncident.assignee} />
            </div>

            <div className={styles.drawerSection}>
              <h3>Response timeline</h3>

              <TimelineItem
                color="#ef4444"
                title="Incident detected"
                detail="Monitoring system generated an incident."
                time="12 min ago"
              />

              <TimelineItem
                color="#f97316"
                title="Investigation started"
                detail="Engineering team is investigating the root cause."
                time="10 min ago"
              />

              <TimelineItem
                color="#f59e0b"
                title="Service monitoring active"
                detail="Telemetry and dependency signals are being monitored."
                time="5 min ago"
              />
            </div>

            <div className={styles.drawerActions}>
              <button type="button">Acknowledge</button>
              <button type="button" className={styles.resolveButton}>
                Resolve incident
              </button>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  variant: "critical" | "warning" | "success";
}) {
  return (
    <article className={styles.metric}>
      <div className={`${styles.metricIcon} ${styles[variant]}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function TimelineItem({
  color,
  title,
  detail,
  time,
}: {
  color: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className={styles.timelineItem}>
      <i style={{ background: color }} />

      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>

      <time>{time}</time>
    </div>
  );
}

function ResponseRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.responseRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}