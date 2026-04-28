import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  db: PrismaClient | undefined;
};

function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? "";
  // For serverless (Vercel) + PgBouncer transaction mode:
  //   connection_limit=1  — one connection per function instance; PgBouncer handles pooling
  //   pgbouncer=true      — disables prepared statements / advisory locks incompatible with transaction mode
  //   pool_timeout=20     — wait up to 20s before failing (Prisma default is 10)
  const separator = base.includes("?") ? "&" : "?";
  if (base.includes("pgbouncer=") || base.includes("connection_limit=")) {
    return base; // already configured via env var
  }
  return `${base}${separator}pgbouncer=true&connection_limit=1&pool_timeout=20`;
}

export const db =
  globalForPrisma.db ??
  new PrismaClient({
    log: ["error", "warn"],
    datasources: { db: { url: buildDatabaseUrl() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.db = db;
}