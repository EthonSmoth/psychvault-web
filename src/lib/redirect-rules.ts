/**
 * Permanent URL redirects for PsychVault.
 *
 * This is the single source of truth for all 301 (permanent) redirects.
 * When you rename a route, blog slug, or any public URL, add a redirect here
 * BEFORE removing the old route so that existing links and indexed pages
 * continue to work.
 *
 * HOW TO ADD A REDIRECT
 * ---------------------
 * 1. Append an entry to REDIRECT_RULES below.
 * 2. Set `permanent: true` for renamed/moved URLs (301 — tells Google to
 *    transfer link equity to the new URL).
 * 3. Set `permanent: false` for temporary redirects (302).
 * 4. Commit the change with a note explaining what changed and why.
 *
 * FORMAT
 * ------
 * {
 *   source: "/old-path",          // The URL that will be redirected
 *   destination: "/new-path",     // Where it goes
 *   permanent: true,              // true = 301, false = 302
 *   // added: "YYYY-MM-DD",      // (optional) date added for audit trail
 *   // reason: "...",             // (optional) why this redirect exists
 * }
 *
 * Patterns support Next.js path matching:
 *   :slug        — named segment  (e.g. /blog/:slug)
 *   :slug*       — wildcard       (e.g. /old/:slug*)
 *   (regex)      — regex group
 * See: https://nextjs.org/docs/app/api-reference/next-config-js/redirects
 *
 * To redirect based on a query parameter, use the `has` array:
 * {
 *   source: "/resources",
 *   has: [{ type: "query", key: "category", value: "(?<category>.+)" }],
 *   destination: "/resources/:category",
 *   permanent: true,
 * }
 */

interface HasMatcher {
  type: "query" | "header" | "cookie" | "host";
  key: string;
  value?: string;
}

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
  has?: HasMatcher[];
}

export const REDIRECT_RULES: RedirectRule[] = [
  // ─── Legal aliases ────────────────────────────────────────────────────────
  // Short URLs used in some older marketing material; canonical lives at the
  // longer slugs. Converted from page-level redirect() (307) to proper 301s.
  {
    source: "/privacy",
    destination: "/privacy-policy",
    permanent: true,
    // added: "2026-05-02",
    // reason: "Short alias for canonical /privacy-policy page",
  },
  {
    source: "/terms",
    destination: "/terms-of-service",
    permanent: true,
    // added: "2026-05-02",
    // reason: "Short alias for canonical /terms-of-service page",
  },

  // ─── Query-param category URLs ────────────────────────────────────────────
  // Google indexed /resources?category=<slug> style URLs (legacy filter params
  // that were never meant to be crawled). The canonical pages live at the static
  // /resources/<slug> paths. This catches all ?category= variants in one rule.
  {
    source: "/resources",
    has: [{ type: "query", key: "category", value: "(?<category>.+)" }],
    destination: "/resources/:category",
    permanent: true,
    // added: "2026-05-02",
    // reason: "Google Search Console showed ?category= URLs being crawled; canonical is /resources/[slug]",
  },

  // ─── Add future redirects below ───────────────────────────────────────────
  // Example — blog post rename:
  // {
  //   source: "/blog/old-slug",
  //   destination: "/blog/new-slug",
  //   permanent: true,
  //   // added: "YYYY-MM-DD",
  //   // reason: "Renamed post for clarity",
  // },
];
