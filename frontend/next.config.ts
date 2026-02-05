import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: "standalone",
  
  // Disable eslint during build for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable type checking during build (we check separately)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
