-- Classification v2: additive migration for two-level (group → niche) taxonomy.
-- Old columns (primary_category, secondary_category, community_category, override_from_category,
-- override_to_category, from_category, to_category) are preserved for dual-write transition.
-- Apply via `npm run db:push` for parity with prior migrations (no __drizzle_migrations backfill).

ALTER TABLE "user_subscriptions" ADD COLUMN "primary_group" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "primary_niche" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "secondary_group" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "secondary_niche" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "is_multi_topic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "classification_source" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "override_from_group" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "override_to_group" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "override_from_niche" text;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "override_to_niche" text;--> statement-breakpoint
ALTER TABLE "channel_metadata" ADD COLUMN "community_group" text;--> statement-breakpoint
ALTER TABLE "channel_metadata" ADD COLUMN "community_niche" text;
