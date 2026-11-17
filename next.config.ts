import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/founder/dashboard",
        destination: "/founder",
      },
      {
        source: "/mentor/dashboard",
        destination: "/mentor",
      },
      {
        source: "/admin/dashboard",
        destination: "/admin",
      },
    ];
  },
};

export default nextConfig;
