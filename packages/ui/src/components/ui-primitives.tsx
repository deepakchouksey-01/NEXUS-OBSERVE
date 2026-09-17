import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export type Status = "healthy" | "warning" | "critical" | "info" | "ai";

export function StatusIndicator({ status, label }: { status: Status; label?: string }) {
  return <span className={`nexus-status nexus-status--${status}`} role="status"><span className="nexus-status__dot" aria-hidden="true" />{label ?? status}</span>;
}

export function NexusCard({ children, title, description, action, className = "" }: { children: ReactNode; title?: string; description?: string; action?: ReactNode; className?: string }) {
  return <section className={`nexus-card ${className}`}>
    {(title || description || action) && <header className="nexus-card__header"><div>{title && <h3 className="nexus-card__title">{title}</h3>}{description && <p className="nexus-card__description">{description}</p>}</div>{action}</header>}
    <div className="nexus-card__body">{children}</div>
  </section>;
}

export function NexusButton({ children, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`nexus-button nexus-button--${variant}`} {...props}>{children}</button>;
}

export function NexusBadge({ children, status = "info" }: { children: ReactNode; status?: Status }) {
  return <span className={`nexus-badge nexus-badge--${status}`}>{children}</span>;
}

export function NexusDivider(props: HTMLAttributes<HTMLHRElement>) { return <hr className="nexus-divider" {...props} />; }
