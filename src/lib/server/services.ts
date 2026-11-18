/**
 * Data-access services. Every function takes a DB handle so it can be tested
 * against an in-memory PGlite database with the real migrations.
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { ACHIEVEMENTS, levelForXp, type XpCategory } from "@/lib/gamification/config";
import { parseSceneDocument } from "@/lib/scene/migrate";
import { SCENE_SCHEMA_VERSION, type SceneDocument } from "@/lib/scene/schema";
import { hashToken, newId, newToken, tagFor } from "./security";

const SESSION_DAYS = 365;
type Row = Record<string, unknown>;
const rowsOf = (r: unknown): Row[] => ((r as { rows?: Row[] }).rows ?? (r as Row[])) as Row[];

/* ------------------------------ users & sessions ------------------------------ */

export async function createGuest(db: DB, displayName: string, locale: "ar" | "en") {
  const id = newId();
  const token = newToken();
  await db.insert(s.users).values({ id, displayName, tag: tagFor(id), locale });
  await db.insert(s.userStatistics).values({ userId: id });
  await db.insert(s.userSessions).values({
    id: newId(),
    userId: id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5),
  });
  return { userId: id, token };
}

export async function userFromToken(db: DB, token: string | undefined) {
  if (!token || token.length > 100) return null;
  const rows = await db
    .select({ user: s.users, sessionId: s.userSessions.id, lastSeen: s.userSessions.lastSeenAt })
    .from(s.userSessions)
    .innerJoin(s.users, eq(s.users.id, s.userSessions.userId))
    .where(and(eq(s.userSessions.tokenHash, hashToken(token)), isNull(s.userSessions.revokedAt), sql`${s.userSessions.expiresAt} > now()`))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  // Touch lastSeen at most every 10 minutes to limit writes.
  if (Date.now() - new Date(r.lastSeen).getTime() > 10 * 60_000) {
    await db.update(s.userSessions).set({ lastSeenAt: new Date() }).where(eq(s.userSessions.id, r.sessionId));
  }
  return r.user;
}

export async function revokeSession(db: DB, token: string) {
  await db.update(s.userSessions).set({ revokedAt: new Date() }).where(eq(s.userSessions.tokenHash, hashToken(token)));
}

export async function updateUser(db: DB, userId: string, patch: { displayName?: string; locale?: "ar" | "en"; isPublic?: boolean }) {
  await db.update(s.users).set({ ...patch, updatedAt: new Date() }).where(eq(s.users.id, userId));
}

export async function getProfile(db: DB, userId: string) {
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);
  if (!u) return null;
  const [stats] = await db.select().from(s.userStatistics).where(eq(s.userStatistics.userId, userId)).limit(1);
  const ach = await db.select().from(s.userAchievements).where(eq(s.userAchievements.userId, userId));
  const xp = stats?.totalXp ?? 0;
  const lv = levelForXp(xp);
  return {
    id: u.id,
    displayName: u.displayName,
    tag: u.tag,
    locale: u.locale,
    role: u.role,
    isPublic: u.isPublic,
    createdAt: u.createdAt,
    stats: stats ?? null,
    level: { level: lv.current.level, title: lv.current.title, next: lv.next, progress: lv.progress, xp },
    achievements: ach.map((a) => ({ id: a.achievementId, unlockedAt: a.unlockedAt })),
  };
}

/* ------------------------------ rate limiting ------------------------------ */

/** Fixed-window limiter stored in Postgres so it works across serverless instances. */
export async function hitRateLimit(db: DB, key: string, limit: number, windowSec: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  const res = await db.execute(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count`);
  const count = Number(rowsOf(res)[0]?.count ?? 0);
  return count <= limit;
}

/* ------------------------------ XP & achievements ------------------------------ */

export interface RewardInput {
  rewardKey: string;
  amount: number;
  category: XpCategory;
  reason: string;
  stat?: "experiments_completed" | "circuits_built" | "projects_saved";
}

/**
 * Idempotent XP grant in a single SQL statement: the unique (user_id, reward_key)
 * index guarantees a reward is counted at most once even under concurrent requests.
 */
export async function grantReward(db: DB, userId: string, r: RewardInput): Promise<{ granted: boolean; totalXp: number | null }> {
  if (!/^[a-z0-9_:.\-]{1,120}$/i.test(r.rewardKey) || r.amount < 0 || r.amount > 1000) throw new Error("invalid reward");
  const phys = r.category === "physics" || r.category === "circuit" ? r.amount : 0;
  const chem = r.category === "chemistry" ? r.amount : 0;
  const statCol = r.stat ? sql.raw(r.stat) : null;
  const res = await db.execute(sql`
    WITH ins AS (
      INSERT INTO xp_transactions (user_id, reward_key, amount, category, reason)
      VALUES (${userId}, ${r.rewardKey}, ${r.amount}, ${r.category}, ${r.reason})
      ON CONFLICT (user_id, reward_key) DO NOTHING
      RETURNING amount
    ), upd AS (
      UPDATE user_statistics SET
        total_xp = total_xp + ${r.amount},
        physics_xp = physics_xp + ${phys},
        chemistry_xp = chemistry_xp + ${chem},
        ${statCol ? sql`${statCol} = ${statCol} + 1,` : sql``}
        updated_at = now()
      WHERE user_id = ${userId} AND EXISTS (SELECT 1 FROM ins)
      RETURNING total_xp
    )
    SELECT (SELECT count(*) FROM ins) AS granted, (SELECT total_xp FROM upd) AS total`);
  const row = rowsOf(res)[0] ?? {};
  return { granted: Number(row.granted) > 0, totalXp: row.total == null ? null : Number(row.total) };
}

export async function unlockAchievement(db: DB, userId: string, achievementId: string) {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return { unlocked: false };
  const g = await grantReward(db, userId, { rewardKey: `achievement:${def.id}`, amount: def.xp, category: def.category, reason: `Achievement: ${def.title.en}` });
  await db.insert(s.userAchievements).values({ userId, achievementId: def.id }).onConflictDoNothing();
  return { unlocked: g.granted, achievement: def };
}

export async function countRewards(db: DB, userId: string, prefix: string) {
  const res = await db.execute(sql`SELECT count(*)::int AS n FROM xp_transactions WHERE user_id = ${userId} AND reward_key LIKE ${prefix + "%"}`);
  return Number(rowsOf(res)[0]?.n ?? 0);
}

/* ------------------------------ leaderboards ------------------------------ */

export type Board = "global" | "physics" | "chemistry" | "circuit" | "experiment";
export type Period = "all" | "week" | "month";

export async function leaderboard(db: DB, board: Board, period: Period, page: number, pageSize = 20, viewerId?: string) {
  const offset = Math.max(0, page) * pageSize;
  const since = period === "week" ? sql`now() - interval '7 days'` : period === "month" ? sql`now() - interval '30 days'` : null;
  const catFilter =
    board === "global" ? sql`TRUE` : board === "physics" ? sql`t.category IN ('physics','circuit')` : sql`t.category = ${board}`;
  // Deterministic ranking: XP desc, then earliest account, then id.
  const ranked = sql`
    WITH scores AS (
      SELECT t.user_id, SUM(t.amount)::int AS xp
      FROM xp_transactions t
      WHERE ${catFilter} ${since ? sql`AND t.created_at >= ${since}` : sql``}
      GROUP BY t.user_id
    ), ranked AS (
      SELECT sc.user_id, sc.xp, u.display_name, u.tag, u.created_at,
        RANK() OVER (ORDER BY sc.xp DESC) AS rank,
        ROW_NUMBER() OVER (ORDER BY sc.xp DESC, u.created_at ASC, u.id ASC) AS pos
      FROM scores sc JOIN users u ON u.id = sc.user_id
      WHERE u.is_public = TRUE AND sc.xp > 0
    )`;
  const res = await db.execute(sql`${ranked} SELECT user_id, xp, display_name, tag, rank FROM ranked ORDER BY pos LIMIT ${pageSize} OFFSET ${offset}`);
  const totalRes = await db.execute(sql`${ranked} SELECT count(*)::int AS n FROM ranked`);
  let me: { rank: number; xp: number } | null = null;
  if (viewerId) {
    const m = await db.execute(sql`${ranked} SELECT rank, xp FROM ranked WHERE user_id = ${viewerId}`);
    const r = rowsOf(m)[0];
    if (r) me = { rank: Number(r.rank), xp: Number(r.xp) };
  }
  return {
    rows: rowsOf(res).map((r) => ({ userId: String(r.user_id), xp: Number(r.xp), displayName: String(r.display_name), tag: String(r.tag), rank: Number(r.rank) })),
    total: Number(rowsOf(totalRes)[0]?.n ?? 0),
    page,
    pageSize,
    me,
  };
}

/* ------------------------------ projects ------------------------------ */

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}

const VERSION_INTERVAL_MS = 5 * 60_000;
const MAX_PROJECTS_PER_USER = 200;

function validScene(scene: unknown): SceneDocument {
  const p = parseSceneDocument(scene);
  if (!p.ok) throw new Error(`invalid scene: ${p.error}`);
  return p.doc;
}

export async function listProjects(db: DB, ownerId: string, page = 0, pageSize = 24) {
  return db
    .select({ id: s.projects.id, title: s.projects.title, lab: s.projects.lab, updatedAt: s.projects.updatedAt, createdAt: s.projects.createdAt })
    .from(s.projects)
    .where(and(eq(s.projects.ownerId, ownerId), isNull(s.projects.deletedAt)))
    .orderBy(desc(s.projects.updatedAt))
    .limit(pageSize)
    .offset(page * pageSize);
}

async function ownedProject(db: DB, ownerId: string, id: string) {
  const [p] = await db.select().from(s.projects).where(and(eq(s.projects.id, id), isNull(s.projects.deletedAt))).limit(1);
  if (!p) throw new NotFoundError();
  if (p.ownerId !== ownerId) throw new ForbiddenError();
  return p;
}

export async function getProject(db: DB, ownerId: string, id: string) {
  const p = await ownedProject(db, ownerId, id);
  const shares = await db.select().from(s.projectShares).where(and(eq(s.projectShares.projectId, id), isNull(s.projectShares.revokedAt)));
  return { ...p, shareToken: shares[0]?.token ?? null };
}

export async function createProject(db: DB, ownerId: string, title: string, scene: unknown) {
  const doc = validScene(scene);
  const res = await db.execute(sql`SELECT count(*)::int AS n FROM projects WHERE owner_id = ${ownerId} AND deleted_at IS NULL`);
  if (Number(rowsOf(res)[0]?.n ?? 0) >= MAX_PROJECTS_PER_USER) throw new Error("project limit reached");
  const id = newId();
  await db.insert(s.projects).values({ id, ownerId, title: title.slice(0, 120) || "Untitled", lab: doc.lab, scene: doc, schemaVersion: SCENE_SCHEMA_VERSION });
  await db.insert(s.projectVersions).values({ projectId: id, scene: doc, schemaVersion: SCENE_SCHEMA_VERSION });
  return id;
}

export async function updateProject(db: DB, ownerId: string, id: string, patch: { title?: string; scene?: unknown }) {
  const p = await ownedProject(db, ownerId, id);
  const set: Partial<typeof s.projects.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) set.title = patch.title.slice(0, 120) || "Untitled";
  if (patch.scene !== undefined) {
    const doc = validScene(patch.scene);
    if (doc.lab !== p.lab) throw new Error("cannot change lab");
    set.scene = doc;
    const [last] = await db.select({ createdAt: s.projectVersions.createdAt }).from(s.projectVersions).where(eq(s.projectVersions.projectId, id)).orderBy(desc(s.projectVersions.createdAt)).limit(1);
    if (!last || Date.now() - new Date(last.createdAt).getTime() > VERSION_INTERVAL_MS) {
      await db.insert(s.projectVersions).values({ projectId: id, scene: doc, schemaVersion: SCENE_SCHEMA_VERSION });
    }
  }
  await db.update(s.projects).set(set).where(eq(s.projects.id, id));
}

export async function listVersions(db: DB, ownerId: string, id: string) {
  await ownedProject(db, ownerId, id);
  return db.select({ id: s.projectVersions.id, createdAt: s.projectVersions.createdAt }).from(s.projectVersions).where(eq(s.projectVersions.projectId, id)).orderBy(desc(s.projectVersions.createdAt)).limit(30);
}

export async function restoreVersion(db: DB, ownerId: string, id: string, versionId: number) {
  await ownedProject(db, ownerId, id);
  const [v] = await db.select().from(s.projectVersions).where(and(eq(s.projectVersions.id, versionId), eq(s.projectVersions.projectId, id))).limit(1);
  if (!v) throw new NotFoundError();
  await updateProject(db, ownerId, id, { scene: v.scene });
}

export async function duplicateProject(db: DB, ownerId: string, id: string) {
  const p = await ownedProject(db, ownerId, id);
  return createProject(db, ownerId, `${p.title} (copy)`.slice(0, 120), p.scene);
}

export async function deleteProject(db: DB, ownerId: string, id: string) {
  await ownedProject(db, ownerId, id);
  await db.update(s.projects).set({ deletedAt: new Date() }).where(eq(s.projects.id, id));
  await db.update(s.projectShares).set({ revokedAt: new Date() }).where(eq(s.projectShares.projectId, id));
}

export async function shareProject(db: DB, ownerId: string, id: string) {
  await ownedProject(db, ownerId, id);
  const [existing] = await db.select().from(s.projectShares).where(and(eq(s.projectShares.projectId, id), isNull(s.projectShares.revokedAt))).limit(1);
  if (existing) return existing.token;
  const token = newToken(18);
  await db.insert(s.projectShares).values({ token, projectId: id });
  return token;
}

export async function revokeShare(db: DB, ownerId: string, id: string) {
  await ownedProject(db, ownerId, id);
  await db.update(s.projectShares).set({ revokedAt: new Date() }).where(and(eq(s.projectShares.projectId, id), isNull(s.projectShares.revokedAt)));
}

export async function getShared(db: DB, token: string) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return null;
  const rows = await db
    .select({ title: s.projects.title, lab: s.projects.lab, scene: s.projects.scene, updatedAt: s.projects.updatedAt, owner: s.users.displayName, tag: s.users.tag })
    .from(s.projectShares)
    .innerJoin(s.projects, eq(s.projects.id, s.projectShares.projectId))
    .innerJoin(s.users, eq(s.users.id, s.projects.ownerId))
    .where(and(eq(s.projectShares.token, token), isNull(s.projectShares.revokedAt), isNull(s.projects.deletedAt)))
    .limit(1);
  if (!rows[0]) return null;
  await db.update(s.projectShares).set({ views: sql`${s.projectShares.views} + 1` }).where(eq(s.projectShares.token, token));
  return rows[0];
}

export async function listRecentShared(db: DB, limit = 24) {
  return db
    .select({ token: s.projectShares.token, title: s.projects.title, lab: s.projects.lab, updatedAt: s.projects.updatedAt, owner: s.users.displayName, tag: s.users.tag, views: s.projectShares.views })
    .from(s.projectShares)
    .innerJoin(s.projects, eq(s.projects.id, s.projectShares.projectId))
    .innerJoin(s.users, eq(s.users.id, s.projects.ownerId))
    .where(and(isNull(s.projectShares.revokedAt), isNull(s.projects.deletedAt), eq(s.users.isPublic, true)))
    .orderBy(desc(s.projectShares.createdAt))
    .limit(limit);
}

/* ------------------------------ favorites & reports ------------------------------ */

export async function toggleFavorite(db: DB, userId: string, itemType: string, itemId: string, on: boolean) {
  if (on) await db.insert(s.favorites).values({ userId, itemType, itemId }).onConflictDoNothing();
  else await db.delete(s.favorites).where(and(eq(s.favorites.userId, userId), eq(s.favorites.itemType, itemType), eq(s.favorites.itemId, itemId)));
}

export async function listFavorites(db: DB, userId: string) {
  return db.select({ itemType: s.favorites.itemType, itemId: s.favorites.itemId }).from(s.favorites).where(eq(s.favorites.userId, userId));
}

export async function reportContent(db: DB, reporterId: string, targetType: string, targetId: string, reason: string) {
  await db.insert(s.moderationEvents).values({ reporterId, targetType, targetId, reason: reason.slice(0, 1000) });
}

export async function listRewardKeys(db: DB, userId: string, prefix: string): Promise<string[]> {
  const res = await db.execute(sql`SELECT reward_key FROM xp_transactions WHERE user_id = ${userId} AND reward_key LIKE ${prefix + "%"}`);
  return rowsOf(res).map((r) => String(r.reward_key));
}

export async function recordExperimentRun(db: DB, userId: string, experimentId: string, passed: boolean, result: unknown) {
  await db.insert(s.experimentRuns).values({ userId, experimentId, passed, result });
  if (passed) {
    await db
      .insert(s.experimentResults)
      .values({ userId, experimentId, bestScore: 1, completedAt: new Date() })
      .onConflictDoUpdate({ target: [s.experimentResults.userId, s.experimentResults.experimentId], set: { bestScore: 1 } });
  }
}

export async function completedExperiments(db: DB, userId: string): Promise<string[]> {
  const rows = await db.select({ id: s.experimentResults.experimentId }).from(s.experimentResults).where(eq(s.experimentResults.userId, userId));
  return rows.map((r) => r.id);
}

export async function listReports(db: DB, status = "open") {
  return db.select().from(s.moderationEvents).where(eq(s.moderationEvents.status, status)).orderBy(desc(s.moderationEvents.createdAt)).limit(100);
}

export async function setReportStatus(db: DB, id: number, status: "open" | "resolved" | "dismissed") {
  await db.update(s.moderationEvents).set({ status }).where(eq(s.moderationEvents.id, id));
}
