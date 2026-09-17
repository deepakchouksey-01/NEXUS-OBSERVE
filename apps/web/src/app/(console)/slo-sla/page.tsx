"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Search,
  Target,
  TrendingDown,
  X,
} from "lucide-react";
import styles from "./page.module.css";

type SLOStatus = "Healthy" | "At Risk" | "Breached";

type SLO = {
  id: string;
  service: string;
  objective: string;
  target: string;
  current: string;
  window: string;
  errorBudget: string;
  budgetUsed: number;
  burnRate: string;
  status: SLOStatus;
  metric: string;
  description: string;
};

const initialSLOs: SLO[] = [
  {
    id: "SLO-001",
    service: "API Gateway",
    objective: "Availability",
    target: "99.95%",
    current: "99.98%",
    window: "30 days",
    errorBudget: "21.6 min",
    budgetUsed: 31,
    burnRate: "0.42x",
    status: "Healthy",
    metric: "Successful requests / total requests",
    description:
      "Measures the availability of the public API Gateway across the production environment.",
  },
  {
    id: "SLO-002",
    service: "Payments",
    objective: "Availability",
    target: "99.99%",
    current: "99.91%",
    window: "30 days",
    errorBudget: "4.3 min",
    budgetUsed: 78,
    burnRate: "1.84x",
    status: "At Risk",
    metric: "Successful payment requests / total requests",
    description:
      "Tracks payment service availability against the committed production objective.",
  },
  {
    id: "SLO-003",
    service: "Orders",
    objective: "Latency",
    target: "99.90%",
    current: "99.94%",
    window: "30 days",
    errorBudget: "43.2 min",
    budgetUsed: 46,
    burnRate: "0.71x",
    status: "Healthy",
    metric: "Requests below 400ms / total requests",
    description:
      "Measures the percentage of Orders requests completing below the latency threshold.",
  },
  {
    id: "SLO-004",
    service: "Auth Service",
    objective: "Availability",
    target: "99.95%",
    current: "99.82%",
    window: "7 days",
    errorBudget: "5.0 min",
    budgetUsed: 96,
    burnRate: "3.12x",
    status: "Breached",
    metric: "Successful authentication requests / total requests",
    description:
      "Authentication availability objective for production login and token services.",
  },
  {
    id: "SLO-005",
    service: "Inventory",
    objective: "Latency",
    target: "99.90%",
    current: "99.97%",
    window: "30 days",
    errorBudget: "43.2 min",
    budgetUsed: 18,
    burnRate: "0.28x",
    status: "Healthy",
    metric: "Requests below 300ms / total requests",
    description:
      "Tracks inventory API latency and ensures the service remains within its SLO.",
  },
  {
    id: "SLO-006",
    service: "PostgreSQL",
    objective: "Availability",
    target: "99.99%",
    current: "100%",
    window: "90 days",
    errorBudget: "13.0 min",
    budgetUsed: 7,
    burnRate: "0.09x",
    status: "Healthy",
    metric: "Successful database health checks / total checks",
    description:
      "Database availability objective based on continuous infrastructure health checks.",
  },
];

const statusOptions = ["All", "Healthy", "At Risk", "Breached"];
const windowOptions = ["All", "7 days", "30 days", "90 days"];

export default function SloSlaPage() {
  const [slos, setSlos] = useState(initialSLOs);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [window, setWindow] = useState("All");
  const [selectedSLO, setSelectedSLO] = useState<SLO | null>(null);

  const filteredSLOs = useMemo(() => {
    const query = search.toLowerCase().trim();

    return slos.filter((slo) => {
      const matchesSearch =
        !query ||
        slo.service.toLowerCase().includes(query) ||
        slo.objective.toLowerCase().includes(query) ||
        slo.metric.toLowerCase().includes(query);

      const matchesStatus =
        status === "All" || slo.status === status;

      const matchesWindow =
        window === "All" || slo.window === window;

      return matchesSearch && matchesStatus && matchesWindow;
    });
  }, [slos, search, status, window]);

  const healthyCount = slos.filter(
    (slo) => slo.status === "Healthy",
  ).length;

  const atRiskCount = slos.filter(
    (slo) => slo.status === "At Risk",
  ).length;

  const breachedCount = slos.filter(
    (slo) => slo.status === "Breached",
  ).length;

  const averageCompliance =
    slos.reduce((sum, slo) => sum + parseFloat(slo.current), 0) /
    slos.length;

  function acknowledgeRisk(id: string) {
    setSlos((current) =>
      current.map((slo) =>
        slo.id === id && slo.status === "At Risk"
          ? { ...slo, status: "Healthy" }
          : slo,
      ),
    );

    setSelectedSLO((current) =>
      current && current.id === id
        ? { ...current, status: "Healthy" }
        : current,
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>OPERATE / SLO & SLA</div>
          <h1>SLO / SLA</h1>
          <p>
            Track service objectives, reliability targets and error budgets.
          </p>
        </div>

        <div className={styles.actions}>
          <div className={styles.period}>
            <Clock3 size={13} />
            30 day window
          </div>

          <button className={styles.primaryButton}>
            <Target size={14} />
            Create SLO
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <Metric
          icon={<Gauge size={17} />}
          label="Average compliance"
          value={`${averageCompliance.toFixed(2)}%`}
          detail="Across all objectives"
          tone="success"
        />

        <Metric
          icon={<CheckCircle2 size={17} />}
          label="Healthy"
          value={healthyCount}
          detail="Meeting objectives"
          tone="success"
        />

        <Metric
          icon={<AlertTriangle size={17} />}
          label="At risk"
          value={atRiskCount}
          detail="Budget being consumed"
          tone="warning"
        />

        <Metric
          icon={<TrendingDown size={17} />}
          label="Breached"
          value={breachedCount}
          detail="Objective violations"
          tone="critical"
        />
      </section>

      <section className={styles.summary}>
        <div className={styles.summaryHeader}>
          <div>
            <h2>Reliability posture</h2>
            <span>Current service-level performance</span>
          </div>

          <div className={styles.summaryStatus}>
            <span />
            Reliability tracking active
          </div>
        </div>

        <div className={styles.summaryBody}>
          <div className={styles.score}>
            <strong>{averageCompliance.toFixed(2)}%</strong>
            <span>Overall compliance</span>
          </div>

          <div className={styles.summaryBar}>
            <div
              className={styles.summaryFill}
              style={{
                width: `${Math.min(averageCompliance, 100)}%`,
              }}
            />
          </div>

          <div className={styles.summaryStats}>
            <div>
              <span>Objectives</span>
              <strong>{slos.length}</strong>
            </div>

            <div>
              <span>Error budget risk</span>
              <strong>{atRiskCount + breachedCount}</strong>
            </div>

            <div>
              <span>Healthy rate</span>
              <strong>
                {Math.round((healthyCount / slos.length) * 100)}%
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={15} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search services, objectives or metrics..."
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
            value={window}
            onChange={(event) => setWindow(event.target.value)}
          >
            {windowOptions.map((option) => (
              <option key={option} value={option}>
                {option} window
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Service objectives</h2>
            <span>
              {filteredSLOs.length} objectives matching current filters
            </span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Objective</th>
                <th>Target</th>
                <th>Current</th>
                <th>Error budget</th>
                <th>Budget used</th>
                <th>Burn rate</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredSLOs.map((slo) => (
                <tr
                  key={slo.id}
                  className={styles.row}
                  onClick={() => setSelectedSLO(slo)}
                >
                  <td>
                    <div className={styles.service}>
                      <div
                        className={`${styles.serviceIcon} ${
                          styles[slo.status
                            .toLowerCase()
                            .replace(" ", "")]
                        }`}
                      >
                        <Activity size={15} />
                      </div>

                      <div>
                        <strong>{slo.service}</strong>
                        <span>{slo.id}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className={styles.objective}>
                      <strong>{slo.objective}</strong>
                      <span>{slo.window}</span>
                    </div>
                  </td>

                  <td>
                    <strong>{slo.target}</strong>
                  </td>

                  <td>
                    <span
                      className={
                        slo.status === "Breached"
                          ? styles.badCurrent
                          : styles.current
                      }
                    >
                      {slo.current}
                    </span>
                  </td>

                  <td>{slo.errorBudget}</td>

                  <td>
                    <BudgetCell value={slo.budgetUsed} />
                  </td>

                  <td>
                    <span
                      className={`${styles.burn} ${
                        slo.burnRate.startsWith("3")
                          ? styles.burnCritical
                          : slo.burnRate.startsWith("1")
                            ? styles.burnWarning
                            : ""
                      }`}
                    >
                      {slo.burnRate}
                    </span>
                  </td>

                  <td>
                    <StatusBadge status={slo.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSLOs.length === 0 && (
            <div className={styles.empty}>
              <Search size={22} />
              <strong>No objectives found</strong>
              <span>Try changing your search or filters.</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Error budget</h2>
              <span>Services consuming the most budget</span>
            </div>
          </div>

          <div className={styles.budgetList}>
            {slos
              .slice()
              .sort((a, b) => b.budgetUsed - a.budgetUsed)
              .slice(0, 4)
              .map((slo) => (
                <div className={styles.budgetRow} key={slo.id}>
                  <div className={styles.budgetTop}>
                    <strong>{slo.service}</strong>
                    <span>{slo.budgetUsed}% used</span>
                  </div>

                  <div className={styles.progress}>
                    <div
                      className={`${styles.progressFill} ${
                        slo.budgetUsed >= 90
                          ? styles.critical
                          : slo.budgetUsed >= 70
                            ? styles.warning
                            : styles.success
                      }`}
                      style={{
                        width: `${slo.budgetUsed}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>SLO events</h2>
              <span>Recent reliability signals</span>
            </div>
          </div>

          <div className={styles.timeline}>
            <TimelineItem
              tone="critical"
              title="Auth Service SLO breached"
              detail="Availability dropped below 99.95%"
              time="18 min ago"
            />

            <TimelineItem
              tone="warning"
              title="Payments error budget at risk"
              detail="78% of monthly budget consumed"
              time="32 min ago"
            />

            <TimelineItem
              tone="success"
              title="API Gateway objective healthy"
              detail="99.98% availability maintained"
              time="1h ago"
            />

            <TimelineItem
              tone="success"
              title="PostgreSQL budget stabilized"
              detail="Burn rate reduced to 0.09x"
              time="2h ago"
            />
          </div>
        </div>
      </section>

      {selectedSLO && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedSLO(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>
                  {selectedSLO.id}
                </span>
                <h2>{selectedSLO.service}</h2>
              </div>

              <button
                className={styles.closeButton}
                onClick={() => setSelectedSLO(null)}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className={styles.drawerBadges}>
              <StatusBadge status={selectedSLO.status} />

              <span className={styles.windowBadge}>
                {selectedSLO.window}
              </span>
            </div>

            <div className={styles.detailBlock}>
              <span>Objective</span>
              <strong>{selectedSLO.objective}</strong>
              <p>{selectedSLO.description}</p>
            </div>

            <div className={styles.detailGrid}>
              <Detail label="Target" value={selectedSLO.target} />
              <Detail label="Current" value={selectedSLO.current} />
              <Detail
                label="Error budget"
                value={selectedSLO.errorBudget}
              />
              <Detail
                label="Budget used"
                value={`${selectedSLO.budgetUsed}%`}
              />
              <Detail label="Burn rate" value={selectedSLO.burnRate} />
              <Detail label="Window" value={selectedSLO.window} />
            </div>

            <div className={styles.metricDefinition}>
              <span>SLI definition</span>
              <p>{selectedSLO.metric}</p>
            </div>

            {selectedSLO.status !== "Healthy" && (
              <div className={styles.drawerActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() =>
                    acknowledgeRisk(selectedSLO.id)
                  }
                >
                  <CheckCircle2 size={14} />
                  Acknowledge risk
                </button>
              </div>
            )}
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
  value: string | number;
  detail: string;
  tone: "success" | "warning" | "critical";
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

function StatusBadge({ status }: { status: SLOStatus }) {
  const className = status.toLowerCase().replace(" ", "");

  return (
    <span className={`${styles.status} ${styles[className]}`}>
      <i />
      {status}
    </span>
  );
}

function BudgetCell({ value }: { value: number }) {
  return (
    <div className={styles.budgetCell}>
      <div className={styles.miniProgress}>
        <div
          className={`${styles.miniFill} ${
            value >= 90
              ? styles.critical
              : value >= 70
                ? styles.warning
                : styles.success
          }`}
          style={{ width: `${value}%` }}
        />
      </div>

      <span>{value}%</span>
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