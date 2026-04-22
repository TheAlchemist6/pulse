import { db } from "@/lib/db";
import {
  users,
  channelMetadata,
  userSubscriptions,
  userCategories,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  fetchSubscriptions,
  fetchChannelMetadata,
  fetchLastUploadDates,
  updateLastUploadDate,
  isChannelDead,
  upsertChannelMetadata,
  type YouTubeChannel,
  type YouTubeSubscription,
} from "@/lib/youtube";
import {
  classifyChannelsBatch,
  analyzeProfile,
  computeCategoryDistribution,
  type ChannelSignalBundle,
  type ChannelClassification,
  type ProfileAnalysis,
  TAXONOMY,
  ALL_LEAF_CATEGORIES,
} from "@/lib/ai-categorize";

// ============================================================================
// Types
// ============================================================================

export interface ClassifiedChannel {
  channelId: string;
  name: string;
  thumbnailUrl: string | null;
  category: string;
  confidence: number;
}

export interface ImportProgressEvent {
  step:
    | "subscriptions"
    | "metadata"
    | "rss"
    | "classify"
    | "profile"
    | "metrics"
    | "complete"
    | "error";
  progress?: string;
  message: string;
  subscriptionCount?: number;
  deadChannelCount?: number;
  error?: string;
  classifiedChannels?: ClassifiedChannel[];
}

export interface ImportPipelineResult {
  subscriptionCount: number;
  deadChannelCount: number;
  profileSummary: string;
  dominantThemes: string[];
  diversityScore: number;
  topCategories: string[];
}

// ============================================================================
// Constants
// ============================================================================

const BATCH_SIZE = 40;
const MAX_CONCURRENT_BATCHES = 8;
const RSS_CONCURRENCY = 20;
const DEAD_CHANNEL_THRESHOLD_MONTHS = 6;

// ============================================================================
// Import Pipeline Generator
// ============================================================================

export async function* importPipeline(
  userId: string,
  accessToken: string
): AsyncGenerator<ImportProgressEvent, ImportPipelineResult, undefined> {
  let subscriptionCount = 0;
  let deadChannelCount = 0;

  try {
    // ===== STEP 1: Fetch Subscriptions =====
    yield {
      step: "subscriptions",
      progress: "0/?",
      message: "Pulling subscriptions from YouTube...",
    };

    const subscriptions = await fetchSubscriptions(accessToken);
    subscriptionCount = subscriptions.length;

    yield {
      step: "subscriptions",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: `Found ${subscriptionCount} subscriptions`,
    };

    if (subscriptionCount === 0) {
      yield {
        step: "complete",
        message: "No subscriptions found",
        subscriptionCount: 0,
        deadChannelCount: 0,
      };
      return {
        subscriptionCount: 0,
        deadChannelCount: 0,
        profileSummary: "",
        dominantThemes: [],
        diversityScore: 0,
        topCategories: [],
      };
    }

    // ===== STEP 2: Fetch Channel Metadata =====
    yield {
      step: "metadata",
      progress: `0/${subscriptionCount}`,
      message: "Fetching channel data...",
    };

    const channelIds = subscriptions.map((s) => s.channelId);
    const channels = await fetchChannelMetadata(accessToken, channelIds);
    const channelMap = new Map<string, YouTubeChannel>(
      channels.map((c) => [c.id, c])
    );

    yield {
      step: "metadata",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: `Fetched metadata for ${channels.length} channels`,
    };

    // ===== STEP 2.5: Fetch RSS Upload Dates =====
    yield {
      step: "rss",
      progress: `0/${subscriptionCount}`,
      message: "Checking upload dates...",
    };

    const uploadDates = await fetchLastUploadDates(channelIds);

    // Update last_upload_at in channel_metadata
    for (const [channelId, uploadDate] of uploadDates.entries()) {
      if (uploadDate) {
        await updateLastUploadDate(channelId, uploadDate);
      }
    }

    // Count dead channels
    for (const [channelId] of uploadDates.entries()) {
      const lastUpload = uploadDates.get(channelId) ?? null;
      if (isChannelDead(lastUpload)) {
        deadChannelCount++;
      }
    }

    yield {
      step: "rss",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: `Upload dates checked — ${deadChannelCount} dead channels detected`,
    };

    // ===== SEED DEFAULT CATEGORIES (if first import) =====
    const existingCategories = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.userId, userId))
      .limit(1);

    if (existingCategories.length === 0) {
      const { DEFAULT_TAXONOMY } = await import("@/lib/utils");
      let sortOrder = 0;
      for (const topLevel of DEFAULT_TAXONOMY) {
        const parentId = crypto.randomUUID();
        await db.insert(userCategories).values({
          id: parentId,
          userId,
          parentId: null,
          name: topLevel.name,
          slug: topLevel.slug,
          sortOrder: sortOrder++,
          isDefault: true,
          channelCount: 0,
        });
        for (const child of topLevel.children) {
          await db.insert(userCategories).values({
            id: crypto.randomUUID(),
            userId,
            parentId,
            name: child.name,
            slug: child.slug,
            sortOrder: sortOrder++,
            isDefault: true,
            channelCount: 0,
          });
        }
      }
    }

    // ===== STEP 3: Pass 1 — Deep Classification =====
    yield {
      step: "classify",
      progress: `0/${subscriptionCount}`,
      message: "Classifying channels...",
    };

    // Build signal bundles for channels that need classification
    // Check community override first
    const communityOverrideMap = new Map<
      string,
      { category: string; confidence: number }
    >();
    const channelsNeedingAI: YouTubeChannel[] = [];

    for (const channel of channels) {
      const cached = await db
        .select()
        .from(channelMetadata)
        .where(eq(channelMetadata.channelId, channel.id))
        .limit(1);

      if (
        cached[0]?.communityCategory &&
        (cached[0]?.overrideConsensus ?? 0) >= 0.7
      ) {
        communityOverrideMap.set(channel.id, {
          category: cached[0].communityCategory,
          confidence: 5,
        });
      } else {
        channelsNeedingAI.push(channel);
      }
    }

    const classifications = new Map<string, ChannelClassification>();

    // Process AI classification in batches
    const totalBatches = Math.ceil(channelsNeedingAI.length / BATCH_SIZE);
    let processedInAI = 0;

    for (
      let i = 0;
      i < channelsNeedingAI.length;
      i += BATCH_SIZE * MAX_CONCURRENT_BATCHES
    ) {
      const concurrentBatches: Promise<ChannelClassification[]>[] = [];

      for (
        let j = i;
        j < Math.min(i + BATCH_SIZE * MAX_CONCURRENT_BATCHES, channelsNeedingAI.length);
        j += BATCH_SIZE
      ) {
        const batchChannels = channelsNeedingAI.slice(j, j + BATCH_SIZE);
        const batchSignals = batchChannels.map(buildChannelSignalBundle);
        concurrentBatches.push(
          classifyChannelsBatch(batchSignals, (done, total) => {
            processedInAI = done;
          }).then((results) => {
            // Merge community overrides into results for storage
            for (const result of results) {
              classifications.set(result.channelId, result);
            }
            return results;
          })
        );
      }

      const batchResults = await Promise.all(concurrentBatches);
      for (const batchResult of batchResults) {
        for (const result of batchResult) {
          classifications.set(result.channelId, result);
        }
      }

      // Progress update with classified channel data for live sorting UI
      const flatResults = batchResults.flat();
      const totalProcessed = i + flatResults.length;
      const communityCount = communityOverrideMap.size;
      const aiProcessed = communityCount + totalProcessed;

      const classifiedChannels: ClassifiedChannel[] = flatResults.map((r) => {
        const ch = channelMap.get(r.channelId);
        return {
          channelId: r.channelId,
          name: ch?.title || "Unknown",
          thumbnailUrl: ch?.thumbnailUrl || null,
          category: r.primaryCategory,
          confidence: r.confidence,
        };
      });

      yield {
        step: "classify",
        progress: `${aiProcessed}/${subscriptionCount}`,
        message: `Classified ${aiProcessed} of ${subscriptionCount} channels...`,
        classifiedChannels,
      };
    }

    // Apply community overrides to classifications
    for (const [channelId, override] of communityOverrideMap.entries()) {
      classifications.set(channelId, {
        channelId,
        primaryCategory: override.category as any,
        secondaryCategory: null,
        confidence: override.confidence as any,
        reasoning: "Community-validated category (override consensus >= 0.7)",
        contentType: "mixed",
        postingCadence: "irregular",
      });
    }

    // ===== SAVE to user_subscriptions =====
    const subscriptionValues: {
      userId: string;
      channelId: string;
      subscribedAt: Date | null;
      primaryCategory: string;
      secondaryCategory: string | null;
      aiConfidence: number;
      aiReasoning: string | null;
      contentType: string | null;
      postingCadence: string | null;
      status: string;
      userOverridden: boolean;
      reviewed: boolean;
      lastSyncedAt: Date;
    }[] = [];

    for (const sub of subscriptions) {
      const channel = channelMap.get(sub.channelId);
      if (!channel) continue;

      const classification = classifications.get(sub.channelId);
      if (!classification) continue;

      subscriptionValues.push({
        userId,
        channelId: sub.channelId,
        subscribedAt: sub.subscribedAt ? new Date(sub.subscribedAt) : null,
        primaryCategory: classification.primaryCategory,
        secondaryCategory: classification.secondaryCategory,
        aiConfidence: classification.confidence,
        aiReasoning: classification.reasoning,
        contentType: classification.contentType,
        postingCadence: classification.postingCadence,
        status: "active",
        userOverridden: false,
        reviewed: false,
        lastSyncedAt: new Date(),
      });
    }

    // Batch insert/update subscriptions
    for (const value of subscriptionValues) {
      await db
        .insert(userSubscriptions)
        .values(value)
        .onConflictDoUpdate({
          target: [userSubscriptions.userId, userSubscriptions.channelId],
          set: {
            primaryCategory: value.primaryCategory,
            secondaryCategory: value.secondaryCategory,
            aiConfidence: value.aiConfidence,
            aiReasoning: value.aiReasoning,
            contentType: value.contentType,
            postingCadence: value.postingCadence,
            lastSyncedAt: value.lastSyncedAt,
          },
        });
    }

    yield {
      step: "classify",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: `Classification complete for ${subscriptionCount} channels`,
    };

    // ===== STEP 4: Pass 2 — Profile Analysis =====
    yield {
      step: "profile",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: "Analyzing your profile...",
    };

    // Build data for Pass 2
    const allSubscriptions = await db
      .select({
        channelId: userSubscriptions.channelId,
        primaryCategory: userSubscriptions.primaryCategory,
        aiConfidence: userSubscriptions.aiConfidence,
        subscribedAt: userSubscriptions.subscribedAt,
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    const channelTitles = new Map<string, string>();
    for (const channel of channels) {
      channelTitles.set(channel.id, channel.title);
    }

    const deadChannelIds = new Set<string>();
    for (const [channelId, lastUpload] of uploadDates.entries()) {
      if (isChannelDead(lastUpload)) {
        deadChannelIds.add(channelId);
      }
    }

    const categoryDistribution = computeCategoryDistribution(
      allSubscriptions.map((s) => ({
        category: s.primaryCategory,
      }))
    );

    const deadChannels = allSubscriptions
      .filter((s) => deadChannelIds.has(s.channelId))
      .map((s) => ({
        channelId: s.channelId,
        name: channelTitles.get(s.channelId) || "Unknown",
      }));

    const lowConfidenceChannels = allSubscriptions
      .filter((s) => s.aiConfidence <= 2)
      .map((s) => ({
        channelId: s.channelId,
        name: channelTitles.get(s.channelId) || "Unknown",
        category: s.primaryCategory,
      }));

    const allChannels = allSubscriptions.map((s) => ({
      channelId: s.channelId,
      name: channelTitles.get(s.channelId) || "Unknown",
      category: s.primaryCategory,
      confidence: s.aiConfidence,
      subscribedAt: s.subscribedAt?.toISOString() || null,
    }));

    const profileAnalysis = await analyzeProfile(
      categoryDistribution,
      deadChannels,
      lowConfidenceChannels,
      allChannels
    );

    // Apply category adjustments (if AI confidence delta > 1)
    for (const adjustment of profileAnalysis.categoryAdjustments) {
      const currentSub = allSubscriptions.find(
        (s) => s.channelId === adjustment.channelId
      );
      if (currentSub && currentSub.aiConfidence <= 3) {
        await db
          .update(userSubscriptions)
          .set({ primaryCategory: adjustment.to })
          .where(
            and(
              eq(userSubscriptions.userId, userId),
              eq(userSubscriptions.channelId, adjustment.channelId)
            )
          );
      }
    }

    yield {
      step: "profile",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: "Profile analysis complete",
    };

    // ===== STEP 5: Compute Derived Metrics =====
    yield {
      step: "metrics",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: "Computing metrics...",
    };

    // Diversity score
    const diversityScore = computeDiversityScore(categoryDistribution);

    // Top categories
    const topCategories = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([name]) => name);

    // Update user_categories channel counts
    for (const [topLevel, data] of Object.entries(categoryDistribution)) {
      if (data.subcategories) {
        for (const [leaf, count] of Object.entries(data.subcategories)) {
          await db
            .update(userCategories)
            .set({ channelCount: count })
            .where(
              and(
                eq(userCategories.userId, userId),
                eq(userCategories.slug, leaf.toLowerCase().replace(/\s+/g, "-"))
              )
            );
        }
      }
    }

    // Update user record
    await db
      .update(users)
      .set({
        subscriptionCount,
        archetype: profileAnalysis.archetype,
        profileSummary: profileAnalysis.profileSummary,
        dominantThemes: profileAnalysis.dominantThemes,
        topCategories,
        diversityScore,
        deadChannelCount,
        onboardingStage: "imported",
        lastSyncedAt: new Date(),
      })
      .where(eq(users.id, userId));

    yield {
      step: "metrics",
      progress: `${subscriptionCount}/${subscriptionCount}`,
      message: "Metrics computed",
    };

    // ===== STEP 6: Finalize =====
    yield {
      step: "complete",
      message: "Import complete!",
      subscriptionCount,
      deadChannelCount,
    };

    return {
      subscriptionCount,
      deadChannelCount,
      profileSummary: profileAnalysis.profileSummary,
      dominantThemes: profileAnalysis.dominantThemes,
      diversityScore,
      topCategories,
    };
  } catch (error) {
    yield {
      step: "error",
      message: error instanceof Error ? error.message : "Pipeline failure",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    throw error;
  }
}

// ============================================================================
// Diversity Score (Inverted Herfindahl-Hirschman Index)
// ============================================================================

function computeDiversityScore(
  distribution: Record<string, { count: number; subcategories?: Record<string, number> }>
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
// Helper: Build Channel Signal Bundle
// ============================================================================

export function buildChannelSignalBundle(channel: YouTubeChannel): ChannelSignalBundle {
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
