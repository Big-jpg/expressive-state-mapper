import { NextRequest, NextResponse } from "next/server";
import { getMockDb } from "@/lib/mock-db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "30");

    // Use mock database
    const db = getMockDb();
    const user = await db.getUser("demo");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get time-series data with features
    const timeseries = await db.getDrawingsWithFeatures(user.id, limit);

    // Compute statistics
    const anomalyScores = timeseries
      .map((t) => t.anomaly_score)
      .filter((s): s is number => s !== null && s !== undefined);

    let stats = {
      count: timeseries.length,
      meanAnomalyScore: 0,
      maxAnomalyScore: 0,
      recentTrend: "stable",
    };

    if (anomalyScores.length > 0) {
      stats.meanAnomalyScore =
        anomalyScores.reduce((a, b) => a + b, 0) / anomalyScores.length;
      stats.maxAnomalyScore = Math.max(...anomalyScores);

      // Simple trend detection: compare recent 5 vs previous 5
      if (anomalyScores.length >= 10) {
        const recent5 = anomalyScores.slice(-5);
        const previous5 = anomalyScores.slice(-10, -5);
        const recentMean = recent5.reduce((a, b) => a + b, 0) / 5;
        const previousMean = previous5.reduce((a, b) => a + b, 0) / 5;

        if (recentMean > previousMean * 1.2) {
          stats.recentTrend = "increasing";
        } else if (recentMean < previousMean * 0.8) {
          stats.recentTrend = "decreasing";
        }
      }
    }

    // Identify change points (simple threshold-based)
    const changePoints: Array<{
      index: number;
      timestamp: string;
      anomalyScore: number;
    }> = [];

    if (anomalyScores.length >= 5) {
      const sorted = [...anomalyScores].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const deviations = anomalyScores.map((s) => Math.abs(s - median));
      const mad = deviations.sort((a, b) => a - b)[
        Math.floor(deviations.length / 2)
      ];

      timeseries.forEach((t, i) => {
        if (
          t.anomaly_score !== null &&
          t.anomaly_score !== undefined &&
          Math.abs(t.anomaly_score - median) > 2.5 * mad
        ) {
          changePoints.push({
            index: i,
            timestamp: t.created_at,
            anomalyScore: t.anomaly_score,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      timeseries,
      stats,
      changePoints,
    });
  } catch (error) {
    console.error("Time-series analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

