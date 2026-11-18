import { HttpError, json, rateLimit, readJson, requireUser, route } from "@/lib/server/http";
import { claimSceneRewards } from "@/lib/server/rewards";
import { parseSceneDocument } from "@/lib/scene/migrate";

export const dynamic = "force-dynamic";

/** The client sends only the scene; the server re-simulates it and decides what was earned. */
export const POST = route(async (req, { db }) => {
  const user = await requireUser(db);
  await rateLimit(db, "reward-claim", 120, 3600, user.id);
  const body = (await readJson<{ scene?: unknown }>(req)) ?? {};
  const parsed = parseSceneDocument(body.scene);
  if (!parsed.ok) throw new HttpError(400, "invalid_scene");
  return json(await claimSceneRewards(db, user.id, parsed.doc));
});
