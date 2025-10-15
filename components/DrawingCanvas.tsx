"use client";

import { useEffect, useRef, useState } from "react";
import paper from "paper";
import { v4 as uuidv4 } from "uuid";
import { Stroke, StrokePoint, DrawingPayload } from "@/lib/types";

type Tool = "pen" | "brush" | "eraser";

interface DrawingCanvasProps {
  onSave: (payload: DrawingPayload) => void;
}

export default function DrawingCanvas({ onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(2);
  const [note, setNote] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const scopeRef = useRef<paper.PaperScope | null>(null);
  const currentPathRef = useRef<paper.Path | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scope = new paper.PaperScope();
    scope.setup(canvasRef.current);
    scopeRef.current = scope;

    const startTime = Date.now();

    scope.view.onMouseDown = (event: paper.MouseEvent) => {
      const path = new scope.Path();
      path.strokeColor = new scope.Color(color);
      path.strokeWidth = width;
      path.strokeCap = "round";
      path.strokeJoin = "round";

      currentPathRef.current = path;

      const strokeId = uuidv4();
      const points: StrokePoint[] = [
        {
          x: event.point.x,
          y: event.point.y,
          t: Date.now() - startTime,
          pressure: (event as any).pressure || 1.0,
        },
      ];

      currentStrokeRef.current = {
        id: strokeId,
        tool,
        color,
        width,
        opacity: 1.0,
        points,
        closed: false,
        layer: 0,
      };

      path.add(event.point);
    };

    scope.view.onMouseDrag = (event: paper.MouseEvent) => {
      if (!currentPathRef.current || !currentStrokeRef.current) return;

      currentPathRef.current.add(event.point);

      currentStrokeRef.current.points.push({
        x: event.point.x,
        y: event.point.y,
        t: Date.now() - startTime,
        pressure: (event as any).pressure || 1.0,
      });
    };

    scope.view.onMouseUp = () => {
      if (currentStrokeRef.current) {
        setStrokes((prev) => [...prev, currentStrokeRef.current!]);
      }
      currentPathRef.current = null;
      currentStrokeRef.current = null;
    };

    return () => {
      if (scope && scope.project) {
        scope.project.clear();
      }
    };
  }, [color, width, tool]);

  const handleClear = () => {
    if (scopeRef.current) {
      scopeRef.current.project.clear();
      setStrokes([]);
    }
  };

  const handleSave = () => {
    if (!scopeRef.current) return;

    const svg = scopeRef.current.project.exportSVG({ asString: true }) as string;

    const payload: DrawingPayload = {
      canvas: {
        width: canvasRef.current?.width || 800,
        height: canvasRef.current?.height || 600,
      },
      strokes,
      shapes: [], // Not implementing shapes in this MVP
      svg,
      note160: note.slice(0, 160),
      createdAt: Date.now(),
    };

    onSave(payload);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
        <div className="flex gap-2">
          <button
            onClick={() => setTool("pen")}
            className={`px-4 py-2 rounded ${
              tool === "pen" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Pen
          </button>
          <button
            onClick={() => setTool("brush")}
            className={`px-4 py-2 rounded ${
              tool === "brush" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Brush
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`px-4 py-2 rounded ${
              tool === "eraser" ? "bg-blue-500 text-white" : "bg-white"
            }`}
          >
            Eraser
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label>Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <label>Width:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-32"
          />
          <span>{width}px</span>
        </div>

        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
      />

      {/* Note input */}
      <div className="flex flex-col gap-2">
        <label className="font-semibold">
          Self-note ({note.length}/160 characters):
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 160))}
          maxLength={160}
          className="p-3 border-2 border-gray-300 rounded-lg resize-none"
          rows={3}
          placeholder="Optional: Add a brief note about your drawing or current state..."
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
      >
        Save Drawing
      </button>
    </div>
  );
}

