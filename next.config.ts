import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client and LibSQL adapter are properly bundled
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/adapter-libsql', '@libsql/client'],
  },
};

export default nextConfig;
