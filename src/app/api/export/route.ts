import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions, channelMetadata } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  
  const format = searchParams.get("format") || "json";
  const status = searchParams.get("status");
  
  try {
    // Build conditions
    const conditions = [eq(userSubscriptions.userId, userId)];
    
    if (status) {
      conditions.push(eq(userSubscriptions.status, status as "active" | "muted" | "archived" | "unsubscribed_on_youtube"));
    }
    
    // Fetch subscriptions
    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(and(...conditions));
    
    // Fetch channel metadata
    const channelIds = subscriptions.map(s => s.channelId);
    const channels = await db
      .select()
      .from(channelMetadata)
      .where(inArray(channelMetadata.channelId, channelIds));
    
    const channelMap = new Map(channels.map(c => [c.channelId, c]));
    
    // Build export data
    const exportData = subscriptions.map(s => {
      const channel = channelMap.get(s.channelId);
      return {
        channelName: channel?.title || "Unknown",
        channelId: s.channelId,
        category: s.primaryCategory,
        secondaryCategory: s.secondaryCategory,
        rank: s.rank,
        status: s.status,
        subscriberCount: channel?.subscriberCount ? Number(channel.subscriberCount) : null,
        contentType: s.contentType,
        postingCadence: s.postingCadence,
        subscribedAt: s.subscribedAt?.toISOString() || null,
        confidence: s.aiConfidence,
      };
    });
    
    if (format === "csv") {
      // Generate CSV
      const headers = [
        "channelName",
        "channelId",
        "category",
        "secondaryCategory",
        "rank",
        "status",
        "subscriberCount",
        "contentType",
        "postingCadence",
        "subscribedAt",
        "confidence",
      ];
      
      const csvRows = [headers.join(",")];
      
      for (const row of exportData) {
        const values = [
          `"${(row.channelName || "").replace(/"/g, '""')}"`,
          row.channelId,
          `"${(row.category || "").replace(/"/g, '""')}"`,
          `"${(row.secondaryCategory || "").replace(/"/g, '""')}"`,
          row.rank ?? "",
          row.status,
          row.subscriberCount ?? "",
          row.contentType || "",
          row.postingCadence || "",
          row.subscribedAt || "",
          row.confidence,
        ];
        csvRows.push(values.join(","));
      }
      
      const csvContent = csvRows.join("\n");
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="subscriptions-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }
    
    // JSON format (default)
    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="subscriptions-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
    
  } catch (error) {
    console.error("GET /export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export subscriptions" },
      { status: 500 }
    );
  }
}
