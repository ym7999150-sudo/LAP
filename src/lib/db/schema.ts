import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();

/* ------------------------------ identity ------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    /** 4-digit public tag to tell apart users with the same display name. */
    tag: text("tag").notNull(),
    locale: text("locale").notNull().default("ar"),
    role: text("role").notNull().default("user"), // 'user' | 'admin' — only set server-side
    /** Reserved for future account linking (email/OAuth). */
    linkedAccount: jsonb("linked_account"),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("users_display_name_idx").on(t.displayName)],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: ts("created_at"),
    lastSeenAt: ts("last_seen_at"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("user_sessions_token_hash_uq").on(t.tokenHash), index("user_sessions_user_idx").on(t.userId)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/* ------------------------------ gamification ------------------------------ */

export const userStatistics = pgTable(
  "user_statistics",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    totalXp: integer("total_xp").notNull().default(0),
    physicsXp: integer("physics_xp").notNull().default(0),
    chemistryXp: integer("chemistry_xp").notNull().default(0),
    experimentsCompleted: integer("experiments_completed").notNull().default(0),
    circuitsBuilt: integer("circuits_built").notNull().default(0),
    projectsSaved: integer("projects_saved").notNull().default(0),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("user_statistics_total_xp_idx").on(t.totalXp, t.userId)],
);

export const levels = pgTable("levels", {
  level: integer("level").primaryKey(),
  xpRequired: integer("xp_required").notNull(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
});

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionAr: text("description_ar").notNull(),
  xp: integer("xp").notNull().default(0),
  icon: text("icon").notNull().default("star"),
  category: text("category").notNull().default("general"),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: ts("unlocked_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })],
);

/** Idempotent ledger: (user_id, reward_key) is unique, so a reward can never be granted twice. */
export const xpTransactions = pgTable(
  "xp_transactions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rewardKey: text("reward_key").notNull(),
    amount: integer("amount").notNull(),
    category: text("category").notNull(), // physics | chemistry | circuit | experiment | general
    reason: text("reason").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [
    uniqueIndex("xp_transactions_user_reward_uq").on(t.userId, t.rewardKey),
    index("xp_transactions_created_idx").on(t.createdAt),
    index("xp_transactions_category_created_idx").on(t.category, t.createdAt),
  ],
);

export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    board: text("board").notNull(),
    period: text("period").notNull(),
    data: jsonb("data").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("leaderboard_snapshots_board_idx").on(t.board, t.period)],
);

/* ------------------------------ projects ------------------------------ */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    lab: text("lab").notNull(),
    scene: jsonb("scene").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    thumbnail: text("thumbnail"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("projects_owner_updated_idx").on(t.ownerId, t.updatedAt)],
);

export const projectVersions = pgTable(
  "project_versions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scene: jsonb("scene").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("project_versions_project_idx").on(t.projectId, t.createdAt)],
);

export const projectShares = pgTable(
  "project_shares",
  {
    token: text("token").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: ts("created_at"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    views: integer("views").notNull().default(0),
  },
  (t) => [index("project_shares_project_idx").on(t.projectId)],
);

/* ------------------------------ experiments & content ------------------------------ */

export const experimentDefinitions = pgTable("experiment_definitions", {
  id: text("id").primaryKey(),
  lab: text("lab").notNull(),
  curriculum: text("curriculum"),
  data: jsonb("data").notNull(),
  version: integer("version").notNull().default(1),
  published: boolean("published").notNull().default(true),
  updatedAt: ts("updated_at"),
});

export const experimentRuns = pgTable(
  "experiment_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    experimentId: text("experiment_id").notNull(),
    passed: boolean("passed").notNull(),
    result: jsonb("result").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("experiment_runs_user_idx").on(t.userId, t.experimentId)],
);

export const experimentResults = pgTable(
  "experiment_results",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    experimentId: text("experiment_id").notNull(),
    bestScore: real("best_score").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.experimentId] })],
);

export const componentDefinitions = pgTable("component_definitions", {
  type: text("type").primaryKey(),
  lab: text("lab").notNull(),
  category: text("category").notNull(),
  data: jsonb("data").notNull(),
  version: integer("version").notNull().default(1),
  validationStatus: text("validation_status").notNull().default("validated"),
  published: boolean("published").notNull().default(true),
});

export const chemicalSubstances = pgTable(
  "chemical_substances",
  {
    id: text("id").primaryKey(),
    formula: text("formula"),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    cls: text("cls").notNull(),
    data: jsonb("data").notNull(),
    source: text("source").notNull(),
    validationStatus: text("validation_status").notNull().default("validated"),
    published: boolean("published").notNull().default(true),
  },
  (t) => [index("chemical_substances_search_idx").using("gin", sql`to_tsvector('simple', ${t.nameEn} || ' ' || ${t.nameAr} || ' ' || coalesce(${t.formula}, ''))`)],
);

export const chemicalReactions = pgTable("chemical_reactions", {
  id: text("id").primaryKey(),
  types: jsonb("types").notNull(),
  data: jsonb("data").notNull(),
  safety: text("safety").notNull(),
  provenance: text("provenance").notNull(),
  version: integer("version").notNull().default(1),
  published: boolean("published").notNull().default(true),
});

export const reactionReagents = pgTable(
  "reaction_reagents",
  {
    reactionId: text("reaction_id")
      .notNull()
      .references(() => chemicalReactions.id, { onDelete: "cascade" }),
    substanceId: text("substance_id")
      .notNull()
      .references(() => chemicalSubstances.id, { onDelete: "restrict" }),
    role: text("role").notNull(), // reactant | product | catalyst
    coefficient: integer("coefficient").notNull(),
  },
  (t) => [primaryKey({ columns: [t.reactionId, t.substanceId, t.role] }), index("reaction_reagents_substance_idx").on(t.substanceId)],
);

export const educationalContent = pgTable("educational_content", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  data: jsonb("data").notNull(),
  published: boolean("published").notNull().default(true),
  updatedAt: ts("updated_at"),
});

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemType, t.itemId] })],
);

export const moderationEvents = pgTable(
  "moderation_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: ts("created_at"),
  },
  (t) => [index("moderation_events_status_idx").on(t.status, t.createdAt)],
);
