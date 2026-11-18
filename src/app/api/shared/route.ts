import { json, route } from "@/lib/server/http";
import { listRecentShared } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, { db }) => json({ projects: await listRecentShared(db) }));
