import type { DB } from "@/lib/db/client";
import { findReactionById } from "@/lib/chem/reactions";
import { ANSWERS } from "@/lib/curriculum/answers";
import { detectSceneAchievements, evaluateCriteria } from "@/lib/curriculum/criteria";
import { EXPERIMENTS, getExperiment } from "@/lib/curriculum/experiments";
import { ACHIEVEMENTS, XP, type AchievementDef } from "@/lib/gamification/config";
import type { SceneDocument } from "@/lib/scene/schema";
import { completedExperiments, getProfile, grantReward, listRewardKeys, recordExperimentRun, unlockAchievement } from "./services";

export interface RewardOutcome {
  xpGained: number;
  unlocked: AchievementDef[];
  newReactions: string[];
  levelBefore: number;
  levelAfter: number;
}

async function level(db: DB, userId: string) {
  return (await getProfile(db, userId))?.level.level ?? 1;
}

async function unlockMany(db: DB, userId: string, ids: string[], out: RewardOutcome) {
  for (const id of ids) {
    const r = await unlockAchievement(db, userId, id);
    if (r.unlocked && r.achievement) {
      out.unlocked.push(r.achievement);
      out.xpGained += r.achievement.xp;
    }
  }
}

/** Validate a free-form scene on the server and grant any rewards it earns. */
export async function claimSceneRewards(db: DB, userId: string, doc: SceneDocument): Promise<RewardOutcome> {
  const out: RewardOutcome = { xpGained: 0, unlocked: [], newReactions: [], levelBefore: await level(db, userId), levelAfter: 0 };
  const det = detectSceneAchievements(doc);
  if (det.achievements.includes("first_valid_circuit")) {
    await grantReward(db, userId, { rewardKey: "stat:first-circuit", amount: 0, category: "circuit", reason: "circuit built", stat: "circuits_built" });
  }
  await unlockMany(db, userId, det.achievements, out);
  for (const rid of det.reactions) {
    const g = await grantReward(db, userId, { rewardKey: `reaction:${rid}`, amount: XP.reactionDiscovered, category: "chemistry", reason: `Reaction ${rid}` });
    if (g.granted) {
      out.newReactions.push(rid);
      out.xpGained += XP.reactionDiscovered;
    }
  }
  if (det.reactions.length) {
    const keys = (await listRewardKeys(db, userId, "reaction:")).map((k) => k.slice(9));
    const ach: string[] = ["first_chem_reaction"];
    if (keys.length >= 5) ach.push("chem_5_reactions");
    if (keys.length >= 15) ach.push("chem_15_reactions");
    if (keys.filter((k) => findReactionById(k)?.observations.precipitate).length >= 3) ach.push("precipitate_hunter");
    if (keys.some((k) => findReactionById(k)?.observations.flame)) ach.push("pyro_virtual");
    await unlockMany(db, userId, ach, out);
  }
  out.levelAfter = await level(db, userId);
  return out;
}

export interface ExperimentOutcome extends RewardOutcome {
  passed: boolean;
  criteriaPassed: boolean;
  questionResults: Record<string, boolean>;
  reason?: string;
}

export async function completeExperiment(db: DB, userId: string, experimentId: string, doc: SceneDocument | null, answers: Record<string, number>): Promise<ExperimentOutcome | null> {
  const exp = getExperiment(experimentId);
  if (!exp) return null;
  const out: ExperimentOutcome = { xpGained: 0, unlocked: [], newReactions: [], levelBefore: await level(db, userId), levelAfter: 0, passed: false, criteriaPassed: false, questionResults: {} };

  let crit = { passed: exp.criteria === "quiz-only" } as { passed: boolean; reason?: string };
  if (exp.criteria !== "quiz-only") crit = doc ? evaluateCriteria(exp.criteria, doc) : { passed: false, reason: "scene required" };
  out.criteriaPassed = crit.passed;
  out.reason = crit.passed ? undefined : crit.reason;

  const key = ANSWERS[exp.id] ?? {};
  for (const q of exp.questions) {
    const ok = answers[q.id] === key[q.id];
    out.questionResults[q.id] = ok;
    if (ok) {
      const g = await grantReward(db, userId, { rewardKey: `quiz:${exp.id}:${q.id}`, amount: XP.quizCorrect, category: "experiment", reason: `Quiz ${exp.id}/${q.id}` });
      if (g.granted) out.xpGained += XP.quizCorrect;
    }
  }
  const allCorrect = exp.questions.every((q) => out.questionResults[q.id]);
  out.passed = crit.passed && allCorrect;
  await recordExperimentRun(db, userId, exp.id, out.passed, { criteria: crit, questions: out.questionResults });

  if (out.passed) {
    const category = exp.lab === "physics" ? "physics" : exp.lab === "chemistry" ? "chemistry" : "experiment";
    const g = await grantReward(db, userId, { rewardKey: `experiment:${exp.id}`, amount: exp.xp, category, reason: `Experiment ${exp.id}`, stat: "experiments_completed" });
    if (g.granted) out.xpGained += exp.xp;
    const ach = ["first_experiment"];
    if (exp.achievement && exp.achievement !== "series_parallel_master") ach.push(exp.achievement);
    const done = await completedExperiments(db, userId);
    if (done.includes("series-circuit") && done.includes("parallel-circuit")) ach.push("series_parallel_master");
    if (exp.unit) {
      const unitIds = EXPERIMENTS.filter((e) => e.unit === exp.unit).map((e) => e.id);
      if (unitIds.every((id) => done.includes(id))) ach.push("first_learning_path");
    }
    await unlockMany(db, userId, ach.filter((a) => ACHIEVEMENTS.some((d) => d.id === a)), out);
    if (doc) {
      const extra = await claimSceneRewards(db, userId, doc);
      out.xpGained += extra.xpGained;
      out.unlocked.push(...extra.unlocked);
      out.newReactions.push(...extra.newReactions);
    }
  }
  out.levelAfter = await level(db, userId);
  return out;
}
