import { beforeAll, describe, expect, it } from "vitest";
import type { DB } from "@/lib/db/client";
import { createPgliteDb } from "@/lib/db/pglite";
import { seedReferenceData } from "@/lib/db/seed";
import { CircuitBuilder } from "@/lib/sim/circuit/testkit";
import { emptyScene } from "@/lib/scene/schema";
import { evaluateCriteria, detectSceneAchievements } from "@/lib/curriculum/criteria";
import { validateDisplayName } from "./security";
import * as svc from "./services";

let db: DB;
beforeAll(async () => {
  db = await createPgliteDb("memory://");
  await seedReferenceData(db);
}, 60_000);

function litCircuit() {
  const c = new CircuitBuilder();
  const b = c.add("battery", { voltage: 6 });
  const s = c.add("switch", { closed: true });
  const l = c.add("bulb");
  c.wire(`${b}.pos`, `${s}.a`);
  c.wire(`${s}.b`, `${l}.a`);
  c.wire(`${l}.b`, `${b}.neg`);
  return c.doc;
}

describe("guest identity", () => {
  it("validates display names", () => {
    expect(validateDisplayName("  أحمد   علي ").ok).toBe(true);
    expect(validateDisplayName("a").ok).toBe(false);
    expect(validateDisplayName("x".repeat(40)).ok).toBe(false);
    expect(validateDisplayName("<script>").ok).toBe(false);
    expect(validateDisplayName("admin").ok).toBe(false);
  });

  it("creates a guest, restores the session and allows duplicate names", async () => {
    const a = await svc.createGuest(db, "Mona", "ar");
    const b = await svc.createGuest(db, "Mona", "en");
    expect(a.userId).not.toBe(b.userId);
    const u = await svc.userFromToken(db, a.token);
    expect(u?.id).toBe(a.userId);
    expect(u?.tag).toMatch(/^\d{4}$/);
    expect(await svc.userFromToken(db, "forged-token")).toBeNull();
    await svc.updateUser(db, a.userId, { displayName: "Mona S." });
    expect((await svc.getProfile(db, a.userId))?.displayName).toBe("Mona S.");
    await svc.revokeSession(db, a.token);
    expect(await svc.userFromToken(db, a.token)).toBeNull();
  });
});

describe("XP transactions", () => {
  it("is idempotent per reward key", async () => {
    const { userId } = await svc.createGuest(db, "Karim", "ar");
    const r1 = await svc.grantReward(db, userId, { rewardKey: "experiment:closed-circuit", amount: 40, category: "experiment", reason: "t" });
    const r2 = await svc.grantReward(db, userId, { rewardKey: "experiment:closed-circuit", amount: 40, category: "experiment", reason: "t" });
    expect(r1.granted).toBe(true);
    expect(r2.granted).toBe(false);
    const p = await svc.getProfile(db, userId);
    expect(p?.stats?.totalXp).toBe(40);
  });

  it("concurrent duplicate claims grant once", async () => {
    const { userId } = await svc.createGuest(db, "Race", "en");
    const results = await Promise.all(Array.from({ length: 5 }, () => svc.grantReward(db, userId, { rewardKey: "reaction:x", amount: 10, category: "chemistry", reason: "t" })));
    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect((await svc.getProfile(db, userId))?.stats?.chemistryXp).toBe(10);
  });

  it("unlocks achievements once and awards their XP", async () => {
    const { userId } = await svc.createGuest(db, "Ach", "en");
    expect((await svc.unlockAchievement(db, userId, "first_valid_circuit")).unlocked).toBe(true);
    expect((await svc.unlockAchievement(db, userId, "first_valid_circuit")).unlocked).toBe(false);
    expect((await svc.unlockAchievement(db, userId, "nope")).unlocked).toBe(false);
    const p = await svc.getProfile(db, userId);
    expect(p?.achievements.map((a) => a.id)).toEqual(["first_valid_circuit"]);
    expect(p?.stats?.totalXp).toBe(50);
  });

  it("rejects malformed reward input", async () => {
    const { userId } = await svc.createGuest(db, "Bad", "en");
    await expect(svc.grantReward(db, userId, { rewardKey: "x'; drop", amount: 1, category: "general", reason: "" })).rejects.toThrow();
    await expect(svc.grantReward(db, userId, { rewardKey: "ok", amount: 99999, category: "general", reason: "" })).rejects.toThrow();
  });
});

describe("leaderboards", () => {
  it("ranks deterministically with ties and paginates", async () => {
    const ids: string[] = [];
    for (const [name, xp] of [["L1", 300], ["L2", 500], ["L3", 300]] as const) {
      const { userId } = await svc.createGuest(db, name, "en");
      ids.push(userId);
      await svc.grantReward(db, userId, { rewardKey: "seed", amount: xp, category: "physics", reason: "t" });
    }
    const board = await svc.leaderboard(db, "physics", "all", 0, 100, ids[2]);
    const mine = board.rows.filter((r) => ids.includes(r.userId));
    expect(mine[0]!.displayName).toBe("L2");
    expect(mine[1]!.rank).toBe(mine[2]!.rank); // tie
    expect(mine[1]!.displayName).toBe("L1"); // earlier account first
    expect(board.me?.xp).toBe(300);
    const page = await svc.leaderboard(db, "physics", "week", 0, 1);
    expect(page.rows).toHaveLength(1);
    expect(page.total).toBeGreaterThanOrEqual(3);
  });
});

describe("projects", () => {
  it("saves, loads, duplicates, shares and enforces ownership", async () => {
    const alice = await svc.createGuest(db, "Alice", "en");
    const bob = await svc.createGuest(db, "Bob", "en");
    const id = await svc.createProject(db, alice.userId, "My circuit", litCircuit());
    const loaded = await svc.getProject(db, alice.userId, id);
    expect((loaded.scene as { objects: unknown[] }).objects).toHaveLength(3);

    await expect(svc.getProject(db, bob.userId, id)).rejects.toBeInstanceOf(svc.ForbiddenError);
    await expect(svc.updateProject(db, bob.userId, id, { title: "pwned" })).rejects.toBeInstanceOf(svc.ForbiddenError);
    await expect(svc.deleteProject(db, bob.userId, id)).rejects.toBeInstanceOf(svc.ForbiddenError);

    await svc.updateProject(db, alice.userId, id, { title: "Renamed" });
    const dup = await svc.duplicateProject(db, alice.userId, id);
    expect((await svc.getProject(db, alice.userId, dup)).title).toBe("Renamed (copy)");
    expect(await svc.listProjects(db, alice.userId)).toHaveLength(2);

    const token = await svc.shareProject(db, alice.userId, id);
    expect((await svc.getShared(db, token))?.title).toBe("Renamed");
    await svc.revokeShare(db, alice.userId, id);
    expect(await svc.getShared(db, token)).toBeNull();

    await svc.deleteProject(db, alice.userId, id);
    await expect(svc.getProject(db, alice.userId, id)).rejects.toBeInstanceOf(svc.NotFoundError);
  });

  it("rejects invalid scene documents", async () => {
    const u = await svc.createGuest(db, "Val", "en");
    await expect(svc.createProject(db, u.userId, "x", { schemaVersion: 1, lab: "physics", objects: "nope" })).rejects.toThrow(/invalid scene/);
    await expect(svc.createProject(db, u.userId, "x", { ...emptyScene("physics"), objects: [{ id: "a", type: "battery", position: [999, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], props: {} }] })).rejects.toThrow();
  });

  it("rate limiter blocks after the limit", async () => {
    const key = `test:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await svc.hitRateLimit(db, key, 3, 60));
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("server-side validation of experiment completion", () => {
  it("accepts a real lit circuit and rejects an open one", () => {
    expect(evaluateCriteria("bulb-lit-with-switch", litCircuit()).passed).toBe(true);
    const open = litCircuit();
    open.objects.find((o) => o.type === "switch")!.props.closed = false;
    expect(evaluateCriteria("bulb-lit-with-switch", open).passed).toBe(false);
    expect(detectSceneAchievements(litCircuit()).achievements).toContain("first_valid_circuit");
  });

  it("validates chemistry by replaying operations", () => {
    const doc = emptyScene("chemistry");
    doc.objects.push({ id: "T", type: "test-tube", position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], props: { capacity: 20 } });
    doc.chemistry.operations.push({ kind: "add", containerId: "T", substanceId: "hcl", volumeMl: 5 }, { kind: "add", containerId: "T", substanceId: "zn", massG: 0.2 });
    expect(evaluateCriteria("reaction:acid-metal-zn-hcl", doc).passed).toBe(true);
    doc.chemistry.operations.pop();
    expect(evaluateCriteria("reaction:acid-metal-zn-hcl", doc).passed).toBe(false);
  });
});
