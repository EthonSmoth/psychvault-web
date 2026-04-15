import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppBaseUrl } from "@/lib/env";
import { ResourcesBrowseClient } from "@/components/resources/resources-browse-client";
import {
  PUBLIC_RESOURCE_BROWSE_PAGE_SIZE,
  getResourceBrowseFacets,
} from "@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title: "Search Resources",
  description: "Search psychology resources, creators, and marketplace listings on PsychVault.",
  alternates: {
    canonical: `${baseUrl}/search`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

function SearchLoadingSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-9 w-48 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded-full bg-[var(--surface-alt)]" />
      </div>
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          ))}
          <div className="h-[62px] w-24 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]" />
    </main>
  );
}

export default async function SearchPage() {
  const { categories, tags } = await getResourceBrowseFacets();

  return (
    <Suspense fallback={<SearchLoadingSkeleton />}>
      <ResourcesBrowseClient
        categories={categories}
        tags={tags}
        initialResources={[]}
        initialPageInfo={{
          page: 1,
          pageSize: PUBLIC_RESOURCE_BROWSE_PAGE_SIZE,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: null,
          previousPage: null,
        }}
      />
    </Suspense>
  );
}
