import { google, youtube_v3 } from "googleapis";
import { db } from "@/lib/db";
import { channelMetadata } from "@/lib/db/schema";
import { eq, lt, isNull, inArray } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  subscriberCount: string | null;
  videoCount: string | null;
  viewCount: string | null;
  country: string | null;
  publishedAt: string | null;
  keywords: string | null;
  topicCategories: string[];
  madeForKids: boolean | null;
}

export interface YouTubeSubscription {
  id: string;
  channelId: string;
  channelTitle: string;
  subscribedAt: string | null;
}

// ============================================================================
// YouTube API Client
// ============================================================================

const youtube = google.youtube({ version: "v3" });

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

// ============================================================================
// Step 1: Fetch Subscriptions (paginated)
// ============================================================================

export async function fetchSubscriptions(accessToken: string): Promise<YouTubeSubscription[]> {
  const auth = createOAuth2Client();
  auth.setCredentials({ access_token: accessToken });

  const subscriptions: YouTubeSubscription[] = [];
  let pageToken: string | undefined;

  do {
    const response = await youtube.subscriptions.list({
      auth,
      mine: true,
      part: ["snippet", "contentDetails"],
      maxResults: 50,
      pageToken,
    });

    for (const item of response.data.items || []) {
      if (item.snippet) {
        subscriptions.push({
          id: item.id || "",
          channelId: item.snippet.resourceId?.channelId || "",
          channelTitle: item.snippet.title || "",
          subscribedAt: item.snippet.publishedAt || null,
        });
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return subscriptions;
}

// ============================================================================
// Step 2: Fetch Channel Metadata (batched, with 30-day cache)
// ============================================================================

const CACHE_TTL_DAYS = 30;

export async function fetchChannelMetadata(
  accessToken: string,
  channelIds: string[]
): Promise<YouTubeChannel[]> {
  if (channelIds.length === 0) return [];

  const auth = createOAuth2Client();
  auth.setCredentials({ access_token: accessToken });

  // Check cache first - skip channels that were fetched within 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - CACHE_TTL_DAYS);

  // Get all cached channels in one query
  const allCached = await db
    .select()
    .from(channelMetadata)
    .where(inArray(channelMetadata.channelId, channelIds));

  const cachedMap = new Map<string, typeof allCached[0]>();
  for (const ch of allCached) {
    cachedMap.set(ch.channelId, ch);
  }

  // Separate into fresh and stale channel IDs
  const freshChannelIds: string[] = [];
  const staleChannelIds: string[] = [];

  for (const id of channelIds) {
    const cached = cachedMap.get(id);
    if (cached && cached.lastFetchedAt >= thirtyDaysAgo) {
      freshChannelIds.push(id);
    } else {
      staleChannelIds.push(id);
    }
  }

  const results: YouTubeChannel[] = [];

  // Add fresh channels from cache
  for (const id of freshChannelIds) {
    const cached = cachedMap.get(id);
    if (cached) {
      // Handle topicCategories as unknown[] from jsonb
      const topicCats = (cached.topicCategories as unknown) as string[] | null;
      results.push({
        id: cached.channelId,
        title: cached.title,
        description: cached.description,
        thumbnailUrl: cached.thumbnailUrl,
        subscriberCount: cached.subscriberCount?.toString() || null,
        videoCount: cached.videoCount?.toString() || null,
        viewCount: cached.viewCount?.toString() || null,
        country: cached.country,
        publishedAt: cached.publishedAt?.toISOString() || null,
        keywords: cached.keywords,
        topicCategories: topicCats || [],
        madeForKids: cached.madeForKids,
      });
    }
  }

  // Fetch stale channels from YouTube API (batched by 50)
  for (let i = 0; i < staleChannelIds.length; i += 50) {
    const batch = staleChannelIds.slice(i, i + 50);

    const response = await youtube.channels.list({
      auth,
      part: ["snippet", "statistics", "topicDetails", "brandingSettings", "status"],
      id: batch,
    });

    for (const item of response.data.items || []) {
      const snippet = item.snippet;
      const statistics = item.statistics;
      const branding = item.brandingSettings;
      const topics = item.topicDetails;

      const channel: YouTubeChannel = {
        id: item.id || "",
        title: snippet?.title || "",
        description: snippet?.description || null,
        thumbnailUrl: snippet?.thumbnails?.medium?.url || null,
        subscriberCount: statistics?.subscriberCount || null,
        videoCount: statistics?.videoCount || null,
        viewCount: statistics?.viewCount || null,
        country: snippet?.country || null,
        publishedAt: snippet?.publishedAt || null,
        keywords: branding?.channel?.keywords || null,
        topicCategories: topics?.topicCategories || [],
        madeForKids: item.status?.madeForKids || null,
      };

      results.push(channel);

      // Upsert into cache
      await upsertChannelMetadata(channel);
    }
  }

  return results;
}

// ============================================================================
// Step 2.5: Fetch Last Upload Dates via RSS (parallel, max 20 concurrent)
// ============================================================================

export async function fetchLastUploadDates(
  channelIds: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  const batchSize = 20;
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const promises = batch.map(async (channelId) => {
      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const response = await fetch(feedUrl, {
          headers: { "User-Agent": "Pulse/1.0" },
        });

        if (!response.ok) {
          results.set(channelId, null);
          return;
        }

        const text = await response.text();
        // Parse the <published> element from YouTube RSS feed (first video)
        const publishedMatch = text.match(/<entry>[\s\S]*?<published>([^<]+)<\/published>/);
        if (publishedMatch) {
          results.set(channelId, publishedMatch[1]);
        } else {
          // Fall back to <updated> tag
          const updatedMatch = text.match(/<updated>([^<]+)<\/updated>/);
          results.set(channelId, updatedMatch ? updatedMatch[1] : null);
        }
      } catch {
        results.set(channelId, null);
      }
    });

    await Promise.all(promises);
  }

  return results;
}

// ============================================================================
// Upsert Channel Metadata
// ============================================================================

export async function upsertChannelMetadata(channel: YouTubeChannel): Promise<void> {
  const subscriberCount = channel.subscriberCount ? Number(channel.subscriberCount) : null;
  const videoCount = channel.videoCount ? Number(channel.videoCount) : null;
  const viewCount = channel.viewCount ? Number(channel.viewCount) : null;

  await db
    .insert(channelMetadata)
    .values({
      channelId: channel.id,
      title: channel.title,
      description: channel.description,
      keywords: channel.keywords,
      subscriberCount,
      videoCount,
      viewCount,
      topicCategories: channel.topicCategories,
      country: channel.country,
      thumbnailUrl: channel.thumbnailUrl,
      madeForKids: channel.madeForKids,
      publishedAt: channel.publishedAt ? new Date(channel.publishedAt) : null,
      lastFetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: channelMetadata.channelId,
      set: {
        title: channel.title,
        description: channel.description,
        keywords: channel.keywords,
        subscriberCount,
        videoCount,
        viewCount,
        topicCategories: channel.topicCategories,
        country: channel.country,
        thumbnailUrl: channel.thumbnailUrl,
        madeForKids: channel.madeForKids,
        publishedAt: channel.publishedAt ? new Date(channel.publishedAt) : null,
        lastFetchedAt: new Date(),
      },
    });
}

// ============================================================================
// Update Last Upload Date
// ============================================================================

export async function updateLastUploadDate(
  channelId: string,
  lastUploadAt: string | null
): Promise<void> {
  if (!lastUploadAt) return;

  await db
    .update(channelMetadata)
    .set({ lastUploadAt: new Date(lastUploadAt) })
    .where(eq(channelMetadata.channelId, channelId));
}

// ============================================================================
// Check if Channel is Dead (no upload in 6+ months)
// ============================================================================

export function isChannelDead(lastUploadAt: string | null): boolean {
  if (!lastUploadAt) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(lastUploadAt) < sixMonthsAgo;
}

// ============================================================================
// Get Fresh OAuth Token (with refresh if needed)
// ============================================================================

export async function getFreshAccessToken(
  currentToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<string> {
  const now = new Date();
  
  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const auth = createOAuth2Client();
    auth.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await auth.refreshAccessToken();
    return credentials.access_token || currentToken;
  }
  
  return currentToken;
}
