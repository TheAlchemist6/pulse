import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userSubscriptions, channelMetadata, userCategories } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Get all subscriptions with their channels
    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    
    const channelIds = subscriptions.map(s => s.channelId);
    const channels = await db
      .select()
      .from(channelMetadata)
      .where(inArray(channelMetadata.channelId, channelIds));
    
    const channelMap = new Map(channels.map(c => [c.channelId, c]));
    
    // Get all categories
    const categories = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.userId, userId));
    
    // 1. Dead channels (no upload in over 6 months, not already marked)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const deadChannels = subscriptions
      .filter(s => {
        if (s.status === "unsubscribed_on_youtube") return false;
        const channel = channelMap.get(s.channelId);
        if (!channel?.lastUploadAt) return false;
        return new Date(channel.lastUploadAt) < sixMonthsAgo;
      })
      .map(s => {
        const channel = channelMap.get(s.channelId)!;
        return {
          channelId: s.channelId,
          title: channel.title,
          lastUploadAt: channel.lastUploadAt,
          status: s.status,
        };
      });
    
    // 2. Low confidence subscriptions (confidence 1-2)
    const lowConfidence = subscriptions
      .filter(s => s.aiConfidence <= 2 && !s.reviewed)
      .map(s => {
        const channel = channelMap.get(s.channelId);
        return {
          channelId: s.channelId,
          title: channel?.title || "Unknown",
          currentCategory: s.primaryCategory,
          confidence: s.aiConfidence,
        };
      });
    
    // 3. Outliers (channels that don't fit the dominant categories)
    // Find the user's dominant theme
    const categoryCount = new Map<string, number>();
    for (const s of subscriptions) {
      categoryCount.set(s.primaryCategory, (categoryCount.get(s.primaryCategory) || 0) + 1);
    }
    
    const dominantCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    
    const outliers = subscriptions
      .filter(s => !dominantCategories.includes(s.primaryCategory) && s.aiConfidence >= 4)
      .slice(0, 5)
      .map(s => {
        const channel = channelMap.get(s.channelId);
        return {
          channelId: s.channelId,
          title: channel?.title || "Unknown",
          reason: `Only ${s.primaryCategory} channel in a profile dominated by ${dominantCategories[0] || "unknown"}`,
        };
      });
    
    // 4. Redundancies (multiple channels in the same narrow sub-topic)
    // Group by category and find those with many channels
    const redundancies: { topic: string; channels: string[] }[] = [];
    
    const categoryGroups = new Map<string, typeof subscriptions>();
    for (const s of subscriptions) {
      if (!categoryGroups.has(s.primaryCategory)) {
        categoryGroups.set(s.primaryCategory, []);
      }
      categoryGroups.get(s.primaryCategory)!.push(s);
    }
    
    for (const [category, subs] of categoryGroups) {
      if (subs.length >= 3) {
        redundancies.push({
          topic: `${category} content`,
          channels: subs.slice(0, 5).map(s => s.channelId),
        });
      }
    }
    
    // Calculate needs attention count
    const needsAttentionCount = deadChannels.length + lowConfidence.length + outliers.length;
    
    return NextResponse.json({
      deadChannels,
      outliers,
      redundancies,
      lowConfidence,
      needsAttentionCount,
    });
    
  } catch (error) {
    console.error("GET /insights error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
