import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { getMockDb } from "@/lib/mock-db";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { drawingId } = await request.json();

    if (!drawingId) {
      return NextResponse.json(
        { error: "Drawing ID is required" },
        { status: 400 }
      );
    }

    // Use mock database
    const db = getMockDb();
    const drawing = await db.getDrawing(drawingId);

    if (!drawing) {
      return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
    }

    // Prepare data for Python feature extractor
    const drawingData = {
      canvas_w: drawing.canvas_w,
      canvas_h: drawing.canvas_h,
      strokes: drawing.strokes_json,
    };

    // Call Python feature extractor
    const pythonScript = path.join(process.cwd(), "python", "extract_features.py");
    const dataJson = JSON.stringify(drawingData).replace(/"/g, '\\"');

    let features: Record<string, number> = {};
    let qc: Record<string, boolean> = {};

    try {
      const { stdout } = await execAsync(`python3 "${pythonScript}" "${dataJson}"`);
      const result = JSON.parse(stdout);
      features = result.features || {};
      qc = result.qc || {};
    } catch (error) {
      console.error("Python extraction error:", error);
      qc = { error: true };
    }

    // Fetch user's feature history for baseline computation
    const featureHistory = await db.getFeaturesByUser(drawing.user_id, 30);
    const historyValues = featureHistory.map((f) => f.v);

    // Compute baseline and z-scores
    let zmap: Record<string, number> = {};
    let anomalyScore = 0;

    if (historyValues.length >= 3) {
      try {
        const baselineScript = path.join(
          process.cwd(),
          "python",
          "compute_baseline.py"
        );
        const baselineData = JSON.stringify({
          current_features: features,
          feature_history: historyValues,
        }).replace(/"/g, '\\"');

        const { stdout: baselineOut } = await execAsync(
          `python3 "${baselineScript}" "${baselineData}"`
        );
        const baselineResult = JSON.parse(baselineOut);
        zmap = baselineResult.zmap || {};
        anomalyScore = baselineResult.anomaly_score || 0;
      } catch (error) {
        console.error("Baseline computation error:", error);
      }
    }

    // Insert features into database
    await db.insertFeature({
      drawing_id: drawingId,
      user_id: drawing.user_id,
      v: features,
      qc,
      anomaly_score: anomalyScore,
      zmap,
    });

    return NextResponse.json({
      success: true,
      features,
      anomalyScore,
      message: "Features extracted successfully",
    });
  } catch (error) {
    console.error("Feature extraction error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

