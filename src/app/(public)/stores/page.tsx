import type { Metadata } from "next";
import { getAppBaseUrl } from "@/lib/env";
import { StoresBrowseClient } from "@/components/stores/stores-browse-client";
import { getPublishedStoresBrowseData } from "@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title: "Browse Stores",
  description: "Explore creator stores on PsychVault and browse resources by store.",
  alternates: {
    canonical: `${baseUrl}/stores`,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Browse Stores",
    description: "Explore creator stores on PsychVault and browse resources by store.",
    url: `${baseUrl}/stores`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Stores",
    description: "Explore creator stores on PsychVault and browse resources by store.",
  },
};

export default async function StoresBrowsePage() {
  const browseData = await getPublishedStoresBrowseData({
    sort: "newest",
  });

  return (
    <StoresBrowseClient
      initialStores={browseData.stores}
      initialPageInfo={browseData.pageInfo}
    />
  );
}
