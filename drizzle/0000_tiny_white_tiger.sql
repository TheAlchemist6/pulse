CREATE TABLE "channel_metadata" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"keywords" text,
	"subscriber_count" bigint,
	"video_count" bigint,
	"view_count" bigint,
	"topic_categories" jsonb,
	"country" text,
	"thumbnail_url" text,
	"made_for_kids" boolean,
	"published_at" timestamp,
	"last_upload_at" timestamp,
	"community_category" text,
	"override_count" integer DEFAULT 0 NOT NULL,
	"override_consensus" bigint,
	"last_fetched_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_scores" (
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"consumption_rate" bigint,
	"last_watched_at" timestamp,
	"watch_gap_days" integer,
	"tier" text,
	"scored_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "override_log" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"from_category" text NOT NULL,
	"to_category" text NOT NULL,
	"ai_confidence_was" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_categories" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"channel_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"subscribed_at" timestamp,
	"rank" integer,
	"primary_category" text NOT NULL,
	"secondary_category" text,
	"ai_confidence" smallint NOT NULL,
	"ai_reasoning" text,
	"content_type" text,
	"posting_cadence" text,
	"status" text DEFAULT 'active' NOT NULL,
	"user_overridden" boolean DEFAULT false NOT NULL,
	"override_from_category" text,
	"override_to_category" text,
	"overridden_at" timestamp,
	"reviewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"country" text,
	"youtube_channel_id" text NOT NULL,
	"youtube_handle" text,
	"youtube_member_since" timestamp NOT NULL,
	"is_creator" boolean DEFAULT false NOT NULL,
	"subscription_count" integer DEFAULT 0 NOT NULL,
	"profile_summary" text,
	"dominant_themes" jsonb,
	"top_categories" jsonb,
	"diversity_score" bigint,
	"dead_channel_count" integer DEFAULT 0 NOT NULL,
	"onboarding_stage" text DEFAULT 'imported' NOT NULL,
	"oauth_access_token" text NOT NULL,
	"oauth_refresh_token" text NOT NULL,
	"oauth_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_scores" ADD CONSTRAINT "channel_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_scores" ADD CONSTRAINT "channel_scores_channel_id_channel_metadata_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel_metadata"("channel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "override_log" ADD CONSTRAINT "override_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "override_log" ADD CONSTRAINT "override_log_channel_id_channel_metadata_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel_metadata"("channel_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_channel_id_channel_metadata_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel_metadata"("channel_id") ON DELETE no action ON UPDATE no action;