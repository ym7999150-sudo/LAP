import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clearSessionCookie, HttpError, json, rateLimit, readJson, requireUser, route, sessionToken, setSessionCookie } from "@/lib/server/http";
import { validateDisplayName } from "@/lib/server/security";
import { createGuest, getProfile, revokeSession, updateUser, userFromToken } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const u = await userFromToken(db, await sessionToken());
    return json({ user: u ? await getProfile(db, u.id) : null });
  } catch {
    return json({ user: null, error: "database_unavailable" });
  }
}

const createBody = z.object({ displayName: z.string(), locale: z.enum(["ar", "en"]).default("ar") });

export const POST = route(async (req, { db }) => {
  await rateLimit(db, "session-create", 10, 3600);
  const body = createBody.parse(await readJson(req));
  const v = validateDisplayName(body.displayName);
  if (!v.ok) throw new HttpError(400, v.error);
  const { userId, token } = await createGuest(db, v.name, body.locale);
  await setSessionCookie(token);
  return json({ user: await getProfile(db, userId) }, 201);
});

const patchBody = z.object({ displayName: z.string().optional(), locale: z.enum(["ar", "en"]).optional(), isPublic: z.boolean().optional() });

export const PATCH = route(async (req, { db }) => {
  const user = await requireUser(db);
  await rateLimit(db, "profile-update", 30, 3600, user.id);
  const body = patchBody.parse(await readJson(req));
  const patch: { displayName?: string; locale?: "ar" | "en"; isPublic?: boolean } = {};
  if (body.locale) patch.locale = body.locale;
  if (body.isPublic !== undefined) patch.isPublic = body.isPublic;
  if (body.displayName !== undefined) {
    const v = validateDisplayName(body.displayName);
    if (!v.ok) throw new HttpError(400, v.error);
    patch.displayName = v.name;
  }
  await updateUser(db, user.id, patch);
  return json({ user: await getProfile(db, user.id) });
});

export const DELETE = route(async (_req, { db }) => {
  const token = await sessionToken();
  if (token) await revokeSession(db, token);
  await clearSessionCookie();
  return json({ ok: true });
});
