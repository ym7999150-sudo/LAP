import path from "node:path";
import type { DB } from "./client";
import * as schema from "./schema";

/** Embedded Postgres for local development and tests. `dir` = "memory://" for an in-memory DB. */
export async function createPgliteDb(dir: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(dir === "memory://" ? undefined : dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as DB;
}
