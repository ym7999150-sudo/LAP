import { sql } from "drizzle-orm";
import { COMPONENTS } from "@/lib/registry";
import { SUBSTANCES } from "@/lib/chem/substances";
import { REACTIONS } from "@/lib/chem/reactions";
import { EXPERIMENTS } from "@/lib/curriculum/experiments";
import { ACHIEVEMENTS, LEVELS } from "@/lib/gamification/config";
import type { DB } from "./client";
import * as s from "./schema";

const ex = (col: string) => sql.raw(`excluded.${col}`);

/** Upserts levels, achievements, catalog and experiments. Safe to run repeatedly in production. */
export async function seedReferenceData(db: DB) {
  await db
    .insert(s.levels)
    .values(LEVELS.map((l) => ({ level: l.level, xpRequired: l.xpRequired, titleEn: l.title.en, titleAr: l.title.ar })))
    .onConflictDoUpdate({ target: s.levels.level, set: { xpRequired: ex("xp_required"), titleEn: ex("title_en"), titleAr: ex("title_ar") } });
  await db
    .insert(s.achievements)
    .values(ACHIEVEMENTS.map((a) => ({ id: a.id, titleEn: a.title.en, titleAr: a.title.ar, descriptionEn: a.description.en, descriptionAr: a.description.ar, xp: a.xp, icon: a.icon, category: a.category })))
    .onConflictDoUpdate({ target: s.achievements.id, set: { titleEn: ex("title_en"), titleAr: ex("title_ar"), descriptionEn: ex("description_en"), descriptionAr: ex("description_ar"), xp: ex("xp"), icon: ex("icon"), category: ex("category") } });
  await db
    .insert(s.componentDefinitions)
    .values(COMPONENTS.map((c) => ({ type: c.type, lab: c.lab, category: c.category, data: c, version: c.version })))
    .onConflictDoUpdate({ target: s.componentDefinitions.type, set: { lab: ex("lab"), category: ex("category"), data: ex("data"), version: ex("version") } });
  await db
    .insert(s.chemicalSubstances)
    .values(SUBSTANCES.map((x) => ({ id: x.id, formula: x.formula, nameEn: x.name.en, nameAr: x.name.ar, cls: x.cls, data: x, source: x.source })))
    .onConflictDoUpdate({ target: s.chemicalSubstances.id, set: { formula: ex("formula"), nameEn: ex("name_en"), nameAr: ex("name_ar"), cls: ex("cls"), data: ex("data"), source: ex("source") } });
  await db
    .insert(s.chemicalReactions)
    .values(REACTIONS.map((r) => ({ id: r.id, types: r.types, data: r, safety: r.safety, provenance: r.provenance })))
    .onConflictDoUpdate({ target: s.chemicalReactions.id, set: { types: ex("types"), data: ex("data"), safety: ex("safety"), provenance: ex("provenance") } });
  const reagents = REACTIONS.flatMap((r) => [
    ...r.reactants.map((t) => ({ reactionId: r.id, substanceId: t.id, role: "reactant", coefficient: t.coeff })),
    ...r.products.map((t) => ({ reactionId: r.id, substanceId: t.id, role: "product", coefficient: t.coeff })),
    ...(r.conditions.catalyst ? [{ reactionId: r.id, substanceId: r.conditions.catalyst, role: "catalyst", coefficient: 0 }] : []),
  ]);
  await db.insert(s.reactionReagents).values(reagents).onConflictDoUpdate({ target: [s.reactionReagents.reactionId, s.reactionReagents.substanceId, s.reactionReagents.role], set: { coefficient: ex("coefficient") } });
  await db
    .insert(s.experimentDefinitions)
    .values(EXPERIMENTS.map((e) => ({ id: e.id, lab: e.lab, curriculum: e.unit ?? null, data: e })))
    .onConflictDoUpdate({ target: s.experimentDefinitions.id, set: { lab: ex("lab"), curriculum: ex("curriculum"), data: ex("data"), updatedAt: sql`now()` } });
  return { levels: LEVELS.length, achievements: ACHIEVEMENTS.length, components: COMPONENTS.length, substances: SUBSTANCES.length, reactions: REACTIONS.length, experiments: EXPERIMENTS.length };
}
