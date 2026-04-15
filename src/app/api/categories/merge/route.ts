import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions, channelMetadata, userCategories } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const { sourceId, targetId } = body;
    
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: "sourceId and targetId are required" }, { status: 400 });
    }
    
    if (sourceId === targetId) {
      return NextResponse.json({ error: "Cannot merge category with itself" }, { status: 400 });
    }
    
    // Get source and target categories
    const [source] = await db
      .select()
      .from(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, sourceId)
        )
      )
      .limit(1);
    
    const [target] = await db
      .select()
      .from(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, targetId)
        )
      )
      .limit(1);
    
    if (!source) {
      return NextResponse.json({ error: "Source category not found" }, { status: 404 });
    }
    
    if (!target) {
      return NextResponse.json({ error: "Target category not found" }, { status: 404 });
    }
    
    // Count channels in source category
    const channelsInSource = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.primaryCategory, source.name)
        )
      );
    
    const channelsMoved = channelsInSource.length;
    
    // Move channels from source to target
    if (channelsMoved > 0) {
      await db
        .update(userSubscriptions)
        .set({ primaryCategory: target.name })
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.primaryCategory, source.name)
          )
        );
    }
    
    // Update target channel count
    await db
      .update(userCategories)
      .set({ channelCount: target.channelCount + channelsMoved })
      .where(eq(userCategories.id, targetId));
    
    // Delete source category
    await db
      .delete(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, sourceId)
        )
      );
    
    return NextResponse.json({ merged: true, channelsMoved });
    
  } catch (error) {
    console.error("POST /categories/merge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to merge categories" },
      { status: 500 }
    );
  }
}
