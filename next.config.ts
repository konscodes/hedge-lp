import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client is properly bundled
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
