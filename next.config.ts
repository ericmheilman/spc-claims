import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Don’t fail the production build on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TEMP: don’t fail the production build on TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
