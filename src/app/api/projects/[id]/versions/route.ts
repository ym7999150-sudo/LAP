import { z } from "zod";
import { json, readJson, requireUser, route } from "@/lib/server/http";
import { listVersions, restoreVersion } from "@/lib/server/services";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { db, params }) => {
  const user = await requireUser(db);
  const { id } = await params;
  return json({ versions: await listVersions(db, user.id, z.string().uuid().parse(id)) });
});

export const POST = route<Ctx>(async (req, { db, params }) => {
  const user = await requireUser(db);
  const { id } = await params;
  const { versionId } = z.object({ versionId: z.number().int().positive() }).parse(await readJson(req));
  await restoreVersion(db, user.id, z.string().uuid().parse(id), versionId);
  return json({ ok: true });
});
