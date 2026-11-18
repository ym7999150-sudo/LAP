import { z } from "zod";
import { json, rateLimit, requireUser, route } from "@/lib/server/http";
import { duplicateProject } from "@/lib/server/services";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { db, params }) => {
  const user = await requireUser(db);
  await rateLimit(db, "project-create", 60, 3600, user.id);
  const { id } = await params;
  return json({ id: await duplicateProject(db, user.id, z.string().uuid().parse(id)) }, 201);
});
