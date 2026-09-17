"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import styles from "./page.module.css";

type KeyStatus = "Active" | "Revoked";
type Environment = "Production" | "Staging" | "Development";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  secret: string;
  status: KeyStatus;
  environment: Environment;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
  createdBy: string;
  requests: string;
};

const initialKeys: ApiKey[] = [
  {
    id: "key-1",
    name: "Production Backend",
    prefix: "nx_live_7f3a",
    secret: "nx_live_7f3a8d91b2c4e6f8",
    status: "Active",
    environment: "Production",
    scopes: ["metrics:read", "logs:read", "traces:read"],
    createdAt: "Aug 18, 2026",
    lastUsed: "2 minutes ago",
    createdBy: "Deepak Chouksey",
    requests: "1.82M",
  },
  {
    id: "key-2",
    name: "Staging Telemetry",
    prefix: "nx_test_42ab",
    secret: "nx_test_42ab91cd38ef20a1",
    status: "Active",
    environment: "Staging",
    scopes: ["metrics:read", "logs:read"],
    createdAt: "Aug 12, 2026",
    lastUsed: "18 minutes ago",
    createdBy: "Platform Team",
    requests: "486K",
  },
  {
    id: "key-3",
    name: "Developer Local",
    prefix: "nx_dev_b91c",
    secret: "nx_dev_b91c73d8a12f4c91",
    status: "Active",
    environment: "Development",
    scopes: ["metrics:read", "services:read"],
    createdAt: "Aug 04, 2026",
    lastUsed: "1 hour ago",
    createdBy: "Rahul Sharma",
    requests: "92K",
  },
  {
    id: "key-4",
    name: "CI Deployment",
    prefix: "nx_live_d82e",
    secret: "nx_live_d82e71ab92cd4f63",
    status: "Active",
    environment: "Production",
    scopes: ["deployments:write", "services:read"],
    createdAt: "Jul 27, 2026",
    lastUsed: "3 hours ago",
    createdBy: "DevOps",
    requests: "214K",
  },
  {
    id: "key-5",
    name: "Legacy Monitoring",
    prefix: "nx_live_19de",
    secret: "nx_live_19de83ac91ef27b4",
    status: "Revoked",
    environment: "Production",
    scopes: ["metrics:read", "logs:read"],
    createdAt: "Jun 18, 2026",
    lastUsed: "Jun 30, 2026",
    createdBy: "Platform Team",
    requests: "71K",
  },
];

const availableScopes = [
  "metrics:read",
  "logs:read",
  "traces:read",
  "services:read",
  "deployments:write",
  "incidents:write",
  "alerts:write",
];

const environmentOptions: Environment[] = [
  "Production",
  "Staging",
  "Development",
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | KeyStatus>("All");
  const [environmentFilter, setEnvironmentFilter] = useState<
    "All" | Environment
  >("All");

  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const [newKeyName, setNewKeyName] = useState("");
  const [newEnvironment, setNewEnvironment] =
    useState<Environment>("Production");
  const [newScopes, setNewScopes] = useState<string[]>([
    "metrics:read",
    "logs:read",
  ]);

  const filteredKeys = useMemo(() => {
    const query = search.trim().toLowerCase();

    return keys.filter((key) => {
      const matchesSearch =
        !query ||
        key.name.toLowerCase().includes(query) ||
        key.prefix.toLowerCase().includes(query) ||
        key.createdBy.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || key.status === statusFilter;

      const matchesEnvironment =
        environmentFilter === "All" ||
        key.environment === environmentFilter;

      return matchesSearch && matchesStatus && matchesEnvironment;
    });
  }, [keys, search, statusFilter, environmentFilter]);

  const activeKeys = keys.filter((key) => key.status === "Active").length;
  const revokedKeys = keys.filter((key) => key.status === "Revoked").length;

  const totalRequests = "2.69M";

  function toggleScope(scope: string) {
    setNewScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  }

  function createKey() {
    if (!newKeyName.trim() || newScopes.length === 0) {
      return;
    }

    const randomPart = Math.random().toString(36).slice(2, 10);

    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      prefix: `nx_${newEnvironment === "Production" ? "live" : "test"}_${randomPart}`,
      secret: `nx_${newEnvironment === "Production" ? "live" : "test"}_${randomPart}${Math.random().toString(36).slice(2, 12)}`,
      status: "Active",
      environment: newEnvironment,
      scopes: newScopes,
      createdAt: "Just now",
      lastUsed: "Never",
      createdBy: "Deepak Chouksey",
      requests: "0",
    };

    setKeys((current) => [newKey, ...current]);
    setSelectedKey(newKey);
    setShowCreateModal(false);
    setNewKeyName("");
    setNewEnvironment("Production");
    setNewScopes(["metrics:read", "logs:read"]);
    setShowSecret(true);
  }

  function revokeKey() {
    if (!keyToRevoke) return;

    setKeys((current) =>
      current.map((key) =>
        key.id === keyToRevoke.id
          ? { ...key, status: "Revoked" }
          : key,
      ),
    );

    if (selectedKey?.id === keyToRevoke.id) {
      setSelectedKey({
        ...keyToRevoke,
        status: "Revoked",
      });
    }

    setShowRevokeModal(false);
    setKeyToRevoke(null);
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>PLATFORM / SECURITY</p>
          <h1>API Keys</h1>
          <p className={styles.subtitle}>
            Manage credentials used to send telemetry and access NEXUS APIs.
          </p>
        </div>

        <div className={styles.topActions}>
          <div className={styles.securityBadge}>
            <Shield size={14} />
            <span>Security controls enabled</span>
          </div>

          <button
            className={styles.primaryButton}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            Create API key
          </button>
        </div>
      </header>

      <section className={styles.metricsGrid}>
        <MetricCard
          icon={<KeyRound size={17} />}
          label="Total API keys"
          value={String(keys.length)}
          detail={`${activeKeys} active`}
          tone="blue"
        />

        <MetricCard
          icon={<Activity size={17} />}
          label="Active keys"
          value={String(activeKeys)}
          detail="Currently authorized"
          tone="green"
        />

        <MetricCard
          icon={<Shield size={17} />}
          label="Revoked keys"
          value={String(revokedKeys)}
          detail="Access disabled"
          tone="red"
        />

        <MetricCard
          icon={<Clock3 size={17} />}
          label="API requests"
          value={totalRequests}
          detail="Last 30 days"
          tone="purple"
        />
      </section>

      <section className={styles.securityNotice}>
        <div className={styles.noticeIcon}>
          <AlertTriangle size={17} />
        </div>

        <div>
          <strong>Protect your API credentials</strong>
          <p>
            API keys provide direct access to your observability environment.
            Store them securely, rotate them regularly, and revoke credentials
            immediately if they are exposed.
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>API key inventory</h2>
            <span>Credentials currently configured for this workspace</span>
          </div>

          <span className={styles.inventoryCount}>
            {filteredKeys.length} of {keys.length}
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search keys, prefixes, or owners..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "All" | KeyStatus)
            }
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Revoked">Revoked</option>
          </select>

          <select
            value={environmentFilter}
            onChange={(event) =>
              setEnvironmentFilter(
                event.target.value as "All" | Environment,
              )
            }
          >
            <option value="All">All environments</option>
            {environmentOptions.map((environment) => (
              <option key={environment} value={environment}>
                {environment}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>API key</th>
                <th>Status</th>
                <th>Environment</th>
                <th>Permissions</th>
                <th>Last used</th>
                <th>Created</th>
                <th>Requests</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filteredKeys.map((key) => (
                <tr
                  key={key.id}
                  className={styles.tableRow}
                  onClick={() => {
                    setSelectedKey(key);
                    setShowSecret(false);
                  }}
                >
                  <td>
                    <div className={styles.keyCell}>
                      <div className={styles.keyIcon}>
                        <KeyRound size={15} />
                      </div>

                      <div>
                        <strong>{key.name}</strong>
                        <span>{key.prefix}••••••••</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <StatusBadge status={key.status} />
                  </td>

                  <td>
                    <EnvironmentBadge environment={key.environment} />
                  </td>

                  <td>
                    <div className={styles.scopeList}>
                      {key.scopes.slice(0, 2).map((scope) => (
                        <span key={scope}>{scope}</span>
                      ))}

                      {key.scopes.length > 2 && (
                        <span>+{key.scopes.length - 2}</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className={styles.mutedCell}>{key.lastUsed}</span>
                  </td>

                  <td>
                    <span className={styles.mutedCell}>{key.createdAt}</span>
                  </td>

                  <td>
                    <strong className={styles.requestValue}>
                      {key.requests}
                    </strong>
                  </td>

                  <td>
                    <button
                      className={styles.rowButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedKey(key);
                        setShowSecret(false);
                      }}
                      aria-label={`View ${key.name}`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredKeys.length === 0 && (
            <div className={styles.emptyState}>
              <Search size={20} />
              <strong>No API keys found</strong>
              <span>Try changing your search or filter.</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Key security posture</h2>
              <span>Workspace credential hygiene</span>
            </div>
          </div>

          <div className={styles.securityRows}>
            <SecurityRow
              label="Production keys"
              value={`${keys.filter((key) => key.environment === "Production").length}`}
              detail="Require rotation"
              status="Review"
            />

            <SecurityRow
              label="Keys used recently"
              value="4"
              detail="Active within 24h"
              status="Healthy"
            />

            <SecurityRow
              label="Revoked credentials"
              value={String(revokedKeys)}
              detail="No access remaining"
              status="Healthy"
            />

            <SecurityRow
              label="Broad permission keys"
              value="1"
              detail="3+ scopes assigned"
              status="Review"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Recommended practice</h2>
              <span>Keep API access tightly scoped</span>
            </div>
          </div>

          <div className={styles.practiceList}>
            <PracticeItem
              title="Use environment-specific keys"
              detail="Separate production, staging, and development credentials."
            />

            <PracticeItem
              title="Apply least privilege"
              detail="Grant only the scopes required by the workload."
            />

            <PracticeItem
              title="Rotate credentials"
              detail="Replace long-lived production credentials regularly."
            />
          </div>
        </div>
      </section>

      {selectedKey && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setSelectedKey(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <p className={styles.eyebrow}>API CREDENTIAL</p>
                <h2>{selectedKey.name}</h2>
              </div>

              <button
                className={styles.iconButton}
                onClick={() => setSelectedKey(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.drawerStatus}>
                <StatusBadge status={selectedKey.status} />
                <EnvironmentBadge environment={selectedKey.environment} />
              </div>

              <div className={styles.secretSection}>
                <div className={styles.sectionLabel}>
                  <span>Secret</span>
                  <small>Keep this value private</small>
                </div>

                <div className={styles.secretBox}>
                  <code>
                    {showSecret
                      ? selectedKey.secret
                      : `${selectedKey.prefix}••••••••••••`}
                  </code>

                  <div className={styles.secretActions}>
                    <button
                      onClick={() => setShowSecret((value) => !value)}
                      title={showSecret ? "Hide secret" : "Show secret"}
                    >
                      {showSecret ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>

                    <button
                      onClick={() => copySecret(selectedKey.secret)}
                      title="Copy secret"
                    >
                      {copied ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {copied && (
                  <span className={styles.copiedText}>Copied to clipboard</span>
                )}
              </div>

              <div className={styles.detailSection}>
                <h3>Permissions</h3>

                <div className={styles.drawerScopes}>
                  {selectedKey.scopes.map((scope) => (
                    <span key={scope}>{scope}</span>
                  ))}
                </div>
              </div>

              <div className={styles.detailGrid}>
                <DetailItem
                  icon={<Calendar size={15} />}
                  label="Created"
                  value={selectedKey.createdAt}
                />

                <DetailItem
                  icon={<Clock3 size={15} />}
                  label="Last used"
                  value={selectedKey.lastUsed}
                />

                <DetailItem
                  icon={<Activity size={15} />}
                  label="Requests"
                  value={selectedKey.requests}
                />

                <DetailItem
                  icon={<Shield size={15} />}
                  label="Created by"
                  value={selectedKey.createdBy}
                />
              </div>

              {selectedKey.status === "Active" && (
                <button
                  className={styles.revokeButton}
                  onClick={() => {
                    setKeyToRevoke(selectedKey);
                    setShowRevokeModal(true);
                  }}
                >
                  <Trash2 size={15} />
                  Revoke API key
                </button>
              )}

              {selectedKey.status === "Revoked" && (
                <div className={styles.revokedNotice}>
                  <AlertTriangle size={16} />
                  <div>
                    <strong>This key has been revoked.</strong>
                    <span>
                      It can no longer authenticate API requests.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {showCreateModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>NEW CREDENTIAL</p>
                <h2>Create API key</h2>
                <p>
                  Create a scoped credential for an application or service.
                </p>
              </div>

              <button
                className={styles.iconButton}
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.form}>
              <label>
                <span>Key name</span>
                <input
                  value={newKeyName}
                  onChange={(event) => setNewKeyName(event.target.value)}
                  placeholder="e.g. Production Backend"
                />
              </label>

              <label>
                <span>Environment</span>
                <select
                  value={newEnvironment}
                  onChange={(event) =>
                    setNewEnvironment(event.target.value as Environment)
                  }
                >
                  {environmentOptions.map((environment) => (
                    <option key={environment} value={environment}>
                      {environment}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className={styles.formLabel}>
                  <span>Permissions / scopes</span>
                  <small>{newScopes.length} selected</small>
                </div>

                <div className={styles.scopePicker}>
                  {availableScopes.map((scope) => {
                    const selected = newScopes.includes(scope);

                    return (
                      <button
                        type="button"
                        key={scope}
                        className={
                          selected
                            ? styles.scopeOptionSelected
                            : styles.scopeOption
                        }
                        onClick={() => toggleScope(scope)}
                      >
                        <span>{scope}</span>
                        {selected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>

              <button
                className={styles.primaryButton}
                disabled={!newKeyName.trim() || newScopes.length === 0}
                onClick={createKey}
              >
                <Plus size={15} />
                Create key
              </button>
            </div>
          </div>
        </div>
      )}

      {showRevokeModal && keyToRevoke && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowRevokeModal(false)}
        >
          <div
            className={styles.confirmModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.dangerIcon}>
              <AlertTriangle size={19} />
            </div>

            <h2>Revoke API key?</h2>

            <p>
              <strong>{keyToRevoke.name}</strong> will immediately lose API
              access. Applications using this credential will receive
              authentication errors.
            </p>

            <div className={styles.confirmActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowRevokeModal(false)}
              >
                Cancel
              </button>

              <button className={styles.dangerButton} onClick={revokeKey}>
                <Trash2 size={15} />
                Revoke key
              </button>
            </div>
          </div>
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
      <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: KeyStatus }) {
  return (
    <span
      className={`${styles.statusBadge} ${
        status === "Active" ? styles.activeStatus : styles.revokedStatus
      }`}
    >
      <i />
      {status}
    </span>
  );
}

function EnvironmentBadge({ environment }: { environment: Environment }) {
  return (
    <span className={styles.environmentBadge}>
      {environment}
    </span>
  );
}

function SecurityRow({
  label,
  value,
  detail,
  status,
}: {
  label: string;
  value: string;
  detail: string;
  status: "Healthy" | "Review";
}) {
  return (
    <div className={styles.securityRow}>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>

      <div className={styles.securityValue}>
        <strong>{value}</strong>
        <span
          className={
            status === "Healthy"
              ? styles.healthyText
              : styles.reviewText
          }
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function PracticeItem({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className={styles.practiceItem}>
      <div className={styles.practiceIcon}>
        <Check size={14} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailIcon}>{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}