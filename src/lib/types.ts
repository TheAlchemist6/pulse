// Shared types for Pulse

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  country: string | null;
  youtube_channel_id: string;
  youtube_handle: string | null;
  youtube_member_since: Date;
  is_creator: boolean;
  subscription_count: number;
  profile_summary: string | null;
  dominant_themes: string[] | null;
  top_categories: string[] | null;
  diversity_score: number | null;
  dead_channel_count: number;
  onboarding_stage: "imported" | "audited" | "ranked" | "monitoring";
  oauth_access_token: string;
  oauth_refresh_token: string;
  oauth_expires_at: Date;
  created_at: Date;
  last_synced_at: Date | null;
  settings: Record<string, unknown>;
}

export interface Channel {
  id: string;
  title: string;
  description: string | null;
  keywords: string | null;
  subscriber_count: string | null;
  video_count: string | null;
  view_count: string | null;
  topic_categories: string[] | null;
  country: string | null;
  thumbnail_url: string | null;
  made_for_kids: boolean | null;
  published_at: Date | null;
  last_upload_at: Date | null;
  community_category: string | null;
  override_count: number;
  override_consensus: number | null;
  last_fetched_at: Date;
}

export interface Subscription {
  user_id: string;
  channel_id: string;
  channel: Channel;
  subscribed_at: Date | null;
  rank: number | null;
  primary_category: string;
  secondary_category: string | null;
  ai_confidence: number;
  ai_reasoning: string | null;
  content_type: string | null;
  posting_cadence: string | null;
  status: "active" | "muted" | "archived" | "unsubscribed_on_youtube";
  user_overridden: boolean;
  override_from_category: string | null;
  override_to_category: string | null;
  overridden_at: Date | null;
  reviewed: boolean;
  created_at: Date;
  last_synced_at: Date;
}

export interface Category {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_default: boolean;
  channel_count: number;
  created_at: Date;
  children?: Category[];
}

export interface OverrideLog {
  id: string;
  user_id: string;
  channel_id: string;
  from_category: string;
  to_category: string;
  ai_confidence_was: number;
  created_at: Date;
}

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export type ContentType = "educational" | "entertainment" | "news" | "tutorial" | "commentary" | "mixed";

export type PostingCadence = "daily" | "weekly" | "biweekly" | "monthly" | "irregular";

export type SubscriptionStatus = "active" | "muted" | "archived" | "unsubscribed_on_youtube";

export type OnboardingStage = "imported" | "audited" | "ranked" | "monitoring";
