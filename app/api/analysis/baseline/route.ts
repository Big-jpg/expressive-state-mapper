import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const window = parseInt(searchParams.get("window") || "30");

    let targetUserId = userId;

    if (!targetUserId) {
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

      targetUserId = userResult.rows[0].id;
    }

    // Get recent features for baseline computation
    const result = await sql`
      SELECT 
        f.v as features,
        f.created_at
      FROM features f
      WHERE f.user_id = ${targetUserId}
      ORDER BY f.created_at DESC
      LIMIT ${window}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        baseline: {},
        message: "No data available for baseline computation",
      });
    }

    // Compute baseline statistics for each feature
    const featureValues: Record<string, number[]> = {};

    result.rows.forEach((row) => {
      const features = row.features as Record<string, number>;
      Object.entries(features).forEach(([key, value]) => {
        if (!featureValues[key]) {
          featureValues[key] = [];
        }
        featureValues[key].push(value);
      });
    });

    // Compute median and MAD for each feature
    const baseline: Record<string, { median: number; mad: number; min: number; max: number }> = {};

    Object.entries(featureValues).forEach(([key, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const deviations = values.map((v) => Math.abs(v - median));
      const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];

      baseline[key] = {
        median,
        mad: mad || 0.1, // Avoid zero MAD
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });

    return NextResponse.json({
      success: true,
      baseline,
      sampleSize: result.rows.length,
      window,
    });
  } catch (error) {
    console.error("Baseline computation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

