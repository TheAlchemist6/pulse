import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

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
    console.error("PATCH /subscriptions/bulk error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to bulk update subscriptions" },
      { status: 500 }
    );
  }
}
