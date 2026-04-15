import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// Taxonomy Definition
// ============================================================================

export const TAXONOMY = {
  "Technology & Software": [
    "Programming & Dev",
    "AI & Machine Learning",
    "Hardware & Gadgets",
    "Cybersecurity",
    "Tech News & Reviews",
  ],
  "Business & Finance": [
    "Investing & Markets",
    "Entrepreneurship",
    "Personal Finance",
    "Crypto & Web3",
    "Economics & Policy",
  ],
  "Creator Economy & Media": [
    "Content Strategy & Growth",
    "Podcasting",
    "Newsletter & Writing",
    "Personal Brand & Audience Building",
  ],
  "Science & Education": [
    "Science & Physics",
    "Mathematics",
    "History & Geopolitics",
    "Philosophy",
    "Courses & Tutorials",
  ],
  "Creative & Design": [
    "Film & Video Production",
    "Graphic Design & Art",
    "Music Production",
    "Photography",
    "Writing & Storytelling",
  ],
  "Lifestyle & Health": [
    "Fitness & Nutrition",
    "Mental Health & Productivity",
    "Cooking & Food",
    "Travel & Vlogs",
    "Fashion & Beauty",
  ],
  Gaming: [
    "Game Reviews & News",
    "Let's Plays & Streams",
    "Esports",
    "Game Development",
  ],
  Entertainment: [
    "Comedy & Sketches",
    "Podcasts & Commentary",
    "Movies & TV Discussion",
    "Animation",
    "Music & Music Videos",
  ],
  "News & Politics": [
    "Current Events",
    "Political Commentary",
    "Investigative Journalism",
    "Cultural Commentary",
  ],
  Sports: [
    "Traditional Sports",
    "Combat Sports",
    "Motorsport",
    "Sports Analysis",
  ],
} as const;

export type LeafCategory = (typeof TAXONOMY)[keyof typeof TAXONOMY][number];
export type TopLevelCategory = keyof typeof TAXONOMY;

export const ALL_LEAF_CATEGORIES: string[] = Object.values(TAXONOMY).flat();
export const ALL_TOP_LEVEL_CATEGORIES: string[] = Object.keys(TAXONOMY);

// ============================================================================
// Types
// ============================================================================

export interface ChannelSignalBundle {
  channelId: string;
  name: string;
  description: string;
  keywords: string;
  topicCategories: string[];
  subscriberCount: number;
  videoCount: number;
  channelAge: string;
  country: string;
  madeForKids: boolean;
}

export interface ChannelClassification {
  channelId: string;
  primaryCategory: LeafCategory;
  secondaryCategory: LeafCategory | null;
  confidence: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
  contentType:
    | "educational"
    | "entertainment"
    | "news"
    | "tutorial"
    | "commentary"
    | "mixed";
  postingCadence: "daily" | "weekly" | "biweekly" | "monthly" | "irregular";
}

export interface ProfileAnalysis {
  profileSummary: string;
  dominantThemes: string[];
  categoryAdjustments: {
    channelId: string;
    from: LeafCategory;
    to: LeafCategory;
    reason: string;
  }[];
  outliers: {
    channelId: string;
    reason: string;
  }[];
  redundancies: {
    channels: string[];
    topic: string;
  }[];
  subscriptionEras: {
    period: string;
    name: string;
    channels: string[];
    theme: string;
  }[];
}

export interface CategoryDistribution {
  [category: string]: {
    count: number;
    subcategories?: {
      [subcategory: string]: number;
    };
  };
}

// ============================================================================
// AI Client
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Error Handling with Retry
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    delayMs = RETRY_DELAY_MS,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes("invalid") ||
          error.message.includes("400") ||
          error.message.includes("401") ||
          error.message.includes("403"))
      ) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

// ============================================================================
// Pass 1: Deep Classification (with community override check)
// ============================================================================

const PASS1_SYSTEM_PROMPT = `You are categorizing YouTube channels for a subscription manager.

TAXONOMY:
${Object.entries(TAXONOMY)
  .map(([top, leaves]) => `${top}\n  +-- ${leaves.join("\n  +-- ")}`)
  .join("\n\n")}

For each channel, assign:
- primary_category: most fitting leaf category from taxonomy
- secondary_category: second most fitting leaf, or null
- confidence: 1 (guess) to 5 (certain)
- reasoning: 1 sentence explaining WHY this category
- content_type: educational | entertainment | news | tutorial | commentary | mixed
- posting_cadence: daily | weekly | biweekly | monthly | irregular

SIGNAL PRIORITY (use in this order):
1. description + keywords (creator's own words — strongest signal)
2. topicCategories (YouTube's classification — good but coarse)
3. channel name (sometimes descriptive, sometimes not)
4. subscriber_count / video_count / channel_age (context, not category)

Return a JSON array. No markdown, no explanation.`;

function buildPass1UserPrompt(channels: ChannelSignalBundle[]): string {
  return JSON.stringify(
    channels.map((ch) => ({
      channelId: ch.channelId,
      name: ch.name,
      description: ch.description.slice(0, 1000),
      keywords: ch.keywords.slice(0, 500),
      topicCategories: ch.topicCategories,
      subscriberCount: ch.subscriberCount,
      videoCount: ch.videoCount,
      channelAge: ch.channelAge,
      country: ch.country,
      madeForKids: ch.madeForKids,
    }))
  );
}

/**
 * Classify a batch of channels using Claude Sonnet 4.6
 * 
 * COMMUNITY OVERRIDE CHECK is handled BEFORE calling this function:
 * - Channels with community_category AND override_consensus >= 0.7 are skipped
 * - They are assigned confidence = 5 and the community_category directly
 * 
 * Only channels needing AI classification are passed to this function.
 */
export async function classifyChannelsBatch(
  channels: ChannelSignalBundle[],
  _onProgress?: (classified: number, total: number) => void
): Promise<ChannelClassification[]> {
  if (channels.length === 0) {
    return [];
  }

  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: PASS1_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildPass1UserPrompt(channels),
        },
      ],
    });

    const text = response.content[0];
    if (text.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    // Parse JSON array from response
    const cleaned = text.text.trim().replace(/```json\n?|```\n?/g, "");
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array from Pass 1");
    }

    return parsed as ChannelClassification[];
  });
}

/**
 * Classify all channels with community override check
 * This is the main entry point for Pass 1 classification
 */
export async function classifyAllChannels(
  channels: ChannelSignalBundle[],
  communityOverrides: Map<string, { category: string; confidence: number }>
): Promise<ChannelClassification[]> {
  const results: ChannelClassification[] = [];
  
  // Separate channels needing AI vs community override
  const channelsNeedingAI: ChannelSignalBundle[] = [];
  
  for (const channel of channels) {
    const override = communityOverrides.get(channel.channelId);
    if (override && override.confidence >= 0.7) {
      // Use community override
      results.push({
        channelId: channel.channelId,
        primaryCategory: override.category as LeafCategory,
        secondaryCategory: null,
        confidence: 5,
        reasoning: "Community-validated category (override consensus >= 0.7)",
        contentType: "mixed",
        postingCadence: "irregular",
      });
    } else {
      channelsNeedingAI.push(channel);
    }
  }

  // Process AI batches
  const batchSize = 25;
  for (let i = 0; i < channelsNeedingAI.length; i += batchSize) {
    const batch = channelsNeedingAI.slice(i, i + batchSize);
    const batchResults = await classifyChannelsBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// Pass 2: Profile Analysis
// ============================================================================

const PASS2_SYSTEM_PROMPT = `You are analyzing a user's complete YouTube subscription profile.
The channels have already been categorized. Your job is to see
the big picture and provide insights.`;

function buildPass2UserPrompt(
  categoryDistribution: CategoryDistribution,
  deadChannels: { channelId: string; name: string }[],
  lowConfidenceChannels: { channelId: string; name: string; category: string }[],
  allChannels: { channelId: string; name: string; category: string; confidence: number }[]
): string {
  const distributionLines = Object.entries(categoryDistribution)
    .map(([topCat, data]) => {
      let line = `- ${topCat}: ${data.count} channels`;
      if (data.subcategories) {
        const subLines = Object.entries(data.subcategories)
          .map(([sub, count]) => `    - ${sub}: ${count}`)
          .join("\n");
        line += `\n${subLines}`;
      }
      return line;
    })
    .join("\n");

  const summarizedChannels = allChannels
    .map((ch) => `${ch.name} | ${ch.category} | confidence: ${ch.confidence}`)
    .join("\n");

  return `Category distribution:
${distributionLines}

Dead channels (no upload in 6+ months): ${deadChannels.map((c) => c.name).join(", ") || "None"}

Low confidence channels: ${lowConfidenceChannels.map((c) => `${c.name} (${c.category})`).join(", ") || "None"}

Channel list with categories and confidence:
${summarizedChannels}

Provide:
1. profile_summary: 2-3 sentence description of this person's interests
2. dominant_themes: top 5 interest areas ranked by channel density
3. category_adjustments: channels that make more sense in a different
   category when you see the FULL picture (cross-channel corrections)
4. outliers: channels that don't fit the user's overall pattern
5. redundancies: clusters of 3+ channels covering the same niche
6. subscription_eras: cluster channels by subscribed_at date + category
   overlap, name each era (e.g., "Your 2020 learn-to-code phase")

Return JSON. No markdown.`;
}

export async function analyzeProfile(
  categoryDistribution: CategoryDistribution,
  deadChannels: { channelId: string; name: string }[],
  lowConfidenceChannels: { channelId: string; name: string; category: string }[],
  allChannels: { channelId: string; name: string; category: string; confidence: number }[]
): Promise<ProfileAnalysis> {
  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: PASS2_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildPass2UserPrompt(
            categoryDistribution,
            deadChannels,
            lowConfidenceChannels,
            allChannels
          ),
        },
      ],
    });

    const text = response.content[0];
    if (text.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    const cleaned = text.text.trim().replace(/```json\n?|```\n?/g, "");
    return JSON.parse(cleaned) as ProfileAnalysis;
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

export function computeCategoryDistribution(
  channels: { category: string; confidence?: number }[]
): CategoryDistribution {
  const distribution: CategoryDistribution = {};

  for (const channel of channels) {
    const { category } = channel;

    // Find top-level category for this leaf
    let topLevel: string | null = null;
    for (const [top, leaves] of Object.entries(TAXONOMY)) {
      if ((leaves as readonly string[]).includes(category)) {
        topLevel = top;
        break;
      }
    }

    if (!topLevel) continue;

    if (!distribution[topLevel]) {
      distribution[topLevel] = { count: 0, subcategories: {} };
    }

    distribution[topLevel].count++;
    if (!distribution[topLevel].subcategories) {
      distribution[topLevel].subcategories = {};
    }
    distribution[topLevel].subcategories![category] =
      (distribution[topLevel].subcategories![category] || 0) + 1;
  }

  return distribution;
}

export function isValidLeafCategory(category: string): category is LeafCategory {
  return ALL_LEAF_CATEGORIES.includes(category);
}

export function getTopLevelCategory(leafCategory: string): string | null {
  for (const [top, leaves] of Object.entries(TAXONOMY)) {
    if ((leaves as readonly string[]).includes(leafCategory)) {
      return top;
    }
  }
  return null;
}

/**
 * Compute diversity score using inverted Herfindahl-Hirschman Index
 */
export function computeDiversityScore(
  distribution: CategoryDistribution
): number {
  const counts: number[] = [];
  for (const data of Object.values(distribution)) {
    counts.push(data.count);
  }

  if (counts.length === 0) return 0;

  const total = counts.reduce((sum, c) => sum + c, 0);
  if (total === 0) return 0;

  const proportions = counts.map((c) => c / total);
  const hhi = proportions.reduce((sum, p) => sum + p * p, 0);

  return 1 - hhi;
}

// ============================================================================
// Build Channel Signal Bundle
// ============================================================================

export function buildChannelSignalBundle(channel: {
  id: string;
  title: string;
  description: string | null;
  keywords: string | null;
  subscriberCount: string | null;
  videoCount: string | null;
  publishedAt: string | null;
  topicCategories: string[];
  country: string | null;
  madeForKids: boolean | null;
}): ChannelSignalBundle {
  // Calculate channel age from publishedAt
  let channelAge = "unknown";
  if (channel.publishedAt) {
    const published = new Date(channel.publishedAt);
    const now = new Date();
    const years = Math.floor(
      (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
    if (years > 0) {
      channelAge = `${years} year${years > 1 ? "s" : ""}`;
    } else {
      const months = Math.floor(
        (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      channelAge = `${months} month${months > 1 ? "s" : ""}`;
    }
  }

  return {
    channelId: channel.id,
    name: channel.title,
    description: channel.description?.slice(0, 1000) || "",
    keywords: channel.keywords?.slice(0, 500) || "",
    topicCategories: channel.topicCategories || [],
    subscriberCount: parseInt(channel.subscriberCount || "0", 10),
    videoCount: parseInt(channel.videoCount || "0", 10),
    channelAge,
    country: channel.country || "",
    madeForKids: channel.madeForKids || false,
  };
}
