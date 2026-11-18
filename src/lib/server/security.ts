import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

const DEV_SECRET = "labverse-dev-only-secret-do-not-use-in-production";

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !process.env.LABVERSE_ALLOW_PGLITE) {
    throw new Error("SESSION_SECRET must be set (≥ 32 chars) in production");
  }
  return DEV_SECRET;
}

export const newId = () => randomUUID();
export const newToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const hashToken = (token: string) => createHmac("sha256", sessionSecret()).update(token).digest("hex");
export const hashIp = (ip: string) => createHash("sha256").update(`${sessionSecret()}:${ip}`).digest("hex").slice(0, 32);

/** 4-digit public discriminator derived from the internal id. */
export const tagFor = (userId: string) => String(parseInt(createHash("sha1").update(userId).digest("hex").slice(0, 8), 16) % 10000).padStart(4, "0");

const NAME_RE = /^[\p{L}\p{N} _.\-']+$/u;
export function validateDisplayName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "name_required" };
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2) return { ok: false, error: "name_too_short" };
  if (name.length > 32) return { ok: false, error: "name_too_long" };
  if (!NAME_RE.test(name)) return { ok: false, error: "name_invalid_chars" };
  const lower = name.toLowerCase();
  if (["admin", "administrator", "moderator", "labverse", "system", "مدير", "مشرف"].some((r) => lower === r)) return { ok: false, error: "name_reserved" };
  return { ok: true, name };
}
