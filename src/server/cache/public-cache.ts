import { revalidatePath, revalidateTag } from "next/cache";

export const PUBLIC_CONTENT_REVALIDATE_SECONDS = 60 * 5;
export const PUBLIC_SEO_REVALIDATE_SECONDS = 60 * 60;

export const PUBLIC_CACHE_TAGS = {
  home: "public:home",
  sitemap: "public:sitemap",
  resources: "public:resources",
  resourceBrowse: "public:resources:browse",
  resourcePage: (slug: string) => `public:resources:${slug}`,
  stores: "public:stores",
  storeBrowse: "public:stores:browse",
  storePage: (slug: string) => `public:stores:${slug}`,
} as const;

export function revalidatePublicHome() {
  revalidateTag(PUBLIC_CACHE_TAGS.home, "max");
  revalidatePath("/");
}

export function revalidatePublicResources(resourceSlug?: string) {
  revalidateTag(PUBLIC_CACHE_TAGS.home, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.resources, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.resourceBrowse, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.sitemap, "max");
  revalidatePath("/");
  revalidatePath("/resources");

  if (resourceSlug) {
    revalidateTag(PUBLIC_CACHE_TAGS.resourcePage(resourceSlug), "max");
    revalidatePath(`/resources/${resourceSlug}`);
  }
}

export function revalidatePublicStores(storeSlug?: string) {
  revalidateTag(PUBLIC_CACHE_TAGS.home, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.stores, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.storeBrowse, "max");
  revalidateTag(PUBLIC_CACHE_TAGS.sitemap, "max");
  revalidatePath("/stores");

  if (storeSlug) {
    revalidateTag(PUBLIC_CACHE_TAGS.storePage(storeSlug), "max");
    revalidatePath(`/stores/${storeSlug}`);
  }
}

export function revalidateMarketplaceSurface(options: {
  resourceSlug?: string;
  storeSlug?: string;
}) {
  revalidatePublicHome();
  revalidatePublicResources(options.resourceSlug);
  revalidatePublicStores(options.storeSlug);
}

export function getPublicCacheControl(
  revalidateSeconds = PUBLIC_CONTENT_REVALIDATE_SECONDS
) {
  return `public, s-maxage=${revalidateSeconds}, stale-while-revalidate=${PUBLIC_SEO_REVALIDATE_SECONDS}`;
}
