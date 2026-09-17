"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Database,
  Globe,
  Lock,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Shield,
  Users,
  X,
} from "lucide-react";

import styles from "./page.module.css";

type SettingSection =
  | "general"
  | "environment"
  | "retention"
  | "notifications"
  | "security"
  | "access"
  | "telemetry"
  | "danger";

type ToggleProps = {
  checked: boolean;
  onChange: () => void;
};

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleActive : ""}`}
      onClick={onChange}
      aria-label="Toggle setting"
    >
      <span />
    </button>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingSection>("general");

  const [workspaceName, setWorkspaceName] =
    useState("NEXUS Production");

  const [timezone, setTimezone] =
    useState("Asia/Kolkata");

  const [region, setRegion] =
    useState("India Central");

  const [retention, setRetention] =
    useState("30");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [incidentNotifications, setIncidentNotifications] =
    useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const [requireMfa, setRequireMfa] = useState(true);
  const [sessionTimeout, setSessionTimeout] =
    useState("8");

  const [telemetryEnabled, setTelemetryEnabled] =
    useState(true);

  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showDanger, setShowDanger] = useState(false);

  const sections: {
    id: SettingSection;
    label: string;
    description: string;
    icon: typeof SettingsIcon;
  }[] = [
    {
      id: "general",
      label: "General",
      description: "Workspace identity and preferences",
      icon: SettingsIcon,
    },
    {
      id: "environment",
      label: "Environment",
      description: "Region and deployment settings",
      icon: Globe,
    },
    {
      id: "retention",
      label: "Data Retention",
      description: "Telemetry and event storage",
      icon: Database,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Alerts and communication",
      icon: Bell,
    },
    {
      id: "security",
      label: "Security",
      description: "Authentication and sessions",
      icon: Shield,
    },
    {
      id: "access",
      label: "Access Control",
      description: "RBAC and workspace access",
      icon: Users,
    },
    {
      id: "telemetry",
      label: "Telemetry",
      description: "Ingestion and observability",
      icon: Database,
    },
    {
      id: "danger",
      label: "Danger Zone",
      description: "Destructive workspace actions",
      icon: AlertTriangle,
    },
  ];

  const handleSave = () => {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const handleReset = () => {
    setWorkspaceName("NEXUS Production");
    setTimezone("Asia/Kolkata");
    setRegion("India Central");
    setRetention("30");

    setEmailAlerts(true);
    setIncidentNotifications(true);
    setWeeklyReports(false);
    setSecurityAlerts(true);

    setRequireMfa(true);
    setSessionTimeout("8");
    setTelemetryEnabled(true);

    setShowReset(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>PLATFORM</div>

          <h1>Settings</h1>

          <p>
            Configure workspace, security, telemetry and
            platform preferences.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setShowReset(true)}
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
          >
            <Save size={16} />

            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </header>

      {saved && (
        <div className={styles.saveBanner}>
          <Check size={17} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <div className={styles.layout}>
        <aside className={styles.settingsNav}>
          <div className={styles.navTitle}>SETTINGS</div>

          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={section.id}
                type="button"
                className={`${styles.navItem} ${
                  activeSection === section.id
                    ? styles.navItemActive
                    : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className={styles.navIcon}>
                  <Icon size={17} />
                </span>

                <span className={styles.navContent}>
                  <strong>{section.label}</strong>
                  <small>{section.description}</small>
                </span>

                <ChevronRight
                  size={15}
                  className={styles.navArrow}
                />
              </button>
            );
          })}
        </aside>

        <main className={styles.content}>
          {activeSection === "general" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>General Settings</h2>
                  <p>
                    Manage your workspace identity and regional
                    preferences.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Workspace Name</label>

                  <input
                    value={workspaceName}
                    onChange={(event) =>
                      setWorkspaceName(event.target.value)
                    }
                  />

                  <span>
                    The name displayed across the NEXUS console.
                  </span>
                </div>

                <div className={styles.field}>
                  <label>Workspace ID</label>

                  <div className={styles.readOnly}>
                    nexus-prod-7f42
                  </div>

                  <span>
                    Workspace IDs cannot be modified.
                  </span>
                </div>

                <div className={styles.field}>
                  <label>Timezone</label>

                  <select
                    value={timezone}
                    onChange={(event) =>
                      setTimezone(event.target.value)
                    }
                  >
                    <option value="Asia/Kolkata">
                      Asia/Kolkata
                    </option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">
                      America/New_York
                    </option>
                    <option value="Europe/London">
                      Europe/London
                    </option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Default Language</label>

                  <select defaultValue="English">
                    <option>English</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeSection === "environment" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Environment & Region</h2>
                  <p>
                    Configure where your observability data is
                    processed.
                  </p>
                </div>
              </div>

              <div className={styles.environmentCard}>
                <div className={styles.environmentIcon}>
                  <Globe size={22} />
                </div>

                <div>
                  <strong>Production Environment</strong>
                  <p>
                    Primary environment for production telemetry.
                  </p>
                </div>

                <span className={styles.statusActive}>
                  Active
                </span>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Primary Region</label>

                  <select
                    value={region}
                    onChange={(event) =>
                      setRegion(event.target.value)
                    }
                  >
                    <option>India Central</option>
                    <option>US East</option>
                    <option>Europe West</option>
                    <option>Asia Pacific</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Environment</label>

                  <select defaultValue="Production">
                    <option>Production</option>
                    <option>Staging</option>
                    <option>Development</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeSection === "retention" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Data Retention</h2>
                  <p>
                    Control how long observability data remains
                    available.
                  </p>
                </div>
              </div>

              <div className={styles.retentionSummary}>
                <Database size={21} />

                <div>
                  <strong>Current retention policy</strong>

                  <p>
                    Telemetry data is retained for{" "}
                    <strong>{retention} days</strong>.
                  </p>
                </div>
              </div>

              <div className={styles.field}>
                <label>Telemetry Retention</label>

                <select
                  value={retention}
                  onChange={(event) =>
                    setRetention(event.target.value)
                  }
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>

                <span>
                  Longer retention may increase storage
                  requirements.
                </span>
              </div>

              <div className={styles.infoGrid}>
                <div>
                  <span>Metrics</span>
                  <strong>{retention} days</strong>
                </div>

                <div>
                  <span>Logs</span>
                  <strong>{retention} days</strong>
                </div>

                <div>
                  <span>Traces</span>
                  <strong>14 days</strong>
                </div>
              </div>
            </section>
          )}

          {activeSection === "notifications" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Notifications</h2>
                  <p>
                    Decide which platform events should notify
                    your team.
                  </p>
                </div>
              </div>

              <div className={styles.settingList}>
                <div className={styles.settingRow}>
                  <div>
                    <strong>Email Notifications</strong>
                    <p>
                      Receive important platform notifications
                      by email.
                    </p>
                  </div>

                  <Toggle
                    checked={emailAlerts}
                    onChange={() =>
                      setEmailAlerts(!emailAlerts)
                    }
                  />
                </div>

                <div className={styles.settingRow}>
                  <div>
                    <strong>Incident Notifications</strong>
                    <p>
                      Notify responders when incidents are
                      created or escalated.
                    </p>
                  </div>

                  <Toggle
                    checked={incidentNotifications}
                    onChange={() =>
                      setIncidentNotifications(
                        !incidentNotifications,
                      )
                    }
                  />
                </div>

                <div className={styles.settingRow}>
                  <div>
                    <strong>Weekly Reports</strong>
                    <p>
                      Send weekly reliability and availability
                      summaries.
                    </p>
                  </div>

                  <Toggle
                    checked={weeklyReports}
                    onChange={() =>
                      setWeeklyReports(!weeklyReports)
                    }
                  />
                </div>

                <div className={styles.settingRow}>
                  <div>
                    <strong>Security Alerts</strong>
                    <p>
                      Notify workspace administrators about
                      security events.
                    </p>
                  </div>

                  <Toggle
                    checked={securityAlerts}
                    onChange={() =>
                      setSecurityAlerts(!securityAlerts)
                    }
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === "security" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Security</h2>
                  <p>
                    Configure authentication and workspace
                    session policies.
                  </p>
                </div>
              </div>

              <div className={styles.securityBanner}>
                <div className={styles.securityIcon}>
                  <Lock size={19} />
                </div>

                <div>
                  <strong>Security posture: Strong</strong>
                  <p>
                    MFA enforcement is enabled for privileged
                    workspace members.
                  </p>
                </div>
              </div>

              <div className={styles.settingList}>
                <div className={styles.settingRow}>
                  <div>
                    <strong>Require MFA</strong>
                    <p>
                      Require multi-factor authentication for
                      workspace users.
                    </p>
                  </div>

                  <Toggle
                    checked={requireMfa}
                    onChange={() =>
                      setRequireMfa(!requireMfa)
                    }
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Session Timeout</label>

                <select
                  value={sessionTimeout}
                  onChange={(event) =>
                    setSessionTimeout(event.target.value)
                  }
                >
                  <option value="1">1 hour</option>
                  <option value="4">4 hours</option>
                  <option value="8">8 hours</option>
                  <option value="24">24 hours</option>
                </select>
              </div>
            </section>
          )}

          {activeSection === "access" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Access Control</h2>
                  <p>
                    Manage workspace permissions and role-based
                    access.
                  </p>
                </div>
              </div>

              <div className={styles.roleGrid}>
                <div>
                  <strong>Owner</strong>
                  <span>1 member</span>
                </div>

                <div>
                  <strong>Admin</strong>
                  <span>3 members</span>
                </div>

                <div>
                  <strong>Engineer</strong>
                  <span>12 members</span>
                </div>

                <div>
                  <strong>Viewer</strong>
                  <span>8 members</span>
                </div>
              </div>

              <div className={styles.accessNotice}>
                <Users size={18} />

                <div>
                  <strong>
                    Manage members from Team
                  </strong>

                  <p>
                    Use the Team section to invite members,
                    modify roles and manage workspace access.
                  </p>
                </div>

                <ChevronRight size={17} />
              </div>
            </section>
          )}

          {activeSection === "telemetry" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Telemetry</h2>
                  <p>
                    Configure telemetry ingestion and
                    observability data collection.
                  </p>
                </div>
              </div>

              <div className={styles.telemetryEndpoint}>
                <span>OTLP Endpoint</span>

                <code>
                  https://ingest.nexus-observe.internal/v1
                </code>
              </div>

              <div className={styles.settingList}>
                <div className={styles.settingRow}>
                  <div>
                    <strong>Telemetry Ingestion</strong>
                    <p>
                      Accept metrics, logs and traces from
                      registered services.
                    </p>
                  </div>

                  <Toggle
                    checked={telemetryEnabled}
                    onChange={() =>
                      setTelemetryEnabled(!telemetryEnabled)
                    }
                  />
                </div>
              </div>

              <div className={styles.telemetryStats}>
                <div>
                  <span>Services Reporting</span>
                  <strong>42</strong>
                </div>

                <div>
                  <span>Events / min</span>
                  <strong>18.4K</strong>
                </div>

                <div>
                  <span>Ingestion Health</span>
                  <strong>99.98%</strong>
                </div>
              </div>
            </section>
          )}

          {activeSection === "danger" && (
            <section
              className={`${styles.panel} ${styles.dangerPanel}`}
            >
              <div className={styles.panelHeader}>
                <div>
                  <h2>Danger Zone</h2>
                  <p>
                    These actions can permanently affect your
                    workspace.
                  </p>
                </div>
              </div>

              <div className={styles.dangerRow}>
                <div>
                  <strong>Delete Workspace</strong>
                  <p>
                    Permanently delete this workspace and all
                    associated observability data.
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => setShowDanger(true)}
                >
                  Delete Workspace
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {showReset && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowReset(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Reset settings?</h3>
                <p>
                  All unsaved changes will be reverted.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowReset(false)}
                className={styles.closeButton}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowReset(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleReset}
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showDanger && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowDanger(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.dangerModalIcon}>
              <AlertTriangle size={22} />
            </div>

            <h3>Delete workspace?</h3>

            <p className={styles.modalWarning}>
              This action is permanent and cannot be undone.
              All workspace data, configurations and telemetry
              history will be removed.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowDanger(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => setShowDanger(false)}
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}