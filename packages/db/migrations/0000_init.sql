CREATE TYPE "public"."check_in_status" AS ENUM('done', 'skipped', 'partial');--> statement-breakpoint
CREATE TYPE "public"."clip_domain" AS ENUM('sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health');--> statement-breakpoint
CREATE TYPE "public"."clip_status" AS ENUM('pending', 'approved', 'rejected', 'removed_from_source');--> statement-breakpoint
CREATE TYPE "public"."consent_scope" AS ENUM('account', 'health_adjacent', 'ai_free_text');--> statement-breakpoint
CREATE TYPE "public"."episode_availability" AS ENUM('available', 'removed_from_source', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."evidence_strength" AS ENUM('anecdotal', 'observational', 'rct', 'meta_analysis');--> statement-breakpoint
CREATE TYPE "public"."extraction_job_status" AS ENUM('pending', 'claimed', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', 'weekday', 'custom');--> statement-breakpoint
CREATE TYPE "public"."privacy_mode" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."speaker_status" AS ENUM('verified', 'unverified', 'host');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'curator', 'admin');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"goals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"privacy_mode" "privacy_mode" DEFAULT 'private' NOT NULL,
	"disclaimer_accepted_at" timestamp with time zone,
	"dob" date,
	"dob_jurisdiction" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "podcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"host" text,
	"trust_tier" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"podcast_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"title" text,
	"published_at" timestamp with time zone,
	"transcript_uri" text,
	"transcript_text" text,
	"availability" "episode_availability" DEFAULT 'available' NOT NULL,
	"last_oembed_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "episodes_youtube_video_id_unique" UNIQUE("youtube_video_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"youtube_video_id" text NOT NULL,
	"start_seconds" integer NOT NULL,
	"end_seconds" integer NOT NULL,
	"claim" text NOT NULL,
	"rationale" text,
	"speaker" text NOT NULL,
	"speaker_status" "speaker_status" NOT NULL,
	"domain" "clip_domain" NOT NULL,
	"evidence_strength" "evidence_strength",
	"risk_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "clip_status" DEFAULT 'pending' NOT NULL,
	"embedding" vector(1536),
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clip_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clip_id" uuid NOT NULL,
	"actor_id" uuid,
	"source" text NOT NULL,
	"field" text NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"accepted" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcript_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"start_seconds" integer,
	"end_seconds" integer,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"domain" "clip_domain" NOT NULL,
	"trigger" text,
	"tiny_action" text,
	"default_frequency" "frequency" DEFAULT 'daily' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_template_clips" (
	"habit_template_id" uuid NOT NULL,
	"clip_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "habit_template_clips_habit_template_id_clip_id_pk" PRIMARY KEY("habit_template_id","clip_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_template_id" uuid NOT NULL,
	"frequency" "frequency" NOT NULL,
	"custom_days" integer[],
	"time_of_day" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"check_in_date" date NOT NULL,
	"status" "check_in_status" NOT NULL,
	"mood" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_ins_user_habit_id_check_in_date_unique" UNIQUE("user_habit_id","check_in_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"current_length" integer DEFAULT 0 NOT NULL,
	"longest_length" integer DEFAULT 0 NOT NULL,
	"last_check_in_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streaks_user_habit_id_unique" UNIQUE("user_habit_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "streak_freezes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_habit_id" uuid NOT NULL,
	"banked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"podcast_id" uuid,
	"youtube_video_id" text NOT NULL,
	"status" "extraction_job_status" DEFAULT 'pending' NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clips_pending" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid,
	"extraction_job_id" uuid,
	"youtube_video_id" text NOT NULL,
	"start_seconds" integer NOT NULL,
	"end_seconds" integer NOT NULL,
	"claim" text NOT NULL,
	"rationale" text,
	"speaker" text NOT NULL,
	"speaker_status" "speaker_status" NOT NULL,
	"domain" "clip_domain" NOT NULL,
	"evidence_strength" "evidence_strength",
	"risk_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" "consent_scope" NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_hash" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "episodes" ADD CONSTRAINT "episodes_podcast_id_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "public"."podcasts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clips" ADD CONSTRAINT "clips_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clip_edits" ADD CONSTRAINT "clip_edits_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transcript_chunks" ADD CONSTRAINT "transcript_chunks_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_template_clips" ADD CONSTRAINT "habit_template_clips_habit_template_id_habit_templates_id_fk" FOREIGN KEY ("habit_template_id") REFERENCES "public"."habit_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_template_clips" ADD CONSTRAINT "habit_template_clips_clip_id_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_habit_template_id_habit_templates_id_fk" FOREIGN KEY ("habit_template_id") REFERENCES "public"."habit_templates"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_habit_id_user_habits_id_fk" FOREIGN KEY ("user_habit_id") REFERENCES "public"."user_habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_habit_id_user_habits_id_fk" FOREIGN KEY ("user_habit_id") REFERENCES "public"."user_habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "streak_freezes" ADD CONSTRAINT "streak_freezes_user_habit_id_user_habits_id_fk" FOREIGN KEY ("user_habit_id") REFERENCES "public"."user_habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_podcast_id_podcasts_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "public"."podcasts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clips_pending" ADD CONSTRAINT "clips_pending_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clips_pending" ADD CONSTRAINT "clips_pending_extraction_job_id_extraction_jobs_id_fk" FOREIGN KEY ("extraction_job_id") REFERENCES "public"."extraction_jobs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
