"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Filter,
  Globe2,
  Info,
  LockKeyhole,
  Search,
  Shield,
  User,
  X,
  XCircle,
} from "lucide-react";
import styles from "./page.module.css";

type EventStatus = "Success" | "Failed";
type EventSeverity = "Info" | "Warning" | "Critical";
type EventType =
  | "Authentication"
  | "Access"
  | "Configuration"
  | "Security"
  | "Deployment"
  | "Integration";

type AuditEvent = {
  id: string;
  actor: string;
  email: string;
  initials: string;
  action: string;
  resource: string;
  resourceType: string;
  eventType: EventType;
  status: EventStatus;
  severity: EventSeverity;
  timestamp: string;
  ip: string;
  source: string;
  description: string;
  changes?: {
    field: string;
    from: string;
    to: string;
  }[];
};

const initialEvents: AuditEvent[] = [
  {
    id: "evt-001",
    actor: "Deepak Chouksey",
    email: "deepak@nexus-observe.dev",
    initials: "DC",
    action: "Updated workspace settings",
    resource: "Production Workspace",
    resourceType: "Workspace",
    eventType: "Configuration",
    status: "Success",
    severity: "Info",
    timestamp: "2 minutes ago",
    ip: "103.84.217.42",
    source: "Web Console",
    description:
      "Workspace retention and notification settings were updated.",
    changes: [
      {
        field: "Log retention",
        from: "14 days",
        to: "30 days",
      },
      {
        field: "Incident notifications",
        from: "Disabled",
        to: "Enabled",
      },
    ],
  },
  {
    id: "evt-002",
    actor: "Rahul Sharma",
    email: "rahul@nexus-observe.dev",
    initials: "RS",
    action: "Created API key",
    resource: "Production Backend",
    resourceType: "API Key",
    eventType: "Security",
    status: "Success",
    severity: "Warning",
    timestamp: "18 minutes ago",
    ip: "49.36.128.71",
    source: "Web Console",
    description:
      "A new production API credential was created with telemetry read permissions.",
  },
  {
    id: "evt-003",
    actor: "Priya Verma",
    email: "priya@nexus-observe.dev",
    initials: "PV",
    action: "Acknowledged incident",
    resource: "INC-2841",
    resourceType: "Incident",
    eventType: "Access",
    status: "Success",
    severity: "Info",
    timestamp: "34 minutes ago",
    ip: "117.201.92.18",
    source: "Web Console",
    description:
      "Incident INC-2841 was acknowledged by the assigned engineer.",
  },
  {
    id: "evt-004",
    actor: "System",
    email: "system@nexus-observe.dev",
    initials: "SY",
    action: "Deployment completed",
    resource: "payments-api",
    resourceType: "Deployment",
    eventType: "Deployment",
    status: "Success",
    severity: "Info",
    timestamp: "51 minutes ago",
    ip: "10.42.0.18",
    source: "CI/CD",
    description:
      "Production deployment completed successfully and health checks passed.",
  },
  {
    id: "evt-005",
    actor: "Unknown",
    email: "unknown",
    initials: "??",
    action: "Failed authentication attempt",
    resource: "Workspace Login",
    resourceType: "Authentication",
    eventType: "Authentication",
    status: "Failed",
    severity: "Critical",
    timestamp: "1 hour ago",
    ip: "185.220.101.14",
    source: "Authentication",
    description:
      "Multiple invalid authentication attempts were detected from an external source.",
  },
  {
    id: "evt-006",
    actor: "Arjun Mehta",
    email: "arjun@nexus-observe.dev",
    initials: "AM",
    action: "Updated integration",
    resource: "PagerDuty",
    resourceType: "Integration",
    eventType: "Integration",
    status: "Success",
    severity: "Info",
    timestamp: "2 hours ago",
    ip: "106.51.84.29",
    source: "Web Console",
    description:
      "PagerDuty integration configuration was updated.",
  },
  {
    id: "evt-007",
    actor: "Neha Kapoor",
    email: "neha@nexus-observe.dev",
    initials: "NK",
    action: "Viewed sensitive API key",
    resource: "Production Backend",
    resourceType: "API Key",
    eventType: "Security",
    status: "Success",
    severity: "Warning",
    timestamp: "3 hours ago",
    ip: "122.164.71.53",
    source: "Web Console",
    description:
      "A production API key detail page was accessed.",
  },
  {
    id: "evt-008",
    actor: "Rahul Sharma",
    email: "rahul@nexus-observe.dev",
    initials: "RS",
    action: "Changed member role",
    resource: "Arjun Mehta",
    resourceType: "Team Member",
    eventType: "Access",
    status: "Success",
    severity: "Warning",
    timestamp: "5 hours ago",
    ip: "49.36.128.71",
    source: "Web Console",
    description:
      "Team member permissions were modified.",
    changes: [
      {
        field: "Role",
        from: "Viewer",
        to: "Engineer",
      },
    ],
  },
  {
    id: "evt-009",
    actor: "System",
    email: "system@nexus-observe.dev",
    initials: "SY",
    action: "Alert rule triggered",
    resource: "High API latency",
    resourceType: "Alert",
    eventType: "Security",
    status: "Success",
    severity: "Warning",
    timestamp: "7 hours ago",
    ip: "10.42.0.21",
    source: "Alert Engine",
    description:
      "Alert threshold was exceeded and an incident workflow was initiated.",
  },
  {
    id: "evt-010",
    actor: "Amit Joshi",
    email: "amit@nexus-observe.dev",
    initials: "AJ",
    action: "Attempted restricted action",
    resource: "Billing Settings",
    resourceType: "Settings",
    eventType: "Access",
    status: "Failed",
    severity: "Warning",
    timestamp: "Yesterday",
    ip: "103.92.44.18",
    source: "Web Console",
    description:
      "The requested action was denied because the account does not have sufficient permissions.",
  },
];

const eventTypes: EventType[] = [
  "Authentication",
  "Access",
  "Configuration",
  "Security",
  "Deployment",
  "Integration",
];

export default function AuditLogsPage() {
  const [events] = useState<AuditEvent[]>(initialEvents);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | EventStatus
  >("All");

  const [severityFilter, setSeverityFilter] = useState<
    "All" | EventSeverity
  >("All");

  const [eventTypeFilter, setEventTypeFilter] = useState<
    "All" | EventType
  >("All");

  const [selectedEvent, setSelectedEvent] =
    useState<AuditEvent | null>(null);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.actor.toLowerCase().includes(query) ||
        event.email.toLowerCase().includes(query) ||
        event.action.toLowerCase().includes(query) ||
        event.resource.toLowerCase().includes(query) ||
        event.ip.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        event.status === statusFilter;

      const matchesSeverity =
        severityFilter === "All" ||
        event.severity === severityFilter;

      const matchesEventType =
        eventTypeFilter === "All" ||
        event.eventType === eventTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSeverity &&
        matchesEventType
      );
    });
  }, [
    events,
    search,
    statusFilter,
    severityFilter,
    eventTypeFilter,
  ]);

  const successEvents = events.filter(
    (event) => event.status === "Success",
  ).length;

  const failedEvents = events.filter(
    (event) => event.status === "Failed",
  ).length;

  const securityEvents = events.filter(
    (event) =>
      event.eventType === "Security" ||
      event.eventType === "Authentication",
  ).length;

  const criticalEvents = events.filter(
    (event) => event.severity === "Critical",
  ).length;

  function exportLogs() {
    const rows = filteredEvents.map((event) => ({
      timestamp: event.timestamp,
      actor: event.actor,
      action: event.action,
      resource: event.resource,
      type: event.eventType,
      status: event.status,
      severity: event.severity,
      ip: event.ip,
      source: event.source,
    }));

    const header = Object.keys(rows[0] ?? {}).join(",");
    const body = rows
      .map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const csv = `${header}\n${body}`;

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "nexus-audit-logs.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>
            PLATFORM / SECURITY
          </p>

          <h1>Audit Logs</h1>

          <p className={styles.subtitle}>
            Immutable activity history for workspace, access and
            operational events.
          </p>
        </div>

        <div className={styles.topActions}>
          <div className={styles.retentionBadge}>
            <LockKeyhole size={14} />
            <span>Retention: 90 days</span>
          </div>

          <button
            className={styles.secondaryButton}
            onClick={exportLogs}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      <section className={styles.metricsGrid}>
        <MetricCard
          icon={<FileText size={17} />}
          label="Total events"
          value={String(events.length)}
          detail="Current audit window"
          tone="blue"
        />

        <MetricCard
          icon={<CheckCircle2 size={17} />}
          label="Successful"
          value={String(successEvents)}
          detail="Authorized activity"
          tone="green"
        />

        <MetricCard
          icon={<XCircle size={17} />}
          label="Failed events"
          value={String(failedEvents)}
          detail="Requires review"
          tone="red"
        />

        <MetricCard
          icon={<Shield size={17} />}
          label="Security events"
          value={String(securityEvents)}
          detail={`${criticalEvents} critical`}
          tone="purple"
        />
      </section>

      <section className={styles.securityBanner}>
        <div className={styles.bannerIcon}>
          <Shield size={16} />
        </div>

        <div>
          <strong>Audit trail protection</strong>
          <p>
            Security-sensitive workspace activity is recorded with
            actor, timestamp, source and network information for
            investigation and compliance workflows.
          </p>
        </div>

        <span className={styles.liveIndicator}>
          <i />
          Recording
        </span>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Activity history</h2>
            <span>
              Workspace actions and security-relevant events
            </span>
          </div>

          <span className={styles.eventCount}>
            {filteredEvents.length} events
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={15} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search actor, action, resource or IP..."
            />
          </div>

          <select
            value={eventTypeFilter}
            onChange={(event) =>
              setEventTypeFilter(
                event.target.value as "All" | EventType,
              )
            }
          >
            <option value="All">All event types</option>

            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value as
                  | "All"
                  | EventSeverity,
              )
            }
          >
            <option value="All">All severity</option>
            <option value="Info">Info</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "All" | EventStatus,
              )
            }
          >
            <option value="All">All status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Type</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Timestamp</th>
                <th>Source / IP</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  className={styles.tableRow}
                  onClick={() => setSelectedEvent(event)}
                >
                  <td>
                    <div className={styles.actorCell}>
                      <div className={styles.avatar}>
                        {event.initials}
                      </div>

                      <div>
                        <strong>{event.actor}</strong>
                        <span>{event.email}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className={styles.actionCell}>
                      <strong>{event.action}</strong>
                      <span>{event.description}</span>
                    </div>
                  </td>

                  <td>
                    <div className={styles.resourceCell}>
                      <strong>{event.resource}</strong>
                      <span>{event.resourceType}</span>
                    </div>
                  </td>

                  <td>
                    <span className={styles.typeBadge}>
                      {event.eventType}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={event.status} />
                  </td>

                  <td>
                    <SeverityBadge
                      severity={event.severity}
                    />
                  </td>

                  <td>
                    <span className={styles.timeCell}>
                      <Clock3 size={12} />
                      {event.timestamp}
                    </span>
                  </td>

                  <td>
                    <div className={styles.sourceCell}>
                      <span>{event.source}</span>
                      <code>{event.ip}</code>
                    </div>
                  </td>

                  <td>
                    <button
                      className={styles.rowButton}
                      onClick={(eventClick) => {
                        eventClick.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      aria-label={`View audit event ${event.id}`}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEvents.length === 0 && (
            <div className={styles.emptyState}>
              <Filter size={20} />
              <strong>No audit events found</strong>
              <span>
                Try changing your search or filter criteria.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Security activity</h2>
              <span>
                High-value events requiring visibility
              </span>
            </div>
          </div>

          <div className={styles.securityRows}>
            <SecurityRow
              icon={<LockKeyhole size={14} />}
              label="Authentication events"
              value="24"
              detail="Login and access attempts"
              tone="blue"
            />

            <SecurityRow
              icon={<Shield size={14} />}
              label="Permission changes"
              value="7"
              detail="Role and access updates"
              tone="purple"
            />

            <SecurityRow
              icon={<AlertTriangle size={14} />}
              label="Failed actions"
              value={String(failedEvents)}
              detail="Denied or unsuccessful events"
              tone="red"
            />

            <SecurityRow
              icon={<Globe2 size={14} />}
              label="External sources"
              value="3"
              detail="Unique external IP ranges"
              tone="yellow"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Audit configuration</h2>
              <span>Current workspace logging policy</span>
            </div>
          </div>

          <div className={styles.configList}>
            <ConfigRow
              label="Audit logging"
              value="Enabled"
              status="healthy"
            />

            <ConfigRow
              label="Retention period"
              value="90 days"
              status="healthy"
            />

            <ConfigRow
              label="Actor information"
              value="Captured"
              status="healthy"
            />

            <ConfigRow
              label="Network information"
              value="Captured"
              status="healthy"
            />

            <ConfigRow
              label="Tamper protection"
              value="Enabled"
              status="healthy"
            />
          </div>
        </div>
      </section>

      {selectedEvent && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setSelectedEvent(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <p className={styles.eyebrow}>
                  AUDIT EVENT
                </p>

                <h2>{selectedEvent.action}</h2>

                <span>{selectedEvent.id}</span>
              </div>

              <button
                className={styles.iconButton}
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.drawerStatus}>
                <StatusBadge status={selectedEvent.status} />

                <SeverityBadge
                  severity={selectedEvent.severity}
                />

                <span className={styles.typeBadge}>
                  {selectedEvent.eventType}
                </span>
              </div>

              <div className={styles.detailBlock}>
                <div className={styles.detailTitle}>
                  <Info size={14} />
                  <h3>Event description</h3>
                </div>

                <p className={styles.description}>
                  {selectedEvent.description}
                </p>
              </div>

              <div className={styles.detailBlock}>
                <div className={styles.detailTitle}>
                  <User size={14} />
                  <h3>Actor</h3>
                </div>

                <div className={styles.actorDetail}>
                  <div className={styles.largeAvatar}>
                    {selectedEvent.initials}
                  </div>

                  <div>
                    <strong>{selectedEvent.actor}</strong>
                    <span>{selectedEvent.email}</span>
                  </div>
                </div>
              </div>

              <div className={styles.detailGrid}>
                <DetailItem
                  label="Resource"
                  value={selectedEvent.resource}
                />

                <DetailItem
                  label="Resource type"
                  value={selectedEvent.resourceType}
                />

                <DetailItem
                  label="Timestamp"
                  value={selectedEvent.timestamp}
                />

                <DetailItem
                  label="Source"
                  value={selectedEvent.source}
                />

                <DetailItem
                  label="IP address"
                  value={selectedEvent.ip}
                />

                <DetailItem
                  label="Event ID"
                  value={selectedEvent.id}
                />
              </div>

              {selectedEvent.changes &&
                selectedEvent.changes.length > 0 && (
                  <div className={styles.detailBlock}>
                    <div className={styles.detailTitle}>
                      <Activity size={14} />
                      <h3>Changes</h3>
                    </div>

                    <div className={styles.changeList}>
                      {selectedEvent.changes.map(
                        (change) => (
                          <div
                            className={styles.changeRow}
                            key={change.field}
                          >
                            <span>{change.field}</span>

                            <div>
                              <code>{change.from}</code>
                              <ChevronRight size={13} />
                              <code className={styles.newValue}>
                                {change.to}
                              </code>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div className={styles.rawEvent}>
                <div className={styles.detailTitle}>
                  <FileText size={14} />
                  <h3>Event metadata</h3>
                </div>

                <div className={styles.rawGrid}>
                  <span>event_id</span>
                  <code>{selectedEvent.id}</code>

                  <span>event_type</span>
                  <code>{selectedEvent.eventType}</code>

                  <span>status</span>
                  <code>{selectedEvent.status}</code>

                  <span>source</span>
                  <code>{selectedEvent.source}</code>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "red" | "purple";
}) {
  return (
    <div className={styles.metricCard}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: EventStatus;
}) {
  const className =
    status === "Success"
      ? styles.successStatus
      : styles.failedStatus;

  return (
    <span className={`${styles.statusBadge} ${className}`}>
      <i />
      {status}
    </span>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: EventSeverity;
}) {
  const className =
    severity === "Info"
      ? styles.infoSeverity
      : severity === "Warning"
        ? styles.warningSeverity
        : styles.criticalSeverity;

  return (
    <span className={`${styles.severityBadge} ${className}`}>
      {severity}
    </span>
  );
}

function SecurityRow({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "purple" | "red" | "yellow";
}) {
  return (
    <div className={styles.securityRow}>
      <div className={styles.securityRowMain}>
        <div
          className={`${styles.securityRowIcon} ${styles[tone]}`}
        >
          {icon}
        </div>

        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
        </div>
      </div>

      <strong className={styles.securityRowValue}>
        {value}
      </strong>
    </div>
  );
}

function ConfigRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "healthy";
}) {
  return (
    <div className={styles.configRow}>
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>

      <span className={styles.configStatus}>
        <i />
        {status === "healthy" ? "Healthy" : "Review"}
      </span>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}