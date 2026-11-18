import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

declare global {
  var __labverseDb: Promise<DB> | undefined;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
  }
}

/**
 * Production / Vercel: Neon serverless HTTP driver (DATABASE_URL, pooled).
 * Local development without DATABASE_URL: embedded PGlite stored in ./.data/pglite,
 * migrated automatically. PGlite is never used in production.
 */
async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as DB;
  }
  if (process.env.NODE_ENV === "production" && !process.env.LABVERSE_ALLOW_PGLITE) throw new DatabaseNotConfiguredError();
  const { createPgliteDb } = await import("./pglite");
  return createPgliteDb(process.env.PGLITE_DIR ?? "./.data/pglite");
}

export function getDb(): Promise<DB> {
  if (!globalThis.__labverseDb) {
    globalThis.__labverseDb = create().catch((e) => {
      globalThis.__labverseDb = undefined;
      throw e;
    });
  }
  return globalThis.__labverseDb;
}

export { schema };
