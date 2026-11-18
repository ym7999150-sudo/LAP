import { z } from "zod";
import { json, rateLimit, readJson, requireUser, route } from "@/lib/server/http";
import { deleteProject, getProject, updateProject } from "@/lib/server/services";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const uuid = z.string().uuid();

export const GET = route<Ctx>(async (_req, { db, params }) => {
  const user = await requireUser(db);
  const { id } = await params;
  return json({ project: await getProject(db, user.id, uuid.parse(id)) });
});

const patch = z.object({ title: z.string().max(120).optional(), scene: z.unknown().optional() });

export const PATCH = route<Ctx>(async (req, { db, params }) => {
  const user = await requireUser(db);
  await rateLimit(db, "project-save", 300, 3600, user.id);
  const { id } = await params;
  const b = patch.parse(await readJson(req));
  await updateProject(db, user.id, uuid.parse(id), b);
  return json({ ok: true });
});

export const DELETE = route<Ctx>(async (_req, { db, params }) => {
  const user = await requireUser(db);
  const { id } = await params;
  await deleteProject(db, user.id, uuid.parse(id));
  return json({ ok: true });
});
