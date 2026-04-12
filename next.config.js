/** @type {import('next').NextConfig} */
const remotePatterns = [];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;

    remotePatterns.push({
      protocol: "https",
      hostname: supabaseHost,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Ignore invalid env values here so build-time validation can fail in one place.
  }
}

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
  },
  images: {
    remotePatterns,
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
            value: [
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "form-action 'self' https://checkout.stripe.com https://appleid.apple.com",
            ].join("; "),
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
