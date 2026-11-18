import { z } from "zod";
import { json, requireUser, route } from "@/lib/server/http";
import { revokeShare, shareProject } from "@/lib/server/services";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { db, params }) => {
  const user = await requireUser(db);
  const { id } = await params;
  return json({ token: await shareProject(db, user.id, z.string().uuid().parse(id)) });
});

export const DELETE = route<Ctx>(async (_req, { db, params }) => {
  const user = await requireUser(db);
  const { id } = await params;
  await revokeShare(db, user.id, z.string().uuid().parse(id));
  return json({ ok: true });
});
