import type { Metadata } from"next";
import { Suspense } from"react";
import { getAppBaseUrl } from"@/lib/env";
import { StoresBrowseClient } from"@/components/stores/stores-browse-client";
import { getPublishedStoresBrowseData } from"@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title:"Browse Stores",
  description:"Explore creator stores on PsychVault and browse resources by store.",
  alternates: {
    canonical: `${baseUrl}/stores`,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title:"Browse Stores",
    description:"Explore creator stores on PsychVault and browse resources by store.",
    url: `${baseUrl}/stores`,
    type:"website",
  },
  twitter: {
    card:"summary_large_image",
    title:"Browse Stores",
    description:"Explore creator stores on PsychVault and browse resources by store.",
  },
};

// Skeleton shown while the client component hydrates.
// Reserves space for the filter form + store grid to prevent layout shift.
function StoresLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="max-w-3xl">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--surface-alt)]" />
          <div className="mt-3 h-9 w-2/3 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-4 h-4 w-full max-w-lg animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
        <div className="mt-8 h-16 animate-pulse rounded-[1.75rem] bg-[var(--surface-alt)]" />
      </section>
      <section className="mt-10">
        <div className="mb-5 h-4 w-32 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface-alt)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function StoresBrowsePage() {
  const browseData = await getPublishedStoresBrowseData({
    sort:"newest",
  });

  return (
    <Suspense fallback={<StoresLoadingSkeleton />}>
      <StoresBrowseClient
        initialStores={browseData.stores}
        initialPageInfo={browseData.pageInfo}
      />
    </Suspense>
  );
}
