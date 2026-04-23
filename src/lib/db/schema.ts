import { pgTable, text, timestamp, boolean, integer, smallint, bigint, jsonb, primaryKey, doublePrecision } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ============================================================
// Auth.js standard tables (required by DrizzleAdapter)
// ============================================================

export const authUsers = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (verificationToken) => ({
  compositePk: primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
}));

// ============================================================
// Pulse application tables
// ============================================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  youtubeChannelId: text("youtube_channel_id"),
  youtubeHandle: text("youtube_handle"),
  youtubeMemberSince: timestamp("youtube_member_since"),
  isCreator: boolean("is_creator").default(false).notNull(),
  subscriptionCount: integer("subscription_count").default(0).notNull(),
  archetype: text("archetype"),
  profileSummary: text("profile_summary"),
  dominantThemes: jsonb("dominant_themes"),
  topCategories: jsonb("top_categories"),
  diversityScore: doublePrecision("diversity_score"),
  deadChannelCount: integer("dead_channel_count").default(0).notNull(),
  onboardingStage: text("onboarding_stage").default("imported").notNull(),
  oauthAccessToken: text("oauth_access_token"),
  oauthRefreshToken: text("oauth_refresh_token"),
  oauthExpiresAt: timestamp("oauth_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  settings: jsonb("settings").default({}).notNull(),
});

export const channelMetadata = pgTable("channel_metadata", {
  channelId: text("channel_id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  keywords: text("keywords"),
  subscriberCount: bigint("subscriber_count", { mode: "number" }),
  videoCount: bigint("video_count", { mode: "number" }),
  viewCount: bigint("view_count", { mode: "number" }),
  topicCategories: jsonb("topic_categories"),
  country: text("country"),
  thumbnailUrl: text("thumbnail_url"),
  madeForKids: boolean("made_for_kids"),
  publishedAt: timestamp("published_at"),
  lastUploadAt: timestamp("last_upload_at"),
  communityCategory: text("community_category"),
  communityGroup: text("community_group"),
  communityNiche: text("community_niche"),
  overrideCount: integer("override_count").default(0).notNull(),
  overrideConsensus: doublePrecision("override_consensus"),
  lastFetchedAt: timestamp("last_fetched_at").notNull(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  userId: text("user_id").notNull().references(() => users.id),
  channelId: text("channel_id").notNull().references(() => channelMetadata.channelId),
  subscribedAt: timestamp("subscribed_at"),
  rank: integer("rank"),
  primaryCategory: text("primary_category").notNull(),
  secondaryCategory: text("secondary_category"),
  primaryGroup: text("primary_group"),
  primaryNiche: text("primary_niche"),
  secondaryGroup: text("secondary_group"),
  secondaryNiche: text("secondary_niche"),
  isMultiTopic: boolean("is_multi_topic").default(false).notNull(),
  classificationSource: text("classification_source").$type<
    "topic_map" | "keyword" | "video_titles" | "uncategorized" | "community" | "user"
  >(),
  aiConfidence: smallint("ai_confidence").notNull(),
  aiReasoning: text("ai_reasoning"),
  contentType: text("content_type"),
  postingCadence: text("posting_cadence"),
  status: text("status").default("active").notNull(),
  userOverridden: boolean("user_overridden").default(false).notNull(),
  overrideFromCategory: text("override_from_category"),
  overrideToCategory: text("override_to_category"),
  overrideFromGroup: text("override_from_group"),
  overrideToGroup: text("override_to_group"),
  overrideFromNiche: text("override_from_niche"),
  overrideToNiche: text("override_to_niche"),
  overriddenAt: timestamp("overridden_at"),
  reviewed: boolean("reviewed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.channelId] }),
}));

export const userCategories = pgTable("user_categories", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id").notNull().references(() => users.id),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isDefault: boolean("is_default").default(true).notNull(),
  channelCount: integer("channel_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const overrideLog = pgTable("override_log", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id").notNull().references(() => users.id),
  channelId: text("channel_id").notNull().references(() => channelMetadata.channelId),
  fromCategory: text("from_category").notNull(),
  toCategory: text("to_category").notNull(),
  aiConfidenceWas: smallint("ai_confidence_was").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelScores = pgTable("channel_scores", {
  userId: text("user_id").notNull().references(() => users.id),
  channelId: text("channel_id").notNull().references(() => channelMetadata.channelId),
  consumptionRate: doublePrecision("consumption_rate"),
  lastWatchedAt: timestamp("last_watched_at"),
  watchGapDays: integer("watch_gap_days"),
  tier: text("tier"),
  scoredAt: timestamp("scored_at"),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.channelId] }),
}));
