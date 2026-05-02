import type { NextConfig } from "next";
import { REDIRECT_RULES } from "./src/lib/redirect-rules";

type RemotePattern = NonNullable<NextConfig["images"]>["remotePatterns"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

const remotePatterns: RemotePattern[] = [];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;

    remotePatterns.push({
      protocol: "https" as const,
      hostname: supabaseHost,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Ignore invalid env values here so build-time validation can fail in one place.
  }
}

// CSP is intentionally NOT set here. It is generated per-request in
// src/middleware.ts with a cryptographic nonce so 'unsafe-inline' is not needed
// for script-src. Static security headers below still apply to all routes
// including static assets where middleware does not run.

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdf-parse reads a test file at module init time which confuses Turbopack's
  // bundler. Marking it external tells Next.js to use Node.js require() directly.
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: __dirname,
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
    optimizeCss: true,
  },
  images: {
    remotePatterns,
    qualities: [70, 72, 75],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 72, 96, 128, 256],
  },
  async redirects() {
    return REDIRECT_RULES;
  },
  async headers() {
    const headers = [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
          // Content-Security-Policy is set per-request by src/middleware.ts (nonce-based).
          // It is intentionally absent here so the static config header does not
          // conflict with or override the dynamic middleware-generated header.
        ],
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headers[0].headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return headers;
  },
};

export default nextConfig;
