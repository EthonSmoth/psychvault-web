import type { Metadata } from "next";
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

export default async function SearchPage() {
  const { categories, tags } = await getResourceBrowseFacets();

  return (
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
  );
}
