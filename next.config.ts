import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client and LibSQL adapter are properly bundled
  // Note: serverComponentsExternalPackages moved to serverExternalPackages in Next.js 16
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-libsql', '@libsql/client'],
};

export default nextConfig;
