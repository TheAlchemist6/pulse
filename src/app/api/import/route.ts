import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { importPipeline, type ImportProgressEvent } from "@/lib/import-pipeline";
import { getFreshAccessToken } from "@/lib/youtube";

// ============================================================================
// Rate Limiting (In-Memory)
// ============================================================================

const concurrentImports = new Map<string, boolean>();
const dailyImportCount = new Map<string, number>();
const dailyImportReset = new Map<string, number>();

function getDailyResetTimestamp(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

function checkRateLimit(userId: string): { allowed: boolean; error?: string; code?: number } {
  const now = Date.now();
  
  // Check concurrent limit
  if (concurrentImports.get(userId)) {
    return { allowed: false, error: "Import already in progress", code: 409 };
  }
  
  // Check and reset daily count if needed
  const resetTime = dailyImportReset.get(userId) || getDailyResetTimestamp();
  if (now >= resetTime) {
    dailyImportCount.set(userId, 0);
    dailyImportReset.set(userId, getDailyResetTimestamp());
  }
  
  const count = dailyImportCount.get(userId) || 0;
  if (count >= 3) {
    return { allowed: false, error: "Daily import limit reached", code: 429 };
  }
  
  return { allowed: true };
}

function markImportStarted(userId: string): void {
  concurrentImports.set(userId, true);
  dailyImportCount.set(userId, (dailyImportCount.get(userId) || 0) + 1);
}

function markImportFinished(userId: string): void {
  concurrentImports.delete(userId);
}

// ============================================================================
// POST /api/import
// ============================================================================

export async function POST() {
  // ===== Auth Guard =====
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  // ===== Rate Limit Check =====
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.error }, { status: rateCheck.code });
  }
  
  // Mark import as started (before async operation)
  markImportStarted(userId);
  
  // ===== Create SSE Stream =====
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: ImportProgressEvent) => {
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller might already be closed
        }
      };
      
      try {
        // ===== Get User's OAuth Token =====
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (!user?.oauthAccessToken) {
          sendEvent({ step: "error", message: "No YouTube access token found" });
          controller.close();
          return;
        }
        
        // ===== Get Fresh Access Token (refresh if needed) =====
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
        
        // ===== Run Import Pipeline =====
        for await (const event of importPipeline(userId, accessToken)) {
          sendEvent(event);
          
          // If complete or error, stop
          if (event.step === "complete" || event.step === "error") {
            break;
          }
        }
        
      } catch (error) {
        console.error("Import pipeline error:", error);
        sendEvent({ 
          step: "error", 
          message: error instanceof Error ? error.message : "Pipeline failure" 
        });
      } finally {
        markImportFinished(userId);
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
