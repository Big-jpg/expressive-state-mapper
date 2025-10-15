// Core data types for ESM

export type StrokePoint = {
  x: number;
  y: number;
  t: number;
  pressure?: number;
  tilt?: number;
};

export type Stroke = {
  id: string;
  tool: "pen" | "brush" | "eraser";
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
  closed: boolean;
  layer: number;
};

export type Shape = {
  id: string;
  kind: "rect" | "circle" | "poly";
  bbox: { x: number; y: number; w: number; h: number };
  layer: number;
  style: any;
};

export type DrawingPayload = {
  canvas: { width: number; height: number; dpi?: number };
  strokes: Stroke[];
  shapes: Shape[];
  svg: string;
  note160?: string; // <=160 chars
  mood?: { valence?: number; arousal?: number };
  createdAt: number;
};

export type Drawing = {
  id: string;
  userId: string;
  createdAt: string;
  canvasW: number;
  canvasH: number;
  svg: string;
  strokesJson: any;
  note160?: string;
  mood?: any;
};

export type Features = {
  id: string;
  drawingId: string;
  userId: string;
  createdAt: string;
  v: Record<string, number>; // flat feature map
  qc: Record<string, boolean>; // quality control flags
  anomalyScore?: number;
  zmap?: Record<string, number>; // per-feature z-scores
};

export type User = {
  id: string;
  handle: string;
  consent: any;
};

