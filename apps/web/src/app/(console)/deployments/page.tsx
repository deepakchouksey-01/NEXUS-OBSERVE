"use client";

import {
  Activity,
  CheckCircle2,
  Clock3,
  GitCommit,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./page.module.css";

type DeploymentStatus = "Successful" | "Failed" | "In Progress";

type Deployment = {
  id: string;
  service: string;
  version: string;
  commit: string;
  environment: "Production" | "Staging" | "Development";
  status: DeploymentStatus;
  duration: string;
  deployedBy: string;
  time: string;
  changes: number;
};

const deployments: Deployment[] = [
  {
    id: "DEP-1048",
    service: "Payments API",
    version: "v2.8.4",
    commit: "a82f91c",
    environment: "Production",
    status: "Successful",
    duration: "3m 42s",
    deployedBy: "Arjun Mehta",
    time: "8 min ago",
    changes: 14,
  },
  {
    id: "DEP-1047",
    service: "Order Service",
    version: "v3.1.2",
    commit: "7bc42de",
    environment: "Production",
    status: "Successful",
    duration: "2m 18s",
    deployedBy: "Priya Shah",
    time: "31 min ago",
    changes: 8,
  },
  {
    id: "DEP-1046",
    service: "Inventory Service",
    version: "v1.9.7",
    commit: "91d4a20",
    environment: "Production",
    status: "Failed",
    duration: "1m 06s",
    deployedBy: "Rahul Verma",
    time: "1 hr ago",
    changes: 21,
  },
  {
    id: "DEP-1045",
    service: "Authentication",
    version: "v4.2.1",
    commit: "c31be87",
    environment: "Staging",
    status: "Successful",
    duration: "2m 51s",
    deployedBy: "Arjun Mehta",
    time: "2 hr ago",
    changes: 11,
  },
  {
    id: "DEP-1044",
    service: "API Gateway",
    version: "v5.0.3",
    commit: "e82ad19",
    environment: "Production",
    status: "Successful",
    duration: "4m 12s",
    deployedBy: "Neha Joshi",
    time: "3 hr ago",
    changes: 17,
  },
  {
    id: "DEP-1043",
    service: "Notification Service",
    version: "v2.4.8",
    commit: "f72cd11",
    environment: "Development",
    status: "In Progress",
    duration: "1m 54s",
    deployedBy: "Vikram Singh",
    time: "4 hr ago",
    changes: 6,
  },
  {
    id: "DEP-1042",
    service: "Redis Cache",
    version: "v1.6.5",
    commit: "bc91fa2",
    environment: "Production",
    status: "Successful",
    duration: "1m 32s",
    deployedBy: "Priya Shah",
    time: "5 hr ago",
    changes: 5,
  },
  {
    id: "DEP-1041",
    service: "Web Console",
    version: "v6.3.0",
    commit: "d72ea91",
    environment: "Staging",
    status: "Successful",
    duration: "3m 08s",
    deployedBy: "Neha Joshi",
    time: "6 hr ago",
    changes: 23,
  },
];

const statusColor: Record<DeploymentStatus, string> = {
  Successful: "#22c55e",
  Failed: "#ef4444",
  "In Progress": "#38bdf8",
};

function StatusIcon({ status }: { status: DeploymentStatus }) {
  if (status === "Successful") {
    return <CheckCircle2 size={14} />;
  }

  if (status === "Failed") {
    return <XCircle size={14} />;
  }

  return <Activity size={14} />;
}

export default function DeploymentsPage() {
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState("All environments");
  const [status, setStatus] = useState("All statuses");
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const filteredDeployments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deployments.filter((deployment) => {
      const matchesSearch =
        !query ||
        deployment.service.toLowerCase().includes(query) ||
        deployment.version.toLowerCase().includes(query) ||
        deployment.commit.toLowerCase().includes(query) ||
        deployment.deployedBy.toLowerCase().includes(query) ||
        deployment.id.toLowerCase().includes(query);

      const matchesEnvironment =
        environment === "All environments" ||
        deployment.environment === environment;

      const matchesStatus =
        status === "All statuses" || deployment.status === status;

      return matchesSearch && matchesEnvironment && matchesStatus;
    });
  }, [search, environment, status]);

  const successful = deployments.filter(
    (deployment) => deployment.status === "Successful",
  ).length;

  const failed = deployments.filter(
    (deployment) => deployment.status === "Failed",
  ).length;

  const inProgress = deployments.filter(
    (deployment) => deployment.status === "In Progress",
  ).length;

  const successRate = Math.round(
    (successful / (successful + failed)) * 100,
  );

  const refresh = () => {
    setRefreshing(true);

    window.setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const rollback = () => {
    setRollingBack(true);

    window.setTimeout(() => {
      setRollingBack(false);
      setSelectedDeployment(null);
    }, 1000);
  };

  return (
    <main className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            UNDERSTAND <span>/</span> DEPLOYMENTS
          </div>

          <h1>Deployments</h1>

          <p>
            Track application releases, deployment health and production
            changes across your environment.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refresh}
          >
            <RefreshCw
              size={14}
              className={refreshing ? styles.spin : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* SUMMARY */}
      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.blue}`}>
            <Package size={18} />
          </div>

          <div>
            <span>Total Deployments</span>
            <strong>{deployments.length}</strong>
            <small>Across all environments</small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.green}`}>
            <CheckCircle2 size={18} />
          </div>

          <div>
            <span>Success Rate</span>
            <strong>{successRate}%</strong>
            <small>{successful} successful deployments</small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.red}`}>
            <XCircle size={18} />
          </div>

          <div>
            <span>Failed</span>
            <strong>{failed}</strong>
            <small>Requires investigation</small>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.cyan}`}>
            <Activity size={18} />
          </div>

          <div>
            <span>In Progress</span>
            <strong>{inProgress}</strong>
            <small>Currently running</small>
          </div>
        </article>
      </section>

      {/* CURRENT DEPLOYMENT */}
      <section className={styles.currentDeployment}>
        <div className={styles.currentIcon}>
          <RocketIcon />
        </div>

        <div className={styles.currentContent}>
          <div className={styles.currentTop}>
            <span>ACTIVE PRODUCTION DEPLOYMENT</span>

            <b>
              <i />
              Deploying
            </b>
          </div>

          <strong>Payments API · v2.8.4</strong>

          <p>
            Deployment DEP-1048 completed successfully and is serving
            production traffic.
          </p>
        </div>

        <div className={styles.currentStats}>
          <div>
            <span>Duration</span>
            <strong>3m 42s</strong>
          </div>

          <div>
            <span>Changes</span>
            <strong>14</strong>
          </div>

          <div>
            <span>Environment</span>
            <strong>Production</strong>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={15} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search deployments..."
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <label className={styles.filter}>
            <span>Environment</span>

            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
            >
              <option>All environments</option>
              <option>Production</option>
              <option>Staging</option>
              <option>Development</option>
            </select>
          </label>

          <label className={styles.filter}>
            <span>Status</span>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>All statuses</option>
              <option>Successful</option>
              <option>Failed</option>
              <option>In Progress</option>
            </select>
          </label>
        </div>
      </section>

      {/* DEPLOYMENT TABLE */}
      <section className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Deployment History</h2>
            <span>
              {filteredDeployments.length} deployment
              {filteredDeployments.length === 1 ? "" : "s"} shown
            </span>
          </div>

          <div className={styles.liveStatus}>
            <i />
            Live updates
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Deployment</th>
                <th>Service</th>
                <th>Version</th>
                <th>Environment</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Deployed By</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {filteredDeployments.map((deployment) => (
                <tr
                  key={deployment.id}
                  onClick={() => setSelectedDeployment(deployment)}
                >
                  <td>
                    <div className={styles.deploymentId}>
                      <GitCommit size={14} />
                      <div>
                        <strong>{deployment.id}</strong>
                        <small>{deployment.commit}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className={styles.serviceName}>
                      <span className={styles.serviceIcon}>
                        <Server size={14} />
                      </span>
                      <strong>{deployment.service}</strong>
                    </div>
                  </td>

                  <td>
                    <span className={styles.version}>
                      {deployment.version}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`${styles.environment} ${
                        deployment.environment === "Production"
                          ? styles.production
                          : ""
                      }`}
                    >
                      {deployment.environment}
                    </span>
                  </td>

                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{
                        color: statusColor[deployment.status],
                      }}
                    >
                      <StatusIcon status={deployment.status} />
                      {deployment.status}
                    </span>
                  </td>

                  <td>
                    <span className={styles.duration}>
                      <Clock3 size={12} />
                      {deployment.duration}
                    </span>
                  </td>

                  <td>
                    <span className={styles.deployedBy}>
                      <User size={12} />
                      {deployment.deployedBy}
                    </span>
                  </td>

                  <td>
                    <span className={styles.time}>
                      {deployment.time}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDeployments.length === 0 && (
            <div className={styles.emptyState}>
              <Search size={22} />
              <strong>No deployments found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>

        <div className={styles.tableFooter}>
          Showing <strong>{filteredDeployments.length}</strong> of{" "}
          <strong>{deployments.length}</strong> deployments
        </div>
      </section>

      {/* DETAIL DRAWER */}
      {selectedDeployment && (
        <aside className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <div>
              <span className={styles.detailEyebrow}>DEPLOYMENT</span>
              <h2>{selectedDeployment.id}</h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDeployment(null)}
              aria-label="Close deployment details"
            >
              <X size={17} />
            </button>
          </div>

          <div
            className={styles.detailStatus}
            style={{
              color: statusColor[selectedDeployment.status],
            }}
          >
            <StatusIcon status={selectedDeployment.status} />
            {selectedDeployment.status}
          </div>

          <div className={styles.detailService}>
            <div className={styles.detailServiceIcon}>
              <Server size={18} />
            </div>

            <div>
              <strong>{selectedDeployment.service}</strong>
              <span>{selectedDeployment.version}</span>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div>
              <span>Commit</span>
              <strong>{selectedDeployment.commit}</strong>
            </div>

            <div>
              <span>Environment</span>
              <strong>{selectedDeployment.environment}</strong>
            </div>

            <div>
              <span>Duration</span>
              <strong>{selectedDeployment.duration}</strong>
            </div>

            <div>
              <span>Changes</span>
              <strong>{selectedDeployment.changes}</strong>
            </div>

            <div>
              <span>Deployed by</span>
              <strong>{selectedDeployment.deployedBy}</strong>
            </div>

            <div>
              <span>Started</span>
              <strong>{selectedDeployment.time}</strong>
            </div>
          </div>

          <div className={styles.timeline}>
            <div className={styles.timelineTitle}>
              <Activity size={14} />
              Deployment pipeline
            </div>

            <div className={styles.timelineItem}>
              <i className={styles.done} />
              <div>
                <strong>Build</strong>
                <span>Build completed successfully</span>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <i className={styles.done} />
              <div>
                <strong>Tests</strong>
                <span>Automated checks passed</span>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <i className={styles.done} />
              <div>
                <strong>Deploy</strong>
                <span>Application deployed</span>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <i className={styles.active} />
              <div>
                <strong>Health Check</strong>
                <span>Monitoring production health</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.rollbackButton}
            onClick={rollback}
            disabled={rollingBack}
          >
            <RotateCcw
              size={14}
              className={rollingBack ? styles.spin : ""}
            />
            {rollingBack ? "Rolling back..." : "Rollback deployment"}
          </button>
        </aside>
      )}
    </main>
  );
}

function RocketIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 3.5-2 3.5s2.24-.5 3.5-2c.71-.84.7-2.13-.08-2.92a2.1 2.1 0 0 0-1.42-.58Z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.9 12.9 0 0 1 22 2c0 2.72-.78 7.03-6.05 11a22.35 22.35 0 0 1-3.95 2Z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      <circle cx="16" cy="8" r="1.5" />
    </svg>
  );
}