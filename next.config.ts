import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true as unknown as boolean,
  },
  reactStrictMode: false,
  devIndicators: false,
} as NextConfig;

export default nextConfig;
