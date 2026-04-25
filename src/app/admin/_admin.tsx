import type { ReactNode } from "react";

export type Tone = "danger" | "warning" | "success" | "info" | "neutral";

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-AU").format(value);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatReportReason(reason: string) {
  const label = reason.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatModerationStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

export function getToneStyles(tone: Tone) {
  switch (tone) {
    case "danger":
      return { textColor: "var(--error)", borderColor: "rgba(208,87,78,0.28)", backgroundColor: "rgba(208,87,78,0.12)" };
    case "warning":
      return { textColor: "var(--warning)", borderColor: "rgba(217,126,59,0.28)", backgroundColor: "rgba(217,126,59,0.12)" };
    case "success":
      return { textColor: "var(--success)", borderColor: "rgba(107,142,35,0.28)", backgroundColor: "rgba(107,142,35,0.12)" };
    case "info":
      return { textColor: "var(--primary)", borderColor: "rgba(128,80,45,0.26)", backgroundColor: "rgba(128,80,45,0.10)" };
    default:
      return { textColor: "var(--text)", borderColor: "var(--border)", backgroundColor: "var(--surface-alt)" };
  }
}

export function getMetricBadgeLabel(tone: Tone) {
  if (tone === "danger") return "Urgent";
  if (tone === "warning") return "Watch";
  if (tone === "success") return "Clear";
  if (tone === "info") return "Live";
  return "Active";
}

export function getModerationTone(status: string): Tone {
  if (["APPROVED", "PUBLISHED", "RESOLVED"].includes(status)) return "success";
  if (["PENDING_REVIEW", "DRAFT"].includes(status)) return "warning";
  if (["REJECTED", "ARCHIVED"].includes(status)) return "danger";
  return "neutral";
}

export function getEventTone(action: string): Tone {
  const n = action.toUpperCase();
  if (/(APPROVE|PUBLISH|VERIFY|RESOLVE)/.test(n)) return "success";
  if (/(REJECT|ARCHIVE|UNPUBLISH)/.test(n)) return "danger";
  if (n.includes("DISMISS")) return "neutral";
  return "info";
}

// ─── UI Components ────────────────────────────────────────────────────────────

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const s = getToneStyles(tone);
  return (
    <span
      className="inline-flex shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{ color: s.textColor, borderColor: s.borderColor, backgroundColor: s.backgroundColor }}
    >
      {label}
    </span>
  );
}

export function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="heading-section">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note: string;
  tone: Tone;
}) {
  const s = getToneStyles(tone);
  return (
    <div className="rounded-[1.75rem] border bg-[var(--card)] p-5 shadow-sm" style={{ borderColor: s.borderColor }}>
      <div className="text-sm font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: s.textColor }}>
        {value}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{note}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  backHref = "/admin",
  badge,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  badge?: ReactNode;
}) {
  // inline Link import isn't possible in a non-async component exporting multiple items
  // callers must include Link themselves; this is just the visual shell
  return (
    <div className="mb-8">
      <a
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        ← Back to overview
      </a>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {badge}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}
