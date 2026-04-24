import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppBaseUrl } from "@/lib/env";
import { CATEGORY_SEO } from "@/lib/category-seo";
import { ResourcesBrowseClient } from "@/components/resources/resources-browse-client";
import {
  getPublishedResourcesBrowseData,
  getResourceBrowseFacets,
} from "@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return Object.keys(CATEGORY_SEO).map((category) => ({ category }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const seo = CATEGORY_SEO[category];

  if (seo) {
    return {
      title: { absolute: seo.title },
      description: seo.description,
      alternates: {
        canonical: `${baseUrl}/resources/${category}`,
      },
      robots: { index: true, follow: true },
      openGraph: {
        title: seo.title,
        description: seo.description,
        url: `${baseUrl}/resources/${category}`,
        type: "website",
        locale: "en_AU",
      },
      twitter: {
        card: "summary_large_image",
        title: seo.title,
        description: seo.description,
      },
    };
  }

  // Generic metadata for unknown category slugs
  const formatted = category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${formatted} | PsychVault`,
    description: `Browse ${formatted.toLowerCase()} resources designed for Australian psychologists and allied health professionals.`,
    alternates: {
      canonical: `${baseUrl}/resources/${category}`,
    },
    robots: { index: true, follow: true },
  };
}

function CategoryLoadingSkeleton() {
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

export default async function ResourceCategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const seo = CATEGORY_SEO[category];

  const formatted = category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const h1 = seo?.h1 ?? formatted;
  const intro =
    seo?.intro ??
    `Browse ${formatted.toLowerCase()} resources designed for Australian psychologists and allied health professionals.`;

  const [{ categories, tags }, browseData] = await Promise.all([
    getResourceBrowseFacets(),
    getPublishedResourcesBrowseData({ category, sort: "newest" }),
  ]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{h1}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{intro}</p>
      </div>
      <Suspense fallback={<CategoryLoadingSkeleton />}>
        <ResourcesBrowseClient
          categories={categories}
          tags={tags}
          initialResources={browseData.resources}
          initialPageInfo={browseData.pageInfo}
          defaultCategory={category}
        />
      </Suspense>
    </>
  );
}
