import { NextRequest, NextResponse } from "next/server";
import { DrawingPayloadSchema } from "@/lib/schemas";
import { getMockDb } from "@/lib/mock-db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate payload
    const validation = DrawingPayloadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validation.error },
        { status: 400 }
      );
    }

    const payload = validation.data;

    // Use mock database
    const db = getMockDb();
    const user = await db.getUser("demo");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Insert drawing
    const drawing = await db.insertDrawing({
      user_id: user.id,
      canvas_w: payload.canvas.width,
      canvas_h: payload.canvas.height,
      svg: payload.svg,
      strokes_json: payload.strokes,
      note160: payload.note160,
      mood: payload.mood,
    });

    // Trigger feature extraction
    try {
      await fetch(`${request.nextUrl.origin}/api/drawing/feature-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawingId: drawing.id }),
      });
    } catch (error) {
      console.error("Feature extraction trigger failed:", error);
    }

    return NextResponse.json({
      success: true,
      drawingId: drawing.id,
      message: "Drawing saved successfully",
    });
  } catch (error) {
    console.error("Drawing ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

