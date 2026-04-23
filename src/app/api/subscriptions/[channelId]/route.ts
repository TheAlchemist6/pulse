import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions, channelMetadata, overrideLog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const { channelId } = await params;
  const userId = session.user.id;
  
  try {
    // Get subscription with channel metadata
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.channelId, channelId)
        )
      )
      .limit(1);
    
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    
    // Get channel metadata
    const [channel] = await db
      .select()
      .from(channelMetadata)
      .where(eq(channelMetadata.channelId, channelId))
      .limit(1);
    
    return NextResponse.json({
      subscription: {
        channelId: subscription.channelId,
        channel: channel ? {
          title: channel.title,
          description: channel.description,
          thumbnailUrl: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount ? Number(channel.subscriberCount) : null,
          lastUploadAt: channel.lastUploadAt,
          country: channel.country,
        } : null,
        primaryCategory: subscription.primaryCategory,
        secondaryCategory: subscription.secondaryCategory,
        primaryGroup: subscription.primaryGroup,
        primaryNiche: subscription.primaryNiche,
        aiConfidence: subscription.aiConfidence,
        aiReasoning: subscription.aiReasoning,
        contentType: subscription.contentType,
        postingCadence: subscription.postingCadence,
        rank: subscription.rank,
        status: subscription.status,
        reviewed: subscription.reviewed,
        userOverridden: subscription.userOverridden,
        subscribedAt: subscription.subscribedAt,
      },
    });
    
  } catch (error) {
    console.error("GET /subscriptions/[channelId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const { channelId } = await params;
  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const { status, rank, primaryCategory, primaryGroup, primaryNiche, confirmed } = body;

    // Get current subscription
    const [current] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.channelId, channelId)
        )
      )
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      reviewed: true,
    };

    // Handle override learning when category changes
    if (primaryCategory && primaryCategory !== current.primaryCategory) {
      updateValues.primaryCategory = primaryCategory;
      updateValues.userOverridden = true;
      updateValues.overrideFromCategory = current.primaryCategory;
      updateValues.overrideToCategory = primaryCategory;
      updateValues.overriddenAt = new Date();

      // Log the override
      await db.insert(overrideLog).values({
        userId,
        channelId,
        fromCategory: current.primaryCategory,
        toCategory: primaryCategory,
        aiConfidenceWas: current.aiConfidence,
      });
    }

    // Pulse Map Tier 1 Move action: group + niche reassignment
    if (primaryGroup !== undefined && primaryGroup !== current.primaryGroup) {
      updateValues.primaryGroup = primaryGroup;
      updateValues.userOverridden = true;
      // Mirror to legacy primaryCategory so existing reads stay coherent
      if (!primaryCategory) {
        updateValues.primaryCategory = primaryNiche || primaryGroup || current.primaryCategory;
      }
      updateValues.overrideFromCategory = current.primaryGroup ?? current.primaryCategory;
      updateValues.overrideToCategory = primaryGroup;
      updateValues.overriddenAt = new Date();

      await db.insert(overrideLog).values({
        userId,
        channelId,
        fromCategory: current.primaryGroup ?? current.primaryCategory,
        toCategory: primaryGroup,
        aiConfidenceWas: current.aiConfidence,
      });
    }
    if (primaryNiche !== undefined && primaryNiche !== current.primaryNiche) {
      updateValues.primaryNiche = primaryNiche;
    }

    if (status !== undefined) {
      updateValues.status = status;
    }

    if (rank !== undefined) {
      updateValues.rank = rank;
    }
    
    // Handle confirmation (does not set user_overridden)
    if (confirmed === true) {
      updateValues.aiConfidence = 5;
      updateValues.reviewed = true;
    }
    
    // Update subscription
    await db
      .update(userSubscriptions)
      .set(updateValues)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.channelId, channelId)
        )
      );
    
    // Fetch updated subscription
    const [updated] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.channelId, channelId)
        )
      )
      .limit(1);
    
    // Get channel metadata
    const [channel] = await db
      .select()
      .from(channelMetadata)
      .where(eq(channelMetadata.channelId, channelId))
      .limit(1);
    
    return NextResponse.json({
      updated: true,
      subscription: {
        channelId: updated.channelId,
        channel: channel ? {
          title: channel.title,
          description: channel.description,
          thumbnailUrl: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount ? Number(channel.subscriberCount) : null,
          lastUploadAt: channel.lastUploadAt,
          country: channel.country,
        } : null,
        primaryCategory: updated.primaryCategory,
        secondaryCategory: updated.secondaryCategory,
        primaryGroup: updated.primaryGroup,
        primaryNiche: updated.primaryNiche,
        aiConfidence: updated.aiConfidence,
        aiReasoning: updated.aiReasoning,
        contentType: updated.contentType,
        postingCadence: updated.postingCadence,
        rank: updated.rank,
        status: updated.status,
        reviewed: updated.reviewed,
        userOverridden: updated.userOverridden,
        subscribedAt: updated.subscribedAt,
      },
    });
    
  } catch (error) {
    console.error("PATCH /subscriptions/[channelId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subscription" },
      { status: 500 }
    );
  }
}
