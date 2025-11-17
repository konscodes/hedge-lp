import { defineConfig, env } from "prisma/config";

// Get DATABASE_URL and check if it's Turso (libsql://) or local SQLite (file://)
const databaseUrl = env("DATABASE_URL");
const isTurso = databaseUrl?.startsWith("libsql://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Use classic engine for both (LibSQL adapter handles Turso at runtime)
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
