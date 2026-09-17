"use client";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  GitBranch,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./page.module.css";

type Severity = "Critical" | "Warning" | "Healthy";

type Investigation = {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  time: string;
  duration: string;
  summary: string;
  confidence: number;
};

const investigations: Investigation[] = [
  {
    id: "INV-2048",
    title: "Payment latency spike",
    service: "Payments",
    severity: "Critical",
    time: "8 min ago",
    duration: "14 min",
    summary:
      "Payments API latency increased sharply after a recent deployment. PostgreSQL query latency is the strongest correlated signal.",
    confidence: 96,
  },
  {
    id: "INV-2047",
    title: "Redis response degradation",
    service: "Redis",
    severity: "Warning",
    time: "21 min ago",
    duration: "32 min",
    summary:
      "Redis P95 latency is above the normal baseline. Increased cache misses and connection pressure were detected.",
    confidence: 91,
  },
  {
    id: "INV-2046",
    title: "Inventory traffic anomaly",
    service: "Inventory",
    severity: "Warning",
    time: "43 min ago",
    duration: "18 min",
    summary:
      "Traffic increased by 31% compared with the previous baseline while service latency remained elevated.",
    confidence: 87,
  },
  {
    id: "INV-2045",
    title: "Authentication health check",
    service: "Auth",
    severity: "Healthy",
    time: "1 hr ago",
    duration: "9 min",
    summary:
      "Authentication service is operating within expected latency, error-rate and availability thresholds.",
    confidence: 98,
  },
];

const statusColor: Record<Severity, string> = {
  Critical: "#ef4444",
  Warning: "#f59e0b",
  Healthy: "#22c55e",
};

export default function AIInvestigationPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [selected, setSelected] = useState<Investigation | null>(
    investigations[0],
  );
  const [running, setRunning] = useState(false);

  const filteredInvestigations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return investigations.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.service.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query);

      const matchesSeverity =
        severity === "All" || item.severity === severity;

      return matchesSearch && matchesSeverity;
    });
  }, [search, severity]);

  const runInvestigation = () => {
    setRunning(true);

    window.setTimeout(() => {
      setRunning(false);
    }, 1200);
  };

  return (
    <main className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            UNDERSTAND <span>/</span> AI INVESTIGATION
          </div>

          <h1>AI Investigation</h1>

          <p>
            Use AI-assisted analysis to correlate telemetry, identify root
            causes and accelerate incident investigation.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={runInvestigation}
          >
            <RefreshCw
              size={14}
              className={running ? styles.spin : ""}
            />
            {running ? "Analyzing..." : "Run investigation"}
          </button>

          <div className={styles.avatar}>DC</div>
        </div>
      </header>

      {/* AI STATUS */}
      <section className={styles.aiBanner}>
        <div className={styles.aiBannerIcon}>
          <BrainCircuit size={22} />
        </div>

        <div className={styles.aiBannerContent}>
          <div className={styles.aiBannerTitle}>
            <strong>AI Investigation Engine</strong>
            <span className={styles.onlineBadge}>
              <i />
              Operational
            </span>
          </div>

          <p>
            Nexus AI continuously correlates metrics, logs, traces,
            deployments and service dependencies to identify probable root
            causes.
          </p>
        </div>

        <div className={styles.aiModel}>
          <span>Analysis model</span>
          <strong>Nexus Intelligence v1</strong>
        </div>
      </section>

      {/* SUMMARY */}
      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.critical}`}>
            <AlertTriangle size={18} />
          </div>

          <div>
            <span>Active investigations</span>
            <strong>3</strong>
            <small>1 critical · 2 warnings</small>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.ai}`}>
            <Sparkles size={18} />
          </div>

          <div>
            <span>AI confidence</span>
            <strong>94%</strong>
            <small>Across active investigations</small>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.info}`}>
            <GitBranch size={18} />
          </div>

          <div>
            <span>Signals correlated</span>
            <strong>1,284</strong>
            <small>Metrics · logs · traces</small>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.success}`}>
            <Clock3 size={18} />
          </div>

          <div>
            <span>Mean investigation time</span>
            <strong>4.8 min</strong>
            <small>↓ 37% from baseline</small>
          </div>
        </article>
      </section>

      {/* CONTROLS */}
      <section className={styles.controlsPanel}>
        <div className={styles.controlRow}>
          <div className={styles.searchBox}>
            <Search size={16} />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search investigations..."
            />

            {search && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label className={styles.selectControl}>
            <span>Severity</span>

            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option>All</option>
              <option>Critical</option>
              <option>Warning</option>
              <option>Healthy</option>
            </select>
          </label>
        </div>

        <div className={styles.filterInfo}>
          <span>
            <Activity size={13} />
            {filteredInvestigations.length} investigations
          </span>

          <span>Last 24 hours</span>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className={styles.workspace}>
        {/* INVESTIGATION LIST */}
        <div className={styles.investigationPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Investigation history</h2>
              <span>AI-generated analysis from production telemetry</span>
            </div>

            <BrainCircuit size={18} />
          </div>

          <div className={styles.investigationList}>
            {filteredInvestigations.length === 0 ? (
              <div className={styles.emptyState}>
                <Search size={22} />
                <strong>No investigations found</strong>
                <span>Try another search or severity filter.</span>
              </div>
            ) : (
              filteredInvestigations.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`${styles.investigationItem} ${
                    selected?.id === item.id
                      ? styles.selectedInvestigation
                      : ""
                  }`}
                  onClick={() => setSelected(item)}
                >
                  <div className={styles.investigationTop}>
                    <div
                      className={styles.severityIcon}
                      style={{
                        color: statusColor[item.severity],
                        background: `${statusColor[item.severity]}14`,
                      }}
                    >
                      {item.severity === "Critical" ? (
                        <ShieldAlert size={17} />
                      ) : item.severity === "Warning" ? (
                        <AlertTriangle size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                    </div>

                    <div className={styles.investigationTitle}>
                      <strong>{item.title}</strong>
                      <span>{item.service}</span>
                    </div>

                    <ChevronRight size={16} />
                  </div>

                  <div className={styles.investigationMeta}>
                    <span
                      style={{
                        color: statusColor[item.severity],
                      }}
                    >
                      {item.severity}
                    </span>

                    <span>{item.id}</span>
                    <span>{item.time}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ANALYSIS */}
        <div className={styles.analysisPanel}>
          {selected ? (
            <>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Investigation analysis</h2>
                  <span>{selected.id} · AI-assisted root cause analysis</span>
                </div>

                <span
                  className={styles.confidence}
                  style={{
                    color: statusColor[selected.severity],
                  }}
                >
                  {selected.confidence}% confidence
                </span>
              </div>

              <div className={styles.rootCause}>
                <div className={styles.rootCauseIcon}>
                  <Sparkles size={18} />
                </div>

                <div>
                  <span>Probable root cause</span>
                  <strong>
                    PostgreSQL query latency affecting Payments
                  </strong>

                  <p>
                    AI detected a strong correlation between the Payments
                    latency spike and increased database query duration.
                    The anomaly began shortly after deployment activity.
                  </p>
                </div>
              </div>

              <div className={styles.signalGrid}>
                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <Server size={15} />
                    <span>Payments</span>
                  </div>

                  <strong>842 ms</strong>
                  <small>P95 latency</small>

                  <div className={styles.signalBar}>
                    <i style={{ width: "91%" }} />
                  </div>
                </div>

                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <Database size={15} />
                    <span>PostgreSQL</span>
                  </div>

                  <strong>612 ms</strong>
                  <small>Query duration</small>

                  <div className={styles.signalBar}>
                    <i style={{ width: "76%" }} />
                  </div>
                </div>

                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <Zap size={15} />
                    <span>Error rate</span>
                  </div>

                  <strong>4.8%</strong>
                  <small>5xx responses</small>

                  <div className={styles.signalBar}>
                    <i style={{ width: "64%" }} />
                  </div>
                </div>
              </div>

              <div className={styles.timeline}>
                <div className={styles.timelineHeader}>
                  <div>
                    <h3>Correlated signals</h3>
                    <span>Sequence detected by the AI engine</span>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} />

                  <div>
                    <strong>Deployment detected</strong>
                    <span>Payments deployment completed</span>
                  </div>

                  <time>09:42</time>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} />

                  <div>
                    <strong>Database latency increased</strong>
                    <span>PostgreSQL query duration crossed baseline</span>
                  </div>

                  <time>09:46</time>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} />

                  <div>
                    <strong>Payment errors increased</strong>
                    <span>5xx error rate reached 4.8%</span>
                  </div>

                  <time>09:49</time>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} />

                  <div>
                    <strong>Incident path identified</strong>
                    <span>Gateway → Payments → PostgreSQL</span>
                  </div>

                  <time>09:53</time>
                </div>
              </div>

              <div className={styles.recommendation}>
                <div>
                  <strong>Recommended next step</strong>

                  <p>
                    Inspect the latest Payments database queries and compare
                    query execution plans against the previous deployment.
                  </p>
                </div>

                <button type="button">
                  Investigate service
                  <ChevronRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyAnalysis}>
              <BrainCircuit size={28} />
              <strong>Select an investigation</strong>
              <span>
                Choose an investigation from the list to view AI analysis.
              </span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}