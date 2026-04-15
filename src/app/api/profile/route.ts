import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userSubscriptions, channelMetadata } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get subscription stats
    const allSubscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    
    const total = allSubscriptions.length;
    const active = allSubscriptions.filter(s => s.status === "active").length;
    const muted = allSubscriptions.filter(s => s.status === "muted").length;
    const archived = allSubscriptions.filter(s => s.status === "archived").length;
    const dead = allSubscriptions.filter(s => s.status === "unsubscribed_on_youtube").length;
    const reviewed = allSubscriptions.filter(s => s.reviewed).length;
    
    // Get channel metadata for additional insights
    const channelIds = allSubscriptions.map(s => s.channelId);
    const channels = await db
      .select()
      .from(channelMetadata)
      .where(inArray(channelMetadata.channelId, channelIds));
    
    const channelMap = new Map(channels.map(c => [c.channelId, c]));
    
    // Calculate category distribution
    const categoryCount = new Map<string, number>();
    for (const sub of allSubscriptions) {
      categoryCount.set(
        sub.primaryCategory,
        (categoryCount.get(sub.primaryCategory) || 0) + 1
      );
    }
    
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Build subscription eras (simplified grouping by subscribed year)
    const eraGroups = new Map<string, typeof allSubscriptions>();
    for (const sub of allSubscriptions) {
      if (sub.subscribedAt) {
        const year = new Date(sub.subscribedAt).getFullYear().toString();
        if (!eraGroups.has(year)) {
          eraGroups.set(year, []);
        }
        eraGroups.get(year)!.push(sub);
      }
    }
    
    const subscriptionEras = Array.from(eraGroups.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
      .slice(0, 5)
      .map(([period, subs]) => {
        // Find most common category in this era
        const catCounts = new Map<string, number>();
        for (const s of subs) {
          catCounts.set(s.primaryCategory, (catCounts.get(s.primaryCategory) || 0) + 1);
        }
        const dominantCat = Array.from(catCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
        
        const eraChannels = subs.slice(0, 5).map(s => ({
          channelId: s.channelId,
          title: channelMap.get(s.channelId)?.title || "Unknown",
        }));
        
        return {
          period,
          name: dominantCat,
          channels: eraChannels,
          theme: `Content from ${period}`,
        };
      });
    
    return NextResponse.json({
      user: {
        name: user.name,
        avatarUrl: user.avatarUrl,
        country: user.country,
        isCreator: user.isCreator,
        youtubeMemberSince: user.youtubeMemberSince,
        subscriptionCount: user.subscriptionCount,
        profileSummary: user.profileSummary || generateProfileSummary(topCategories, total),
        dominantThemes: user.dominantThemes || topCategories.slice(0, 3).map(c => c.name),
        topCategories,
        diversityScore: user.diversityScore ? Number(user.diversityScore) : calculateDiversityScore(categoryCount, total),
        deadChannelCount: dead,
        onboardingStage: user.onboardingStage,
        lastSyncedAt: user.lastSyncedAt,
        createdAt: user.createdAt,
      },
      stats: {
        total,
        active,
        muted,
        archived,
        dead,
        reviewed,
        reviewProgress: total > 0 ? reviewed / total : 0,
      },
      subscriptionEras,
    });
    
  } catch (error) {
    console.error("GET /profile error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

function generateProfileSummary(topCategories: { name: string; count: number }[], total: number): string {
  if (topCategories.length === 0) {
    return "Start subscribing to channels to build your profile.";
  }
  
  const top = topCategories[0];
  const percentage = Math.round((top.count / total) * 100);
  
  return `You're heavily invested in ${top.name} (${percentage}% of your subscriptions).`;
}

function calculateDiversityScore(categoryCount: Map<string, number>, total: number): number {
  if (total === 0) return 0;
  
  // Calculate Shannon entropy-based diversity
  let entropy = 0;
  for (const count of categoryCount.values()) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  // Normalize to 0-1 scale (max entropy is log2 of number of categories)
  const maxEntropy = Math.log2(categoryCount.size || 1);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}
