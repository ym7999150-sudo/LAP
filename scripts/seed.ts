/* Idempotent seed: upserts reference content. Never deletes or truncates user data. */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { DB } from "../src/lib/db/client";
import { seedReferenceData } from "../src/lib/db/seed";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL / DIRECT_URL not set");
  process.exit(1);
}
const counts = await seedReferenceData(drizzle(neon(url)) as unknown as DB);
console.log("✓ seeded", counts);
