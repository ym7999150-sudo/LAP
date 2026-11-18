import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DatabaseNotConfiguredError, getDb, type DB } from "@/lib/db/client";
import { hashIp } from "./security";
import { ForbiddenError, hitRateLimit, NotFoundError, userFromToken } from "./services";

export const SESSION_COOKIE = "lv_session";
export const MAX_BODY_BYTES = 600 * 1024;

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reject cross-site state-changing requests (CSRF defence in addition to SameSite=Lax cookies). */
export async function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "bad_origin");
  try {
    if (new URL(origin).host !== host) throw new HttpError(403, "bad_origin");
  } catch {
    throw new HttpError(403, "bad_origin");
  }
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

export async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return hashIp(ip);
}

export async function rateLimit(db: DB, action: string, limit: number, windowSec: number, subject?: string) {
  const key = `${action}:${subject ?? (await clientIpHash())}`;
  if (!(await hitRateLimit(db, key, limit, windowSec))) throw new HttpError(429, "rate_limited");
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function currentUser(db: DB) {
  return userFromToken(db, await sessionToken());
}

export async function requireUser(db: DB) {
  const u = await currentUser(db);
  if (!u) throw new HttpError(401, "unauthenticated");
  return u;
}

export function isAdmin(user: { id: string; role: string }) {
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return user.role === "admin" || ids.includes(user.id);
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

type Handler<C> = (req: Request, ctx: C & { db: DB }) => Promise<Response>;

/** Wraps a route handler with origin checks, DB access and safe error mapping. */
export function route<C = { params: Promise<Record<string, string>> }>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      await assertSameOrigin(req);
      const db = await getDb();
      return await fn(req, { ...ctx, db });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code }, e.status);
      if (e instanceof NotFoundError) return json({ error: "not_found" }, 404);
      if (e instanceof ForbiddenError) return json({ error: "forbidden" }, 403);
      if (e instanceof ZodError) return json({ error: "invalid_input", issues: e.issues.slice(0, 5).map((i) => i.path.join(".")) }, 400);
      if (e instanceof DatabaseNotConfiguredError) return json({ error: "database_not_configured" }, 503);
      if (e instanceof Error && /invalid scene|project limit|cannot change lab/.test(e.message)) return json({ error: e.message }, 400);
      console.error(JSON.stringify({ level: "error", at: req.url, message: e instanceof Error ? e.message : String(e) }));
      return json({ error: "internal_error" }, 500);
    }
  };
}
