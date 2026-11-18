import { z } from "zod";
import { json, readJson, requireUser, route } from "@/lib/server/http";
import { listFavorites, toggleFavorite } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, { db }) => {
  const user = await requireUser(db);
  return json({ favorites: await listFavorites(db, user.id) });
});

const body = z.object({ itemType: z.enum(["component", "substance", "reaction", "experiment"]), itemId: z.string().min(1).max(64), on: z.boolean() });

export const POST = route(async (req, { db }) => {
  const user = await requireUser(db);
  const b = body.parse(await readJson(req));
  await toggleFavorite(db, user.id, b.itemType, b.itemId, b.on);
  return json({ ok: true });
});
