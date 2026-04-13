import { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/resources", "/stores", "/blog", "/feed.xml"],
        disallow: [
          "/api/",
          "/creator/",
          "/checkout/",
          "/library/",
          "/messages/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
