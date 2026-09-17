import Link from "next/link";
import LogoutButton from '../../components/logout-button';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>

          <div>
            <strong>NEXUS</strong>
            <span>OBSERVE</span>
          </div>
        </div>

        <nav>
          {/* OVERVIEW */}
          <div className="nav-label">OVERVIEW</div>

          <Link href="/dashboard">
            Dashboard
          </Link>

          {/* OBSERVE */}
          <div className="nav-label">OBSERVE</div>

          <Link href="/services">
            Services
          </Link>

          <Link href="/infrastructure">
            Infrastructure
          </Link>

          <Link href="/metrics">
            Metrics
          </Link>

          <Link href="/logs">
            Logs
          </Link>

          <Link href="/traces">
            Traces
          </Link>

          {/* UNDERSTAND */}
          <div className="nav-label">UNDERSTAND</div>

          <Link href="/service-map">
            Service Map
          </Link>

          <Link href="/dependencies">
            Dependencies
          </Link>

          <Link href="/deployments">
            Deployments
          </Link>

          <Link href="/ai-investigation">
            AI Investigation
          </Link>

          {/* OPERATE */}
          <div className="nav-label">OPERATE</div>

          <Link href="/incidents">
            Incidents
          </Link>

          <Link href="/alerts">
            Alerts
          </Link>

          <Link href="/monitors">
            Monitors
          </Link>

          <Link href="/slo-sla">
            SLO / SLA
          </Link>

          {/* PLATFORM */}
          <div className="nav-label">PLATFORM</div>

          <Link href="/integrations">
            Integrations
          </Link>

          <Link href="/api-keys">
            API Keys
          </Link>

          <Link href="/team">
            Team
          </Link>

          <Link href="/audit-logs">
            Audit Logs
          </Link>

          <Link href="/settings">
            Settings
          </Link>
        </nav>

        {/* AUTHENTICATION */}
        <div className="mt-auto border-t border-white/10 p-3">
          <LogoutButton />
        </div>
      </aside>

      <section className="content">
        {children}
      </section>
    </main>
  );
}