import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "30");

    if (!userId) {
      // Get demo user by default
      const userResult = await sql`
        SELECT id FROM users WHERE handle = 'demo' LIMIT 1
      `;

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return getSeriesForUser(userResult.rows[0].id, limit);
    }

    return getSeriesForUser(userId, limit);
  } catch (error) {
    console.error("Series retrieval error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

async function getSeriesForUser(userId: string, limit: number) {
  // Get drawings with features
  const result = await sql`
    SELECT 
      d.id,
      d.created_at,
      d.note160,
      d.mood,
      f.v as features,
      f.anomaly_score,
      f.zmap
    FROM drawings d
    LEFT JOIN features f ON f.drawing_id = d.id
    WHERE d.user_id = ${userId}
    ORDER BY d.created_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({
    success: true,
    data: result.rows,
    count: result.rows.length,
  });
}

