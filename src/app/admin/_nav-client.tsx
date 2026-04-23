"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
  badgeTone?: "danger" | "warning";
  superAdminOnly?: boolean;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/queue", label: "Queue", badgeTone: "warning" },
  { href: "/admin/reports", label: "Reports", badgeTone: "danger" },
  { href: "/admin/refunds", label: "Refunds", badgeTone: "warning" },
  { href: "/admin/applications", label: "Applications", badgeTone: "warning" },
  { href: "/admin/stores", label: "Stores" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/revenue", label: "Revenue tiers", superAdminOnly: true },
];

function Badge({ count, tone }: { count: number; tone?: "danger" | "warning" }) {
  if (count === 0) return null;
  const colors =
    tone === "danger"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <span className={`ml-auto inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${colors}`}>
      {count}
    </span>
  );
}

export function AdminNav({
  counts,
  isSuperAdmin,
}: {
  counts: Record<string, number>;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const badgeCount = (href: string): number => {
    if (href === "/admin/queue") return counts.queue ?? 0;
    if (href === "/admin/reports") return counts.reports ?? 0;
    if (href === "/admin/refunds") return counts.refunds ?? 0;
    if (href === "/admin/applications") return counts.applications ?? 0;
    return 0;
  };

  const visibleItems = ALL_NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <>
      {/* Desktop sidebar nav */}
      <nav className="hidden lg:block">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const count = badgeCount(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                  }`}
                >
                  {item.label}
                  <Badge count={count} tone={item.badgeTone} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile horizontal nav */}
      <nav className="lg:hidden overflow-x-auto">
        <ul className="flex gap-1 pb-1">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const count = badgeCount(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-transparent bg-[var(--text)] text-white"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  {item.label}
                  {count > 0 && <span className="text-xs font-bold">{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
