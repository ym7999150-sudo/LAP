import { z } from "zod";
import { json, rateLimit, readJson, requireUser, route } from "@/lib/server/http";
import { createProject, listProjects, unlockAchievement } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = route(async (req, { db }) => {
  const user = await requireUser(db);
  const page = Math.max(0, Number(new URL(req.url).searchParams.get("page") ?? 0) || 0);
  return json({ projects: await listProjects(db, user.id, page) });
});

const body = z.object({ title: z.string().max(120), scene: z.unknown() });

export const POST = route(async (req, { db }) => {
  const user = await requireUser(db);
  await rateLimit(db, "project-create", 60, 3600, user.id);
  const b = body.parse(await readJson(req));
  const id = await createProject(db, user.id, b.title, b.scene);
  const ach = await unlockAchievement(db, user.id, "first_project");
  return json({ id, unlocked: ach.unlocked && ach.achievement ? [ach.achievement] : [] }, 201);
});
