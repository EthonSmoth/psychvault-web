import { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getAllBlogPosts } from "@/lib/blog";
import { getAppBaseUrl } from "@/lib/env";
import {
  getPubliclyVisiblePublishedResourceWhere,
  getPubliclyVisibleStoreWhere,
} from "@/lib/public-resource-visibility";
import {
  PUBLIC_CACHE_TAGS,
} from "@/server/cache/public-cache";
import { TEMPLATE_LANDING_PAGES } from "@/lib/template-landing-pages";

export const runtime = "nodejs";
export const revalidate = 3600;

const getSitemapEntries = unstable_cache(
  async () => {
    const [resources, stores] = await Promise.all([
      db.resource.findMany({
        where: getPubliclyVisiblePublishedResourceWhere(),
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
      db.store.findMany({
        where: getPubliclyVisibleStoreWhere(),
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
    ]);

    return { resources, stores };
  },
  ["public-sitemap"],
  {
    revalidate: 3600,
    tags: [PUBLIC_CACHE_TAGS.sitemap, PUBLIC_CACHE_TAGS.resources, PUBLIC_CACHE_TAGS.stores],
  }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppBaseUrl();
  const [{ resources, stores }, blogPosts] = await Promise.all([
    getSitemapEntries(),
    getAllBlogPosts(),
  ]);

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stores`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: blogPosts[0]?.updatedAt ?? blogPosts[0]?.publishedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/feedback`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/templates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },

    ...resources.map((resource) => ({
      url: `${baseUrl}/resources/${resource.slug}`,
      lastModified: resource.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),

    ...stores.map((store) => ({
      url: `${baseUrl}/stores/${store.slug}`,
      lastModified: store.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),

    ...TEMPLATE_LANDING_PAGES.map((page) => ({
      url: `${baseUrl}/templates/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),

    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt ?? post.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),

    // Canonical category pages at clean paths
    ...([
      "therapy-worksheets",
      "ndis-resources",
      "psychoeducation",
      "report-templates",
      "emotional-regulation-tools",
      "parent-handouts",
      "assessment-tools",
    ].map((slug) => ({
      url: `${baseUrl}/resources/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }))),
  ];
}
