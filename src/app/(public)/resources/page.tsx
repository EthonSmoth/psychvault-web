import type { Metadata } from "next";
import { Suspense } from "react";
import { getAppBaseUrl } from "@/lib/env";
import { ResourcesBrowseClient } from "@/components/resources/resources-browse-client";
import {
  getPublishedResourcesBrowseData,
  getResourceBrowseFacets,
} from "@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title: "Browse Psychology Resources",
  description:
    "Browse clinician-made psychology resources including worksheets, handouts, templates, and psychoeducation tools.",
  alternates: {
    canonical: `${baseUrl}/resources`,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Browse Psychology Resources",
    description:
      "Browse clinician-made psychology resources including worksheets, handouts, templates, and psychoeducation tools.",
    url: `${baseUrl}/resources`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Psychology Resources",
    description:
      "Browse clinician-made psychology resources including worksheets, handouts, templates, and psychoeducation tools.",
  },
};

export default async function ResourcesPage() {
  const [{ categories, tags }, browseData] = await Promise.all([
    getResourceBrowseFacets(),
    getPublishedResourcesBrowseData({ sort: "newest" }),
  ]);

  return (
    <Suspense fallback={null}>
      <ResourcesBrowseClient
        categories={categories}
        tags={tags}
        initialResources={browseData.resources}
        initialPageInfo={browseData.pageInfo}
      />
    </Suspense>
  );
}
