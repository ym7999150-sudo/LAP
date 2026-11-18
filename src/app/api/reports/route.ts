import { z } from "zod";
import { HttpError, isAdmin, json, rateLimit, readJson, requireUser, route } from "@/lib/server/http";
import { listReports, reportContent, setReportStatus } from "@/lib/server/services";

export const dynamic = "force-dynamic";

const body = z.object({ targetType: z.enum(["substance", "reaction", "component", "experiment", "project"]), targetId: z.string().min(1).max(64), reason: z.string().min(3).max(1000) });

/** Anyone signed in can report incorrect content. */
export const POST = route(async (req, { db }) => {
  const user = await requireUser(db);
  await rateLimit(db, "report", 20, 3600, user.id);
  const b = body.parse(await readJson(req));
  await reportContent(db, user.id, b.targetType, b.targetId, b.reason);
  return json({ ok: true }, 201);
});

/** Admin only: list open reports. Admin rights come from ADMIN_USER_IDS or role, never display names. */
export const GET = route(async (_req, { db }) => {
  const user = await requireUser(db);
  if (!isAdmin(user)) throw new HttpError(403, "forbidden");
  return json({ reports: await listReports(db) });
});

export const PATCH = route(async (req, { db }) => {
  const user = await requireUser(db);
  if (!isAdmin(user)) throw new HttpError(403, "forbidden");
  const b = z.object({ id: z.number().int(), status: z.enum(["open", "resolved", "dismissed"]) }).parse(await readJson(req));
  await setReportStatus(db, b.id, b.status);
  return json({ ok: true });
});
