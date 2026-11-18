CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"description_en" text NOT NULL,
	"description_ar" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"icon" text DEFAULT 'star' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chemical_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"types" jsonb NOT NULL,
	"data" jsonb NOT NULL,
	"safety" text NOT NULL,
	"provenance" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chemical_substances" (
	"id" text PRIMARY KEY NOT NULL,
	"formula" text,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"cls" text NOT NULL,
	"data" jsonb NOT NULL,
	"source" text NOT NULL,
	"validation_status" text DEFAULT 'validated' NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_definitions" (
	"type" text PRIMARY KEY NOT NULL,
	"lab" text NOT NULL,
	"category" text NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"validation_status" text DEFAULT 'validated' NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "educational_content" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"lab" text NOT NULL,
	"curriculum" text,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_results" (
	"user_id" uuid NOT NULL,
	"experiment_id" text NOT NULL,
	"best_score" real DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "experiment_results_user_id_experiment_id_pk" PRIMARY KEY("user_id","experiment_id")
);
--> statement-breakpoint
CREATE TABLE "experiment_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"experiment_id" text NOT NULL,
	"passed" boolean NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_item_type_item_id_pk" PRIMARY KEY("user_id","item_type","item_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"board" text NOT NULL,
	"period" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"level" integer PRIMARY KEY NOT NULL,
	"xp_required" integer NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"reporter_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_shares" (
	"token" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"scene" jsonb NOT NULL,
	"schema_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"lab" text NOT NULL,
	"scene" jsonb NOT NULL,
	"schema_version" integer NOT NULL,
	"thumbnail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "reaction_reagents" (
	"reaction_id" text NOT NULL,
	"substance_id" text NOT NULL,
	"role" text NOT NULL,
	"coefficient" integer NOT NULL,
	CONSTRAINT "reaction_reagents_reaction_id_substance_id_role_pk" PRIMARY KEY("reaction_id","substance_id","role")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_statistics" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"physics_xp" integer DEFAULT 0 NOT NULL,
	"chemistry_xp" integer DEFAULT 0 NOT NULL,
	"experiments_completed" integer DEFAULT 0 NOT NULL,
	"circuits_built" integer DEFAULT 0 NOT NULL,
	"projects_saved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"tag" text NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"linked_account" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_key" text NOT NULL,
	"amount" integer NOT NULL,
	"category" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_results" ADD CONSTRAINT "experiment_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_runs" ADD CONSTRAINT "experiment_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_reagents" ADD CONSTRAINT "reaction_reagents_reaction_id_chemical_reactions_id_fk" FOREIGN KEY ("reaction_id") REFERENCES "public"."chemical_reactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction_reagents" ADD CONSTRAINT "reaction_reagents_substance_id_chemical_substances_id_fk" FOREIGN KEY ("substance_id") REFERENCES "public"."chemical_substances"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_statistics" ADD CONSTRAINT "user_statistics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chemical_substances_search_idx" ON "chemical_substances" USING gin (to_tsvector('simple', "name_en" || ' ' || "name_ar" || ' ' || coalesce("formula", '')));--> statement-breakpoint
CREATE INDEX "experiment_runs_user_idx" ON "experiment_runs" USING btree ("user_id","experiment_id");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_board_idx" ON "leaderboard_snapshots" USING btree ("board","period");--> statement-breakpoint
CREATE INDEX "moderation_events_status_idx" ON "moderation_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "project_shares_project_idx" ON "project_shares" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_versions_project_idx" ON "project_versions" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_owner_updated_idx" ON "projects" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "reaction_reagents_substance_idx" ON "reaction_reagents" USING btree ("substance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_token_hash_uq" ON "user_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_statistics_total_xp_idx" ON "user_statistics" USING btree ("total_xp","user_id");--> statement-breakpoint
CREATE INDEX "users_display_name_idx" ON "users" USING btree ("display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_transactions_user_reward_uq" ON "xp_transactions" USING btree ("user_id","reward_key");--> statement-breakpoint
CREATE INDEX "xp_transactions_created_idx" ON "xp_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "xp_transactions_category_created_idx" ON "xp_transactions" USING btree ("category","created_at");