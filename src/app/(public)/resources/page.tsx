import type { Metadata } from"next";
import { Suspense } from"react";
import { getAppBaseUrl } from"@/lib/env";
import { ResourcesBrowseClient } from"@/components/resources/resources-browse-client";
import {
  getPublishedResourcesBrowseData,
  getResourceBrowseFacets,
} from"@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title:"Browse Psychology Resources",
  description:
"Browse psychology resources including worksheets, handouts, templates, and psychoeducation tools designed by practising clinicians.",
  alternates: {
    canonical: `${baseUrl}/resources`,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title:"Browse Psychology Resources",
    description:
"Browse psychology resources including worksheets, handouts, templates, and psychoeducation tools designed by practising clinicians.",
    url: `${baseUrl}/resources`,
    type:"website",
  },
  twitter: {
    card:"summary_large_image",
    title:"Browse Psychology Resources",
    description:
"Browse psychology resources including worksheets, handouts, templates, and psychoeducation tools designed by practising clinicians.",
  },
};

function ResourcesLoadingSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-9 w-52 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-2 h-4 w-full max-w-80 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--surface-alt)]" />
      </div>
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          ))}
          <div className="h-[62px] w-24 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]"
          />
        ))}
      </div>
    </main>
  );
}

export default async function ResourcesPage() {
  const [{ categories, tags }, browseData] = await Promise.all([
    getResourceBrowseFacets(),
    getPublishedResourcesBrowseData({ sort:"newest" }),
  ]);

  return (
    <Suspense fallback={<ResourcesLoadingSkeleton />}>
      <ResourcesBrowseClient
        categories={categories}
        tags={tags}
        initialResources={browseData.resources}
        initialPageInfo={browseData.pageInfo}
      />
    </Suspense>
  );
}
