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
          "/admin/",
          "/creator/",
          "/checkout/",
          "/library/",
          "/messages/",
          "/account",
          "/login",
          "/signup",
          "/following",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
