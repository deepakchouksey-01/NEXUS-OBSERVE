import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  Clock3,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { serverApiFetch } from '@/lib/server-api';

type OverviewResponse = {
  success: boolean;
  data: {
    summary: {
      systemHealth: number;
      services: {
        total: number;
        healthy: number;
      };
      hosts: {
        total: number;
        healthy: number;
      };
      containers: {
        total: number;
        running: number;
      };
      activeIncidents: number;
      firingAlerts: number;
      averageCpu: number;
      averageMemory: number;
    };

    services: Array<{
      id: string;
      name: string;
      status: string;
    }>;

    activeIncidents: Array<{
      id: string;
      number: string;
      title: string;
      severity: string;
      status: string;
      startedAt: string;
      service: {
        id: string;
        name: string;
        status: string;
      };
    }>;

    firingAlerts: Array<{
      id: string;
      name: string;
      condition: string;
      status: string;
      triggeredAt: string | null;
      service: {
        id: string;
        name: string;
        status: string;
      } | null;
    }>;
  };
  requestId: string;
};

function formatIncidentTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getServiceStatusClass(status: string) {
  switch (status) {
    case 'HEALTHY':
      return 'good';

    case 'DEGRADED':
      return 'warn';

    case 'CRITICAL':
      return 'critical';

    default:
      return 'warn';
  }
}

function getSeverityClass(severity: string) {
  switch (severity) {
    case 'SEV1':
      return 'critical';

    case 'SEV2':
    case 'SEV3':
    case 'SEV4':
      return 'warning';

    default:
      return 'warning';
  }
}

export default async function DashboardPage() {
  const result = await serverApiFetch<OverviewResponse>(
    '/api/v1/overview',
  );

  const { summary, services, activeIncidents, firingAlerts } =
    result.data;

  const metrics = [
    {
      label: 'System Health',
      value: `${summary.systemHealth}%`,
      detail: `${summary.services.healthy} of ${summary.services.total} services healthy`,
      icon: ShieldCheck,
      tone: 'success',
    },
    {
      label: 'Services',
      value: String(summary.services.total),
      detail: `${summary.services.healthy} healthy`,
      icon: Boxes,
      tone: 'info',
    },
    {
      label: 'Active Incidents',
      value: String(summary.activeIncidents),
      detail:
        activeIncidents.length > 0
          ? `${activeIncidents.length} requiring attention`
          : 'No active incidents',
      icon: AlertTriangle,
      tone: 'critical',
    },
    {
      label: 'Host CPU',
      value: `${summary.averageCpu}%`,
      detail: `${summary.averageMemory}% average memory`,
      icon: Clock3,
      tone: 'ai',
    },
  ];

  return (
    <>
      {/* TOP BAR */}
      <header className="topbar">
        <div>
          <p className="eyebrow">PRODUCTION / NEXUS</p>
          <h1>System Overview</h1>
        </div>

        <div className="top-actions">
          <button>⌘ K</button>
          <button>Search</button>

          <Link href="/alerts">
            Alerts <span className="dot" />
          </Link>

          <div className="avatar">DC</div>
        </div>
      </header>

      {/* METRICS */}
      <div className="metrics-grid">
        {metrics.map(
          ({ label, value, detail, icon: Icon, tone }) => (
            <article className="metric-card" key={label}>
              <div className={`icon ${tone}`}>
                <Icon size={18} />
              </div>

              <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <small>{detail}</small>
              </div>
            </article>
          ),
        )}
      </div>

      {/* REQUEST RATE + SERVICE HEALTH */}
      <div className="grid-two">
        {/* REQUEST RATE */}
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Request Rate</h2>
              <span>
                Requests / second · last 60 minutes
              </span>
            </div>

            <button>1h ▾</button>
          </div>

          <div className="chart">
            <div className="grid-lines" />

            <svg
              viewBox="0 0 900 260"
              preserveAspectRatio="none"
              aria-label="request rate chart"
            >
              <path
                d="M0 205 C80 185 90 220 150 180 S240 140 290 165 S370 105 430 125 S500 80 560 110 S650 60 720 95 S800 35 900 55"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />

              <path
                d="M0 205 C80 185 90 220 150 180 S240 140 290 165 S370 105 430 125 S500 80 560 110 S650 60 720 95 S800 35 900 55 V260 H0 Z"
                opacity=".08"
              />
            </svg>
          </div>
        </section>

        {/* SERVICE HEALTH */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Service Health</h2>
              <span>Current production state</span>
            </div>

            <Link href="/services">View all</Link>
          </div>

          <div className="service-list">
            {services.slice(0, 5).map((service) => (
              <div key={service.id}>
                <span
                  className={`status ${getServiceStatusClass(
                    service.status,
                  )}`}
                />

                {service.name}

                <b>
                  {service.status.charAt(0) +
                    service.status.slice(1).toLowerCase()}
                </b>

                <em>Live status</em>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* INCIDENTS + SLO + AI */}
      <div className="grid-three">
        {/* ACTIVE INCIDENTS */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Active Incidents</h2>
              <span>Requires attention</span>
            </div>

            <Link href="/incidents">Open incidents</Link>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="incident">
              <div className="sev warning">OK</div>

              <div>
                <strong>No active incidents</strong>

                <p>
                  All monitored services are currently stable.
                </p>
              </div>
            </div>
          ) : (
            activeIncidents.slice(0, 3).map((incident) => (
              <div className="incident" key={incident.id}>
                <div
                  className={`sev ${getSeverityClass(
                    incident.severity,
                  )}`}
                >
                  {incident.severity.replace('SEV', 'SEV-')}
                </div>

                <div>
                  <strong>{incident.title}</strong>

                  <p>{incident.service.name}</p>

                  <small>
                    Started {formatIncidentTime(incident.startedAt)}
                  </small>
                </div>
              </div>
            ))
          )}
        </section>

        {/* SLO STATUS */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>SLO Status</h2>
              <span>Current error budget</span>
            </div>

            <Link href="/slo-sla">View SLOs</Link>
          </div>

          <div className="slo">
            <div>
              <span>Services monitored</span>
              <b>{summary.services.total}</b>
            </div>

            <div className="progress">
              <i
                style={{
                  width: `${summary.systemHealth}%`,
                }}
              />
            </div>

            <small>
              {summary.systemHealth}% service health ·{' '}
              {summary.services.healthy} healthy
            </small>
          </div>

          <div className="slo">
            <div>
              <span>Running containers</span>
              <b>{summary.containers.running}</b>
            </div>

            <div className="progress">
              <i
                style={{
                  width:
                    summary.containers.total > 0
                      ? `${Math.min(
                          100,
                          (summary.containers.running /
                            summary.containers.total) *
                            100,
                        )}%`
                      : '0%',
                }}
              />
            </div>

            <small>
              {summary.containers.running} of{' '}
              {summary.containers.total} containers running
            </small>
          </div>
        </section>

        {/* AI INSIGHT */}
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>AI Insight</h2>
              <span>Evidence-backed analysis</span>
            </div>

            <Zap size={18} />
          </div>

          <div className="ai-box">
            <strong>
              {firingAlerts.length > 0
                ? 'Active alert signals detected'
                : 'System operating normally'}
            </strong>

            <p>
              {firingAlerts.length > 0
                ? `${firingAlerts.length} firing alert${
                    firingAlerts.length === 1 ? '' : 's'
                  } currently require attention.`
                : 'No firing alerts are currently reported by the observability backend.'}
            </p>

            <div>
              <span>
                {firingAlerts.length} active alert
                {firingAlerts.length === 1 ? '' : 's'}
              </span>

              <span>
                {summary.averageCpu}% avg CPU
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}