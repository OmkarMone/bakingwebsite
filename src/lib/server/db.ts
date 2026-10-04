import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * Single Prisma instance per process. The database is optional: when DATABASE_URL is not
 * configured, `getDb()` returns null and callers degrade gracefully (in-memory caching,
 * saving disabled).
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient | null };

export function getDb(): PrismaClient | null {
  if (globalForPrisma.__prisma !== undefined) return globalForPrisma.__prisma;
  const url = env.databaseUrl();
  if (!url) {
    globalForPrisma.__prisma = null;
    return null;
  }
  const adapter = new PrismaPg({ connectionString: url, max: env.dbPoolMax() });
  globalForPrisma.__prisma = new PrismaClient({ adapter });
  return globalForPrisma.__prisma;
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Saving requires a database. Configure DATABASE_URL to enable My Recipes, history and preferences.");
    this.name = "DatabaseUnavailableError";
  }
}

export function requireDb(): PrismaClient {
  const db = getDb();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}
