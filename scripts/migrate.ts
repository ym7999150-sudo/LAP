/* Applies SQL migrations in ./drizzle to Neon (uses DIRECT_URL, falls back to DATABASE_URL). */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL / DIRECT_URL not set");
  process.exit(1);
}
await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
console.log("✓ migrations applied");
