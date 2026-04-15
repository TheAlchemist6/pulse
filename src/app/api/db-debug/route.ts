import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Just test basic connectivity
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    
    const result = await db.run(sql`SELECT current_database(), current_user`);
    const rows = await result.rows;
    
    return NextResponse.json({ 
      connected: true, 
      database: rows[0]?.current_database,
      user: rows[0]?.current_user
    });
  } catch (error: any) {
    return NextResponse.json({ 
      connected: false, 
      error: error.message,
      code: error.code,
      // Masked connection info for debugging
      host: process.env.DATABASE_URL?.split("@")[1]?.split(":")[0] || "unknown"
    }, { status: 500 });
  }
}
