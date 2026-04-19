import Link from"next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--text-muted)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-[var(--border-strong)]">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  className={isLast ?"font-medium text-[var(--text)]" : undefined}
                  aria-current={isLast ?"page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition hover:text-[var(--accent)]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
