import { z } from "zod";
import { HttpError, json, rateLimit, readJson, requireUser, route } from "@/lib/server/http";
import { completeExperiment } from "@/lib/server/rewards";
import { parseSceneDocument } from "@/lib/scene/migrate";

type Ctx = { params: Promise<{ id: string }> };
const body = z.object({ scene: z.unknown().optional(), answers: z.record(z.string().max(10), z.number().int().min(0).max(10)).default({}) });

export const POST = route<Ctx>(async (req, { db, params }) => {
  const user = await requireUser(db);
  await rateLimit(db, "experiment-complete", 60, 3600, user.id);
  const { id } = await params;
  const b = body.parse(await readJson(req));
  let doc = null;
  if (b.scene !== undefined) {
    const p = parseSceneDocument(b.scene);
    if (!p.ok) throw new HttpError(400, "invalid_scene");
    doc = p.doc;
  }
  const out = await completeExperiment(db, user.id, z.string().max(64).parse(id), doc, b.answers);
  if (!out) throw new HttpError(404, "not_found");
  return json(out);
});
