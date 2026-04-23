import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions, channelMetadata } from "@/lib/db/schema";
import { eq, and, like, or, desc, asc, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  
  // Parse query params
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const confidence = searchParams.get("confidence");
  const reviewed = searchParams.get("reviewed");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "rank";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  
  try {
    // Build conditions
    const conditions = [eq(userSubscriptions.userId, userId)];
    
    if (status) {
      conditions.push(eq(userSubscriptions.status, status as "active" | "muted" | "archived" | "unsubscribed_on_youtube"));
    }
    
    if (category) {
      conditions.push(eq(userSubscriptions.primaryCategory, category));
    }
    
    if (confidence === "low") {
      conditions.push(sql`${userSubscriptions.aiConfidence} <= 3`);
    } else if (confidence === "high") {
      conditions.push(sql`${userSubscriptions.aiConfidence} >= 4`);
    }
    
    if (reviewed === "true") {
      conditions.push(eq(userSubscriptions.reviewed, true));
    } else if (reviewed === "false") {
      conditions.push(eq(userSubscriptions.reviewed, false));
    }
    
    // Build the query
    let query = db
      .select({
        channelId: userSubscriptions.channelId,
        subscribedAt: userSubscriptions.subscribedAt,
        rank: userSubscriptions.rank,
        primaryCategory: userSubscriptions.primaryCategory,
        secondaryCategory: userSubscriptions.secondaryCategory,
        primaryGroup: userSubscriptions.primaryGroup,
        primaryNiche: userSubscriptions.primaryNiche,
        aiConfidence: userSubscriptions.aiConfidence,
        aiReasoning: userSubscriptions.aiReasoning,
        contentType: userSubscriptions.contentType,
        postingCadence: userSubscriptions.postingCadence,
        status: userSubscriptions.status,
        userOverridden: userSubscriptions.userOverridden,
        reviewed: userSubscriptions.reviewed,
        lastSyncedAt: userSubscriptions.lastSyncedAt,
      })
      .from(userSubscriptions)
      .where(and(...conditions))
      .orderBy(asc(userSubscriptions.rank), asc(userSubscriptions.channelId))
      .limit(limit)
      .offset(offset);
    
    const subscriptions = await query;
    
    // Fetch channel metadata for all subscriptions
    const channelIds = subscriptions.map(s => s.channelId);
    const channels = await db
      .select()
      .from(channelMetadata)
      .where(inArray(channelMetadata.channelId, channelIds));
    
    const channelMap = new Map(channels.map(c => [c.channelId, c]));
    
    // Apply search filter if needed (fuzzy search on channel name)
    let filteredSubscriptions = subscriptions;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSubscriptions = subscriptions.filter(s => {
        const channel = channelMap.get(s.channelId);
        return channel?.title.toLowerCase().includes(searchLower);
      });
    }
    
    // Build response
    const response = filteredSubscriptions.map(s => {
      const channel = channelMap.get(s.channelId);
      return {
        channelId: s.channelId,
        channel: channel ? {
          title: channel.title,
          description: channel.description,
          thumbnailUrl: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount ? Number(channel.subscriberCount) : null,
          lastUploadAt: channel.lastUploadAt,
          country: channel.country,
        } : null,
        primaryCategory: s.primaryCategory,
        secondaryCategory: s.secondaryCategory,
        primaryGroup: s.primaryGroup,
        primaryNiche: s.primaryNiche,
        aiConfidence: s.aiConfidence,
        aiReasoning: s.aiReasoning,
        contentType: s.contentType,
        postingCadence: s.postingCadence,
        rank: s.rank,
        status: s.status,
        reviewed: s.reviewed,
        userOverridden: s.userOverridden,
        subscribedAt: s.subscribedAt,
      };
    });
    
    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    
    return NextResponse.json({
      subscriptions: response,
      total: Number(count),
      limit,
      offset,
    });
    
  } catch (error) {
    console.error("GET /subscriptions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const { channelIds, status, primaryCategory } = body;
    
    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json({ error: "channelIds array is required" }, { status: 400 });
    }
    
    if (!status && !primaryCategory) {
      return NextResponse.json({ error: "At least one of status or primaryCategory is required" }, { status: 400 });
    }
    
    // Build update values
    const updateValues: Record<string, unknown> = {
      reviewed: true,
    };
    
    if (status) {
      updateValues.status = status;
    }
    
    if (primaryCategory) {
      updateValues.primaryCategory = primaryCategory;
    }
    
    // Update subscriptions
    const result = await db
      .update(userSubscriptions)
      .set(updateValues)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          inArray(userSubscriptions.channelId, channelIds)
        )
      );
    
    return NextResponse.json({ updated: (result as { rowCount?: number }).rowCount || channelIds.length });
    
  } catch (error) {
    console.error("PATCH /subscriptions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subscriptions" },
      { status: 500 }
    );
  }
}
