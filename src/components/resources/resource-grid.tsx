import Link from "next/link";
import ResourceCard from "./resource-card";

type ResourceGridProps = {
  resources: any[];
  className?: string;
};

export function ResourceGrid({
  resources,
  className = "grid gap-6 sm:grid-cols-2 xl:grid-cols-3",
}: ResourceGridProps) {
  if (!resources.length) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-10 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--text)]">No resources found</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Try a broader search, remove some filters, or browse all resources again.
        </p>
        <div className="mt-5">
          <Link
            href="/resources"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            View all resources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
