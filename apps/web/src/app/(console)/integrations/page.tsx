"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  Github,
  Globe,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Webhook,
  X,
  Zap,
} from "lucide-react";
import styles from "./page.module.css";

type IntegrationStatus = "Connected" | "Available" | "Error";

type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  connectedAt?: string;
  account?: string;
  events: number;
  icon: React.ReactNode;
};

const initialIntegrations: Integration[] = [
  {
    id: "int-001",
    name: "Slack",
    category: "Collaboration",
    description:
      "Send alerts, incidents and reliability notifications to Slack channels.",
    status: "Connected",
    connectedAt: "Aug 18, 2026",
    account: "#engineering-alerts",
    events: 1284,
    icon: <MessageSquare size={19} />,
  },
  {
    id: "int-002",
    name: "GitHub",
    category: "Source Control",
    description:
      "Correlate deployments, commits and pull requests with production telemetry.",
    status: "Connected",
    connectedAt: "Aug 17, 2026",
    account: "nexus-platform",
    events: 946,
    icon: <Github size={19} />,
  },
  {
    id: "int-003",
    name: "PagerDuty",
    category: "Incident Management",
    description:
      "Route critical incidents and escalation events to on-call responders.",
    status: "Connected",
    connectedAt: "Aug 15, 2026",
    account: "Production",
    events: 327,
    icon: <Zap size={19} />,
  },
  {
    id: "int-004",
    name: "AWS",
    category: "Cloud",
    description:
      "Monitor AWS infrastructure, workloads and cloud service health.",
    status: "Connected",
    connectedAt: "Aug 12, 2026",
    account: "production-account",
    events: 4218,
    icon: <Cloud size={19} />,
  },
  {
    id: "int-005",
    name: "PostgreSQL",
    category: "Database",
    description:
      "Collect database health, performance and availability telemetry.",
    status: "Connected",
    connectedAt: "Aug 10, 2026",
    account: "production-db",
    events: 2831,
    icon: <Database size={19} />,
  },
  {
    id: "int-006",
    name: "Microsoft Teams",
    category: "Collaboration",
    description:
      "Deliver observability alerts and incident updates to Teams.",
    status: "Available",
    events: 0,
    icon: <MessageSquare size={19} />,
  },
  {
    id: "int-007",
    name: "Microsoft Azure",
    category: "Cloud",
    description:
      "Connect Azure resources and collect infrastructure telemetry.",
    status: "Available",
    events: 0,
    icon: <Cloud size={19} />,
  },
  {
    id: "int-008",
    name: "Custom Webhook",
    category: "Automation",
    description:
      "Send Nexus Observe events to any HTTP endpoint.",
    status: "Available",
    events: 0,
    icon: <Webhook size={19} />,
  },
  {
    id: "int-009",
    name: "Redis",
    category: "Database",
    description:
      "Monitor Redis availability, memory usage and command performance.",
    status: "Error",
    connectedAt: "Aug 09, 2026",
    account: "cache-production",
    events: 612,
    icon: <Server size={19} />,
  },
];

const categories = [
  "All",
  "Collaboration",
  "Source Control",
  "Incident Management",
  "Cloud",
  "Database",
  "Automation",
];

const statuses = ["All", "Connected", "Available", "Error"];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(initialIntegrations);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Integration | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return integrations.filter((integration) => {
      const matchesSearch =
        !query ||
        integration.name.toLowerCase().includes(query) ||
        integration.category.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query);

      const matchesCategory =
        category === "All" || integration.category === category;

      const matchesStatus =
        status === "All" || integration.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [integrations, search, category, status]);

  const connected = integrations.filter(
    (item) => item.status === "Connected",
  ).length;

  const available = integrations.filter(
    (item) => item.status === "Available",
  ).length;

  const errors = integrations.filter(
    (item) => item.status === "Error",
  ).length;

  const totalEvents = integrations.reduce(
    (sum, item) => sum + item.events,
    0,
  );

  function toggleConnection(id: string) {
    setIntegrations((current) =>
      current.map((item) => {
        if (item.id !== id) return item;

        if (item.status === "Connected") {
          return {
            ...item,
            status: "Available",
            connectedAt: undefined,
            account: undefined,
          };
        }

        return {
          ...item,
          status: "Connected",
          connectedAt: "Aug 24, 2026",
          account: "new-connection",
        };
      }),
    );

    setSelected((current) => {
      if (!current || current.id !== id) return current;

      return current.status === "Connected"
        ? {
            ...current,
            status: "Available",
            connectedAt: undefined,
            account: undefined,
          }
        : {
            ...current,
            status: "Connected",
            connectedAt: "Aug 24, 2026",
            account: "new-connection",
          };
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>PLATFORM / INTEGRATIONS</div>
          <h1>Integrations</h1>
          <p>
            Connect Nexus Observe with your engineering and infrastructure
            ecosystem.
          </p>
        </div>

        <div className={styles.topActions}>
          <button
            className={styles.secondaryButton}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} />
            Add integration
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric
          icon={<ShieldCheck size={17} />}
          label="Connected"
          value={connected}
          detail="Active integrations"
          tone="success"
        />

        <Metric
          icon={<Globe size={17} />}
          label="Available"
          value={available}
          detail="Ready to configure"
          tone="info"
        />

        <Metric
          icon={<Activity size={17} />}
          label="Events processed"
          value={totalEvents.toLocaleString()}
          detail="Across integrations"
          tone="ai"
        />

        <Metric
          icon={<Zap size={17} />}
          label="Attention required"
          value={errors}
          detail="Integration errors"
          tone="critical"
        />
      </section>

      <section className={styles.statusPanel}>
        <div className={styles.statusHeader}>
          <div>
            <h2>Integration health</h2>
            <span>Current connection posture across the platform</span>
          </div>

          <div className={styles.live}>
            <i />
            Connection monitoring active
          </div>
        </div>

        <div className={styles.healthGrid}>
          <HealthItem
            label="Connected"
            value={connected}
            total={integrations.length}
            tone="success"
          />

          <HealthItem
            label="Available"
            value={available}
            total={integrations.length}
            tone="info"
          />

          <HealthItem
            label="Errors"
            value={errors}
            total={integrations.length}
            tone="critical"
          />
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={15} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search integrations..."
          />
        </div>

        <div className={styles.filters}>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item} category
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item} status
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Integration catalog</h2>
            <span>
              {filtered.length} integrations matching current filters
            </span>
          </div>
        </div>

        <div className={styles.integrationGrid}>
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onClick={() => setSelected(integration)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            <Search size={22} />
            <strong>No integrations found</strong>
            <span>Try changing your search or filters.</span>
          </div>
        )}
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent activity</h2>
              <span>Latest integration events</span>
            </div>

            <button className={styles.linkButton}>
              View all
              <ExternalLink size={12} />
            </button>
          </div>

          <div className={styles.activityList}>
            <ActivityItem
              icon={<CheckCircle2 size={14} />}
              title="Slack notification delivered"
              detail="#engineering-alerts"
              time="4 min ago"
              tone="success"
            />

            <ActivityItem
              icon={<Github size={14} />}
              title="GitHub deployment received"
              detail="production / main"
              time="11 min ago"
              tone="info"
            />

            <ActivityItem
              icon={<Zap size={14} />}
              title="PagerDuty incident created"
              detail="INC-2481 · API Gateway"
              time="18 min ago"
              tone="warning"
            />

            <ActivityItem
              icon={<Server size={14} />}
              title="Redis integration failed"
              detail="Connection timeout"
              time="26 min ago"
              tone="critical"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recommended integrations</h2>
              <span>Common production integrations</span>
            </div>
          </div>

          <div className={styles.recommended}>
            <Recommendation
              icon={<MessageSquare size={15} />}
              title="Microsoft Teams"
              detail="Incident notifications"
              onClick={() =>
                setSelected(
                  integrations.find(
                    (item) => item.name === "Microsoft Teams",
                  ) ?? null,
                )
              }
            />

            <Recommendation
              icon={<Cloud size={15} />}
              title="Microsoft Azure"
              detail="Cloud infrastructure"
              onClick={() =>
                setSelected(
                  integrations.find(
                    (item) => item.name === "Microsoft Azure",
                  ) ?? null,
                )
              }
            />

            <Recommendation
              icon={<Webhook size={15} />}
              title="Custom Webhook"
              detail="External automation"
              onClick={() =>
                setSelected(
                  integrations.find(
                    (item) => item.name === "Custom Webhook",
                  ) ?? null,
                )
              }
            />
          </div>
        </div>
      </section>

      {selected && (
        <div
          className={styles.overlay}
          onClick={() => setSelected(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>
                <div
                  className={`${styles.drawerIcon} ${
                    selected.status === "Connected"
                      ? styles.connected
                      : selected.status === "Error"
                        ? styles.error
                        : styles.available
                  }`}
                >
                  {selected.icon}
                </div>

                <div>
                  <span>{selected.category}</span>
                  <h2>{selected.name}</h2>
                </div>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.drawerStatus}>
              <StatusBadge status={selected.status} />

              {selected.account && (
                <span className={styles.accountBadge}>
                  {selected.account}
                </span>
              )}
            </div>

            <div className={styles.detailBlock}>
              <span>Integration</span>
              <p>{selected.description}</p>
            </div>

            <div className={styles.detailGrid}>
              <Detail
                label="Status"
                value={selected.status}
              />

              <Detail
                label="Events"
                value={selected.events.toLocaleString()}
              />

              <Detail
                label="Connected"
                value={selected.connectedAt ?? "Not connected"}
              />

              <Detail
                label="Category"
                value={selected.category}
              />
            </div>

            <div className={styles.configSection}>
              <div className={styles.configHeader}>
                <div>
                  <h3>Configuration</h3>
                  <span>Connection and event settings</span>
                </div>

                <Settings2 size={15} />
              </div>

              <ConfigRow label="Alert events" value="Enabled" />
              <ConfigRow label="Incident events" value="Enabled" />
              <ConfigRow label="Deployment events" value="Enabled" />
              <ConfigRow label="Health checks" value="Enabled" />
            </div>

            <div className={styles.drawerActions}>
              <button
                className={
                  selected.status === "Connected"
                    ? styles.dangerButton
                    : styles.primaryButton
                }
                onClick={() => toggleConnection(selected.id)}
              >
                {selected.status === "Connected" ? (
                  <>
                    Disconnect integration
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Connect integration
                  </>
                )}
              </button>

              <button className={styles.secondaryButton}>
                <Settings2 size={14} />
                Configure
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
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <span>PLATFORM</span>
                <h2>Add integration</h2>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <p className={styles.modalDescription}>
              Select an integration to connect with your Nexus Observe
              workspace.
            </p>

            <div className={styles.integrationOptions}>
              {[
                {
                  name: "Slack",
                  category: "Collaboration",
                  icon: <MessageSquare size={16} />,
                },
                {
                  name: "GitHub",
                  category: "Source Control",
                  icon: <Github size={16} />,
                },
                {
                  name: "PagerDuty",
                  category: "Incident Management",
                  icon: <Zap size={16} />,
                },
                {
                  name: "AWS",
                  category: "Cloud",
                  icon: <Cloud size={16} />,
                },
                {
                  name: "PostgreSQL",
                  category: "Database",
                  icon: <Database size={16} />,
                },
                {
                  name: "Custom Webhook",
                  category: "Automation",
                  icon: <Webhook size={16} />,
                },
              ].map((item) => (
                <button
                  key={item.name}
                  className={styles.integrationOption}
                  onClick={() => {
                    const existing = integrations.find(
                      (integration) => integration.name === item.name,
                    );

                    setShowCreate(false);

                    if (existing) {
                      setSelected(existing);
                    }
                  }}
                >
                  <div className={styles.optionIcon}>{item.icon}</div>

                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.category}</span>
                  </div>

                  <ExternalLink size={13} />
                </button>
              ))}
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
  value: string | number;
  detail: string;
  tone: "success" | "info" | "ai" | "critical";
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

function HealthItem({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "success" | "info" | "critical";
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className={styles.healthItem}>
      <div className={styles.healthTop}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className={styles.healthBar}>
        <div
          className={`${styles.healthFill} ${styles[tone]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <small>{percentage}% of catalog</small>
    </div>
  );
}

function IntegrationCard({
  integration,
  onClick,
}: {
  integration: Integration;
  onClick: () => void;
}) {
  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.cardTop}>
        <div
          className={`${styles.cardIcon} ${
            integration.status === "Connected"
              ? styles.connected
              : integration.status === "Error"
                ? styles.error
                : styles.available
          }`}
        >
          {integration.icon}
        </div>

        <MoreHorizontal
          size={15}
          className={styles.more}
        />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardName}>
          <strong>{integration.name}</strong>
          <StatusBadge status={integration.status} />
        </div>

        <span className={styles.cardCategory}>
          {integration.category}
        </span>

        <p>{integration.description}</p>
      </div>

      <div className={styles.cardFooter}>
        {integration.status === "Connected" ? (
          <>
            <span>{integration.events.toLocaleString()} events</span>
            <span>{integration.account}</span>
          </>
        ) : integration.status === "Error" ? (
          <>
            <span>Connection error</span>
            <span>Review</span>
          </>
        ) : (
          <>
            <span>Not configured</span>
            <span>Connect</span>
          </>
        )}
      </div>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: IntegrationStatus;
}) {
  const className = status.toLowerCase();

  return (
    <span className={`${styles.status} ${styles[className]}`}>
      <i />
      {status}
    </span>
  );
}

function ActivityItem({
  icon,
  title,
  detail,
  time,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  time: string;
  tone: "success" | "info" | "warning" | "critical";
}) {
  return (
    <div className={styles.activityItem}>
      <div className={`${styles.activityIcon} ${styles[tone]}`}>
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>

      <time>{time}</time>
    </div>
  );
}

function Recommendation({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className={styles.recommendation} onClick={onClick}>
      <div className={styles.recommendationIcon}>{icon}</div>

      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>

      <ExternalLink size={13} />
    </button>
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
    <div className={styles.detail}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConfigRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.configRow}>
      <span>{label}</span>
      <div>
        <i />
        {value}
      </div>
    </div>
  );
}