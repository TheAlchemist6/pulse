import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { runSyncPipeline } from "@/lib/sync-pipeline";
import { getFreshAccessToken } from "@/lib/youtube";

// ============================================================================
// Rate Limiting (In-Memory)
// ============================================================================

const dailySyncCount = new Map<string, number>();
const dailySyncReset = new Map<string, number>();

function getDailyResetTimestamp(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

function checkRateLimit(userId: string): { allowed: boolean; error?: string; code?: number } {
  const now = Date.now();
  
  // Check and reset daily count if needed
  const resetTime = dailySyncReset.get(userId) || getDailyResetTimestamp();
  if (now >= resetTime) {
    dailySyncCount.set(userId, 0);
    dailySyncReset.set(userId, getDailyResetTimestamp());
  }
  
  const count = dailySyncCount.get(userId) || 0;
  if (count >= 10) {
    return { allowed: false, error: "Daily sync limit reached", code: 429 };
  }
  
  return { allowed: true };
}

function markSyncCompleted(userId: string): void {
  dailySyncCount.set(userId, (dailySyncCount.get(userId) || 0) + 1);
}

// ============================================================================
// POST /api/sync
// ============================================================================

export async function POST() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  // Check rate limit
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.error }, { status: rateCheck.code });
  }
  
  try {
    // Get user's OAuth token from DB
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user?.oauthAccessToken) {
      return NextResponse.json({ error: "No YouTube access token found" }, { status: 400 });
    }
    
    // Get Fresh Access Token (refresh if needed)
    let accessToken = user.oauthAccessToken;
    if (user.oauthRefreshToken && user.oauthExpiresAt) {
      try {
        accessToken = await getFreshAccessToken(
          user.oauthAccessToken,
          user.oauthRefreshToken,
          user.oauthExpiresAt
        );
        
        // Update token if refreshed
        if (accessToken !== user.oauthAccessToken) {
          await db
            .update(users)
            .set({ oauthAccessToken: accessToken })
            .where(eq(users.id, userId));
        }
      } catch {
        // Continue with existing token
      }
    }
    
    // Run sync pipeline
    const result = await runSyncPipeline(userId, accessToken);
    
    markSyncCompleted(userId);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
