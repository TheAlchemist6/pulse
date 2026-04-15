import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const { category, order } = body;
    
    if (!order || !Array.isArray(order)) {
      return NextResponse.json({ error: "order array is required" }, { status: 400 });
    }
    
    // Update each channel's rank based on its position in the order array
    let reordered = 0;
    
    for (let i = 0; i < order.length; i++) {
      const channelId = order[i];
      const newRank = i;
      
      const result = await db
        .update(userSubscriptions)
        .set({ rank: newRank })
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.channelId, channelId)
          )
        );
      
      const rowCount = (result as { rowCount?: number }).rowCount;
      if (rowCount && rowCount > 0) {
        reordered++;
      }
    }
    
    return NextResponse.json({ reordered });
    
  } catch (error) {
    console.error("PUT /subscriptions/reorder error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reorder subscriptions" },
      { status: 500 }
    );
  }
}
