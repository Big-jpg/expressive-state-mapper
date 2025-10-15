import { z } from "zod";

export const StrokePointSchema = z.object({
  x: z.number(),
  y: z.number(),
  t: z.number(),
  pressure: z.number().optional(),
  tilt: z.number().optional(),
});

export const StrokeSchema = z.object({
  id: z.string(),
  tool: z.enum(["pen", "brush", "eraser"]),
  color: z.string(),
  width: z.number(),
  opacity: z.number(),
  points: z.array(StrokePointSchema),
  closed: z.boolean(),
  layer: z.number(),
});

export const ShapeSchema = z.object({
  id: z.string(),
  kind: z.enum(["rect", "circle", "poly"]),
  bbox: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  layer: z.number(),
  style: z.any(),
});

export const DrawingPayloadSchema = z.object({
  canvas: z.object({
    width: z.number(),
    height: z.number(),
    dpi: z.number().optional(),
  }),
  strokes: z.array(StrokeSchema),
  shapes: z.array(ShapeSchema),
  svg: z.string(),
  note160: z.string().max(160).optional(),
  mood: z
    .object({
      valence: z.number().optional(),
      arousal: z.number().optional(),
    })
    .optional(),
  createdAt: z.number(),
});

