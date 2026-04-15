import { db } from "@/lib/db";
import {
  users,
  channelMetadata,
  userSubscriptions,
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
  computeDiversityScore,
  buildChannelSignalBundle,
  type ChannelSignalBundle,
  type ChannelClassification,
  type ProfileAnalysis,
} from "@/lib/ai-categorize";

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  newChannels: { channelId: string; title: string; category: string }[];
  removedChannels: { channelId: string; title: string }[];
  refreshedMetadata: number;
  passedReanalysis: boolean;
  subscriptionCount: number;
}

export interface SyncDelta {
  added: YouTubeSubscription[];
  removed: { channelId: string; title: string }[];
  stillPresent: string[];
}

// ============================================================================
// Constants
// ============================================================================

const BATCH_SIZE = 25;
const MAX_CONCURRENT_BATCHES = 4;
const RSS_CONCURRENCY = 20;
const REANALYSIS_THRESHOLD = 0.10; // 10% new channels triggers Pass 2 re-run

// ============================================================================
// Sync Pipeline
// ============================================================================

export async function runSyncPipeline(
  userId: string,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    newChannels: [],
    removedChannels: [],
    refreshedMetadata: 0,
    passedReanalysis: false,
    subscriptionCount: 0,
  };

  // ===== STEP 1: Fetch Current Subscriptions from YouTube =====
  const youtubeSubscriptions = await fetchSubscriptions(accessToken);
  const youtubeChannelIds = new Set(youtubeSubscriptions.map((s) => s.channelId));

  // ===== STEP 2: Diff Against Stored Subscriptions =====
  const dbSubscriptions = await db
    .select({
      channelId: userSubscriptions.channelId,
      primaryCategory: userSubscriptions.primaryCategory,
      subscribedAt: userSubscriptions.subscribedAt,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  const dbChannelIds = new Set(dbSubscriptions.map((s) => s.channelId));

  // Find new channels (in YouTube but not in DB)
  const newChannelIds = youtubeSubscriptions
    .filter((s) => !dbChannelIds.has(s.channelId))
    .map((s) => s.channelId);

  // Find removed channels (in DB but not in YouTube)
  const removedSubscriptions = dbSubscriptions.filter(
    (s) => !youtubeChannelIds.has(s.channelId)
  );

  result.removedChannels = removedSubscriptions.map((s) => ({
    channelId: s.channelId,
    title: "", // Would need to join with channel_metadata to get title
  }));

  // ===== STEP 3: Mark Removed Channels =====
  for (const removed of removedSubscriptions) {
    await db
      .update(userSubscriptions)
      .set({ status: "unsubscribed_on_youtube" })
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.channelId, removed.channelId)
        )
      );
  }

  // ===== STEP 4: Process New Channels =====
  if (newChannelIds.length > 0) {
    // 4a. Fetch channel metadata (respect 30-day cache TTL)
    const newChannelData = await fetchChannelMetadata(accessToken, newChannelIds);
    const channelMap = new Map<string, YouTubeChannel>(
      newChannelData.map((c) => [c.id, c])
    );

    // 4b. Fetch RSS last_upload_at
    const uploadDates = await fetchLastUploadDates(newChannelIds);
    
    // 4c & 4d. Check community_category and run Pass 1 classification
    const newSubscriptions = youtubeSubscriptions.filter((s) =>
      newChannelIds.includes(s.channelId)
    );

    for (const sub of newSubscriptions) {
      const channel = channelMap.get(sub.channelId);
      if (!channel) continue;

      // Check community override
      const cached = await db
        .select()
        .from(channelMetadata)
        .where(eq(channelMetadata.channelId, channel.id))
        .limit(1);

      let classification: ChannelClassification | null = null;

      if (
        cached[0]?.communityCategory &&
        (cached[0]?.overrideConsensus ?? 0) >= 0.7
      ) {
        // Use community override - confidence = 5
        classification = {
          channelId: channel.id,
          primaryCategory: cached[0].communityCategory as any,
          secondaryCategory: null,
          confidence: 5,
          reasoning:
            "Community-validated category (override consensus >= 0.7)",
          contentType: "mixed",
          postingCadence: "irregular",
        };
      } else {
        // Run Pass 1 classification for new channels (batched)
        const signalBundle = buildChannelSignalBundle(channel);
        const results = await classifyChannelsBatch([signalBundle]);
        classification = results[0] || null;
      }

      if (!classification) continue;

      // Upsert subscription
      await db
        .insert(userSubscriptions)
        .values({
          userId,
          channelId: channel.id,
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
        })
        .onConflictDoUpdate({
          target: [userSubscriptions.userId, userSubscriptions.channelId],
          set: {
            status: "active",
            lastSyncedAt: new Date(),
          },
        });

      result.newChannels.push({
        channelId: channel.id,
        title: channel.title,
        category: classification.primaryCategory,
      });
    }
  }

  // ===== STEP 5: Threshold Check for Pass 2 =====
  const totalSubscriptions = await db
    .select({ count: userSubscriptions.channelId })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  result.subscriptionCount = totalSubscriptions.length;

  const newChannelRatio = newChannelIds.length / Math.max(result.subscriptionCount, 1);
  
  if (newChannelRatio > REANALYSIS_THRESHOLD) {
    // Re-run Pass 2 on full profile
    result.passedReanalysis = await runProfileReanalysis(userId);
  } else {
    // Incremental update - just update counts
    await updateIncrementalMetrics(userId);
    result.passedReanalysis = false;
  }

  // ===== STEP 6: Refresh Stale Channel Metadata =====
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const staleChannels = await db
    .select({ channelId: channelMetadata.channelId })
    .from(channelMetadata)
    .where(eq(channelMetadata.lastFetchedAt, thirtyDaysAgo));

  if (staleChannels.length > 0) {
    // Re-fetch metadata for stale channels
    const staleChannelIds = staleChannels.map((c) => c.channelId);
    await fetchChannelMetadata(accessToken, staleChannelIds);
    
    // Re-fetch RSS for stale channels
    await fetchLastUploadDates(staleChannelIds);
    
    result.refreshedMetadata = staleChannels.length;
  }

  // ===== STEP 7: Update User's last_synced_at =====
  await db
    .update(users)
    .set({ lastSyncedAt: new Date() })
    .where(eq(users.id, userId));

  return result;
}

// ============================================================================
// Profile Re-analysis (Pass 2)
// ============================================================================

async function runProfileReanalysis(userId: string): Promise<boolean> {
  try {
    // Get all subscriptions with categories
    const allSubscriptions = await db
      .select({
        channelId: userSubscriptions.channelId,
        primaryCategory: userSubscriptions.primaryCategory,
        aiConfidence: userSubscriptions.aiConfidence,
        subscribedAt: userSubscriptions.subscribedAt,
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    if (allSubscriptions.length === 0) return false;

    // Get channel titles
    const channelIds = allSubscriptions.map((s) => s.channelId);
    const channels = await db
      .select({
        channelId: channelMetadata.channelId,
        title: channelMetadata.title,
        lastUploadAt: channelMetadata.lastUploadAt,
      })
      .from(channelMetadata)
      .where(inArray(channelMetadata.channelId, channelIds));

    const channelMap = new Map(channels.map((c) => [c.channelId, c]));
    const channelTitles = new Map(channels.map((c) => [c.channelId, c.title]));

    // Check dead channels
    const deadChannelIds = new Set<string>();
    for (const channel of channels) {
      if (channel.lastUploadAt) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (channel.lastUploadAt < sixMonthsAgo) {
          deadChannelIds.add(channel.channelId);
        }
      }
    }

    // Compute category distribution
    const categoryDistribution = computeCategoryDistribution(
      allSubscriptions.map((s) => ({ category: s.primaryCategory }))
    );

    // Dead channels list
    const deadChannels = allSubscriptions
      .filter((s) => deadChannelIds.has(s.channelId))
      .map((s) => ({
        channelId: s.channelId,
        name: channelTitles.get(s.channelId) || "Unknown",
      }));

    // Low confidence channels
    const lowConfidenceChannels = allSubscriptions
      .filter((s) => s.aiConfidence <= 2)
      .map((s) => ({
        channelId: s.channelId,
        name: channelTitles.get(s.channelId) || "Unknown",
        category: s.primaryCategory,
      }));

    // All channels
    const allChannels = allSubscriptions.map((s) => ({
      channelId: s.channelId,
      name: channelTitles.get(s.channelId) || "Unknown",
      category: s.primaryCategory,
      confidence: s.aiConfidence,
    }));

    // Run Pass 2 analysis
    const profileAnalysis = await analyzeProfile(
      categoryDistribution,
      deadChannels,
      lowConfidenceChannels,
      allChannels
    );

    // Apply category adjustments
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

    // Update user with new profile data
    const diversityScore = computeDiversityScore(categoryDistribution);
    const topCategories = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([name]) => name);

    await db
      .update(users)
      .set({
        profileSummary: profileAnalysis.profileSummary,
        dominantThemes: profileAnalysis.dominantThemes,
        topCategories,
        diversityScore,
        deadChannelCount: deadChannels.length,
      })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error("Profile reanalysis error:", error);
    return false;
  }
}

// ============================================================================
// Incremental Metrics Update
// ============================================================================

async function updateIncrementalMetrics(userId: string): Promise<void> {
  // Get current subscription count with categories
  const subscriptions = await db
    .select({
      channelId: userSubscriptions.channelId,
      primaryCategory: userSubscriptions.primaryCategory,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  const subscriptionCount = subscriptions.length;

  // Count dead channels
  const channelIds = subscriptions.map((s) => s.channelId);
  if (channelIds.length > 0) {
    const channels = await db
      .select({
        channelId: channelMetadata.channelId,
        lastUploadAt: channelMetadata.lastUploadAt,
      })
      .from(channelMetadata)
      .where(inArray(channelMetadata.channelId, channelIds));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const deadChannelCount = channels.filter(
      (c) => c.lastUploadAt && c.lastUploadAt < sixMonthsAgo
    ).length;

    // Compute top categories
    const categoryCounts = new Map<string, number>();
    for (const sub of subscriptions) {
      const count = categoryCounts.get(sub.primaryCategory) || 0;
      categoryCounts.set(sub.primaryCategory, count + 1);
    }

    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    await db
      .update(users)
      .set({
        subscriptionCount,
        deadChannelCount,
        topCategories,
      })
      .where(eq(users.id, userId));
  }
}

// ============================================================================
// Delta Detection Helper
// ============================================================================

export function computeSyncDelta(
  youtubeSubscriptions: YouTubeSubscription[],
  dbChannelIds: Set<string>
): SyncDelta {
  const delta: SyncDelta = {
    added: [],
    removed: [],
    stillPresent: [],
  };

  for (const sub of youtubeSubscriptions) {
    if (dbChannelIds.has(sub.channelId)) {
      delta.stillPresent.push(sub.channelId);
    } else {
      delta.added.push(sub);
    }
  }

  // Removed channels need to be computed from dbChannelIds - youtubeChannelIds
  // This is done outside since we need the full picture

  return delta;
}
