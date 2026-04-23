import Anthropic from "@anthropic-ai/sdk";
import {
  NICHES_BY_GROUP,
  GROUPS,
  ALL_NICHES,
  getGroupForNiche,
  type Group,
  type Niche,
} from "@/lib/classification/taxonomy";
import {
  classifyChannel,
  type ClassificationResult,
  type ClassificationSource,
} from "@/lib/classification/classifier";

function dualWriteCategory(result: ClassificationResult): string {
  return result.primaryNiche ?? result.primaryGroup ?? "Uncategorized";
}
import { parseWikipediaSlug } from "@/lib/classification/topic-map";

// ============================================================================
// Taxonomy Export (proxies the V1 classification module)
// ============================================================================

export const TAXONOMY = NICHES_BY_GROUP;

export type LeafCategory = Niche;
export type TopLevelCategory = Group;

export const ALL_LEAF_CATEGORIES: string[] = [...ALL_NICHES] as string[];
export const ALL_TOP_LEVEL_CATEGORIES: string[] = [...GROUPS] as string[];

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
  primaryGroup: Group | null;
  primaryNiche: Niche | null;
  primaryCategory: string; // dual-write for NOT NULL user_subscriptions.primary_category
  secondaryCategory: string | null; // always null in Tier 1
  confidence: 1 | 2 | 3 | 4 | 5;
  classificationSource: ClassificationSource;
  reasoning: string;
  // Constants in Tier 1 — set by a later tier (content-type analysis, cadence detection).
  contentType: "mixed";
  postingCadence: "irregular";
}

export interface ProfileAnalysis {
  archetype: string;
  profileSummary: string;
  dominantThemes: string[];
  categoryAdjustments: {
    channelId: string;
    from: string;
    to: string;
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
// Tier 1 Classification — delegates to classification/classifier.ts
// ============================================================================

export async function classifyChannelsBatch(
  channels: ChannelSignalBundle[],
  onProgress?: (classified: number, total: number) => void,
): Promise<ChannelClassification[]> {
  if (channels.length === 0) return [];

  const results: ChannelClassification[] = [];
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const topicSlugs = (ch.topicCategories || []).map(parseWikipediaSlug);
    const result = classifyChannel({
      channelId: ch.channelId,
      title: ch.name,
      description: ch.description,
      keywords: ch.keywords,
      topicSlugs,
    });

    results.push({
      channelId: result.channelId,
      primaryGroup: result.primaryGroup,
      primaryNiche: result.primaryNiche,
      primaryCategory: dualWriteCategory(result),
      secondaryCategory: null,
      confidence: result.confidence,
      classificationSource: result.classificationSource,
      reasoning: `Source: ${result.classificationSource}`,
      contentType: "mixed",
      postingCadence: "irregular",
    });

    onProgress?.(i + 1, channels.length);
  }
  return results;
}

// ============================================================================
// Pass 2: Profile Analysis (Claude — archetype, summary, themes, eras)
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = MAX_RETRIES, delayMs = RETRY_DELAY_MS, backoffMultiplier = 2 } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
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

const PASS2_SYSTEM_PROMPT = `You are analyzing a user's complete YouTube subscription profile.
The channels have already been categorized. Your job is to see the big picture and provide insights.`;

function buildPass2UserPrompt(
  categoryDistribution: CategoryDistribution,
  deadChannels: { channelId: string; name: string }[],
  lowConfidenceChannels: { channelId: string; name: string; category: string }[],
  allChannels: {
    channelId: string;
    name: string;
    category: string;
    confidence: number;
    subscribedAt?: string | null;
  }[],
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
    .map(
      (ch) =>
        `${ch.name} | ${ch.category} | confidence: ${ch.confidence}${
          ch.subscribedAt ? ` | subscribed: ${ch.subscribedAt.slice(0, 7)}` : ""
        }`,
    )
    .join("\n");

  return `Category distribution:
${distributionLines}

Dead channels (no upload in 6+ months): ${deadChannels.map((c) => c.name).join(", ") || "None"}

Low confidence channels: ${lowConfidenceChannels.map((c) => `${c.name} (${c.category})`).join(", ") || "None"}

Channel list with categories and confidence:
${summarizedChannels}

Provide:
1. archetype: A short personality-test-style label for this subscriber (3-5 words, e.g., "The Tech-Curious Builder", "The Polymath Explorer", "The Creative Entrepreneur"). Make it feel personal and specific to their actual profile, not generic.
2. profile_summary: 2-3 sentence description of this person's interests
3. dominant_themes: top 5 interest areas ranked by channel density
4. category_adjustments: channels that make more sense in a different
   category when you see the FULL picture (cross-channel corrections)
5. outliers: channels that don't fit the user's overall pattern
6. redundancies: clusters of 3+ channels covering the same niche
7. subscription_eras: cluster channels by subscribed_at date + category
   overlap, name each era (e.g., "Your 2020 learn-to-code phase")

Return JSON. No markdown.`;
}

export async function analyzeProfile(
  categoryDistribution: CategoryDistribution,
  deadChannels: { channelId: string; name: string }[],
  lowConfidenceChannels: { channelId: string; name: string; category: string }[],
  allChannels: {
    channelId: string;
    name: string;
    category: string;
    confidence: number;
    subscribedAt?: string | null;
  }[],
): Promise<ProfileAnalysis> {
  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: PASS2_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildPass2UserPrompt(
            categoryDistribution,
            deadChannels,
            lowConfidenceChannels,
            allChannels,
          ),
        },
      ],
    });

    const text = response.content[0];
    if (text.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    const cleaned = text.text.trim().replace(/```json\n?|```\n?/g, "");
    const raw = JSON.parse(cleaned);

    return {
      archetype: raw.archetype || "The Curious Subscriber",
      profileSummary: raw.profileSummary || raw.profile_summary || "",
      dominantThemes: raw.dominantThemes || raw.dominant_themes || [],
      categoryAdjustments: (raw.categoryAdjustments || raw.category_adjustments || []).map(
        (a: Record<string, unknown>) => ({
          channelId: (a.channelId || a.channel_id || "") as string,
          from: (a.from || "") as string,
          to: (a.to || "") as string,
          reason: (a.reason || "") as string,
        }),
      ),
      outliers: (raw.outliers || []).map((o: Record<string, unknown>) => ({
        channelId: (o.channelId || o.channel_id || "") as string,
        reason: (o.reason || "") as string,
      })),
      redundancies: (raw.redundancies || []).map((r: Record<string, unknown>) => ({
        channels: (r.channels || []) as string[],
        topic: (r.topic || "") as string,
      })),
      subscriptionEras: (raw.subscriptionEras || raw.subscription_eras || []).map(
        (e: Record<string, unknown>) => ({
          period: (e.period || "") as string,
          name: (e.name || "") as string,
          channels: (e.channels || []) as string[],
          theme: (e.theme || "") as string,
        }),
      ),
    } as ProfileAnalysis;
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

export function computeCategoryDistribution(
  channels: { category: string; confidence?: number }[],
): CategoryDistribution {
  const distribution: CategoryDistribution = {};

  for (const channel of channels) {
    const { category } = channel;
    const topLevel = getGroupForNiche(category);
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
  return getGroupForNiche(leafCategory);
}

export function computeDiversityScore(distribution: CategoryDistribution): number {
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
  let channelAge = "unknown";
  if (channel.publishedAt) {
    const published = new Date(channel.publishedAt);
    const now = new Date();
    const years = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 365));
    if (years > 0) {
      channelAge = `${years} year${years > 1 ? "s" : ""}`;
    } else {
      const months = Math.floor(
        (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30),
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
