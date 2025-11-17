import { defineConfig, env } from "prisma/config";

// Get DATABASE_URL and check if it's Turso (libsql://) or local SQLite (file://)
const databaseUrl = env("DATABASE_URL");
const isTurso = databaseUrl?.startsWith("libsql://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Use node-api engine for Turso, classic for local SQLite
  engine: isTurso ? "node-api" : "classic",
  datasource: {
    url: databaseUrl,
  },
});
