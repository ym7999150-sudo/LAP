import path from "node:path";
import { sql } from "drizzle-orm";
import type { DB } from "./client";
import * as schema from "./schema";

/** Embedded Postgres for local development and tests. `dir` = "memory://" for an in-memory DB. */
export async function createPgliteDb(dir: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(dir === "memory://" ? undefined : dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: process.env.LABVERSE_MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle") });
  // Offline/desktop databases need the reference content (levels, achievements, catalog) too.
  const res = (await db.execute(sql`select count(*)::int as n from levels`)) as unknown as { rows: { n: number }[] };
  if (!res.rows[0]?.n) {
    const { seedReferenceData } = await import("./seed");
    await seedReferenceData(db as unknown as DB);
  }
  return db as unknown as DB;
}
