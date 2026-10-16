import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <div className="mt-2 max-w-2xl text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div aria-hidden className="text-3xl text-muted">◇</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

const ALERT_STYLES = {
  error: "border-danger/40 bg-danger/10 text-danger",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-info/40 bg-info/10 text-info",
};

export function Alert({ kind = "info", children, title }: { kind?: keyof typeof ALERT_STYLES; children: ReactNode; title?: string }) {
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${ALERT_STYLES[kind]}`}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="text-text/90">{children}</div>
    </div>
  );
}

const BADGE_STYLES = {
  accent: "border-accent/50 bg-accent-soft text-accent",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  info: "border-info/40 bg-info/10 text-info",
  neutral: "border-border bg-surface-2 text-muted",
};

export function Badge({ tone = "neutral", children, title }: { tone?: keyof typeof BADGE_STYLES; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${BADGE_STYLES[tone]}`}>
      {children}
    </span>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
      <span aria-hidden>←</span> {children}
    </Link>
  );
}

export function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
          <dd className="mt-0.5 break-words text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Chaîne de requête à partir des filtres courants, en remplaçant certaines clés. */
export function withQuery(base: string, current: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `${base}?${s}` : base;
}
