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
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns,
  },
};

module.exports = nextConfig;
