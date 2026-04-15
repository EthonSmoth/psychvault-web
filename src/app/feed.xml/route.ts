import { htmlEscape } from "escape-goat";
import { getAllBlogPosts } from "@/lib/blog";
import { getAppBaseUrl } from "@/lib/env";

export const revalidate = 300;

export async function GET() {
  const posts = await getAllBlogPosts();
  const baseUrl = getAppBaseUrl();
  const blogUrl = `${baseUrl}/blog`;
  const latestDate = posts[0]?.updatedAt ?? posts[0]?.publishedAt ?? new Date();

  const items = posts
    .slice(0, 20)
    .map((post) => {
      const url = `${blogUrl}/${post.slug}`;

      return `
        <item>
          <title>${htmlEscape(post.title)}</title>
          <link>${htmlEscape(url)}</link>
          <guid>${htmlEscape(url)}</guid>
          <description>${htmlEscape(post.description)}</description>
          <author>${htmlEscape(post.author || "PsychVault Editorial Team")}</author>
          <pubDate>${post.publishedAt.toUTCString()}</pubDate>
          <category>${htmlEscape(post.category)}</category>
        </item>
      `.trim();
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PsychVault Blog</title>
    <link>${htmlEscape(blogUrl)}</link>
    <description>Practical articles on psychology resources, clinical workflows, and creator growth.</description>
    <language>en-au</language>
    <lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
