/** @type {import('next').NextConfig} */
const remotePatterns = [];
let supabaseHost = "";

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;

    remotePatterns.push({
      protocol: "https",
      hostname: supabaseHost,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Ignore invalid env values here so build-time validation can fail in one place.
  }
}

// Build a CSP that covers all runtime sources used by the app.
// 'unsafe-inline' on script-src is required because Next.js App Router injects
// inline hydration scripts. 'unsafe-inline' on style-src is required for Tailwind.
// Neither can be removed without nonce-based middleware, which is a future improvement.
function buildCsp() {
  const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";

  const directives = [
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self' https://checkout.stripe.com https://appleid.apple.com",
    // Scripts: self + inline (Next.js requirement) + Stripe + optional GA
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
    // Styles: self + inline (Tailwind requirement)
    "style-src 'self' 'unsafe-inline'",
    // Images: self, data URIs, blob (Next Image optimisation), Supabase, and any https for user-uploaded thumbnails
    `img-src 'self' data: blob: https:`,
    // Fonts: self and data URIs
    "font-src 'self' data:",
    // XHR/fetch: self + Supabase API + Stripe API + GA
    [
      "connect-src 'self'",
      supabaseOrigin ? `${supabaseOrigin} wss://${supabaseHost}` : "",
      "https://api.stripe.com",
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
    ]
      .filter(Boolean)
      .join(" "),
    // Stripe JS renders iframes for card input
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    // Service workers and blob workers used by Next.js
    "worker-src 'self' blob:",
    // Manifests
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

const nextConfig = {
  poweredByHeader: false,
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
          {
            key: "Content-Security-Policy",
            value: buildCsp(),
          },
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

module.exports = nextConfig;
