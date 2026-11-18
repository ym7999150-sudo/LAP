import { z } from "zod";
import { currentUser, json, route } from "@/lib/server/http";
import { leaderboard } from "@/lib/server/services";

export const dynamic = "force-dynamic";
const q = z.object({
  board: z.enum(["global", "physics", "chemistry", "circuit", "experiment"]).default("global"),
  period: z.enum(["all", "week", "month"]).default("all"),
  page: z.coerce.number().int().min(0).max(1000).default(0),
  size: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = route(async (req, { db }) => {
  const p = q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const me = await currentUser(db);
  return json(await leaderboard(db, p.board, p.period, p.page, p.size, me?.id));
});
