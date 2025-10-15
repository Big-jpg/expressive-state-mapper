// Mock database for demo mode (when PostgreSQL is not available)

import { v4 as uuidv4 } from "uuid";

interface User {
  id: string;
  handle: string;
  consent: any;
  created_at: string;
}

interface Drawing {
  id: string;
  user_id: string;
  created_at: string;
  canvas_w: number;
  canvas_h: number;
  svg: string;
  strokes_json: any;
  note160?: string;
  mood?: any;
}

interface Feature {
  id: string;
  drawing_id: string;
  user_id: string;
  created_at: string;
  v: Record<string, number>;
  qc: Record<string, boolean>;
  anomaly_score?: number;
  zmap?: Record<string, number>;
}

class MockDatabase {
  private users: Map<string, User> = new Map();
  private drawings: Map<string, Drawing> = new Map();
  private features: Map<string, Feature> = new Map();

  constructor() {
    // Initialize with demo user
    const demoUserId = uuidv4();
    this.users.set(demoUserId, {
      id: demoUserId,
      handle: "demo",
      consent: { data_collection: true, analysis: true },
      created_at: new Date().toISOString(),
    });
  }

  async getUser(handle: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.handle === handle) {
        return user;
      }
    }
    return null;
  }

  async insertDrawing(data: {
    user_id: string;
    canvas_w: number;
    canvas_h: number;
    svg: string;
    strokes_json: any;
    note160?: string;
    mood?: any;
  }): Promise<Drawing> {
    const drawing: Drawing = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.drawings.set(drawing.id, drawing);
    return drawing;
  }

  async getDrawing(id: string): Promise<Drawing | null> {
    return this.drawings.get(id) || null;
  }

  async getDrawingsByUser(
    userId: string,
    limit: number = 30
  ): Promise<Drawing[]> {
    const drawings = Array.from(this.drawings.values())
      .filter((d) => d.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
    return drawings;
  }

  async insertFeature(data: {
    drawing_id: string;
    user_id: string;
    v: Record<string, number>;
    qc: Record<string, boolean>;
    anomaly_score?: number;
    zmap?: Record<string, number>;
  }): Promise<Feature> {
    const feature: Feature = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.features.set(feature.drawing_id, feature);
    return feature;
  }

  async getFeatureByDrawing(drawingId: string): Promise<Feature | null> {
    return this.features.get(drawingId) || null;
  }

  async getFeaturesByUser(
    userId: string,
    limit: number = 30
  ): Promise<Feature[]> {
    const features = Array.from(this.features.values())
      .filter((f) => f.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
    return features;
  }

  async getDrawingsWithFeatures(
    userId: string,
    limit: number = 30
  ): Promise<
    Array<{
      id: string;
      created_at: string;
      note160?: string;
      mood?: any;
      features?: Record<string, number>;
      anomaly_score?: number;
      zmap?: Record<string, number>;
    }>
  > {
    const drawings = await this.getDrawingsByUser(userId, limit);
    return drawings.map((d) => {
      const feature = this.features.get(d.id);
      return {
        id: d.id,
        created_at: d.created_at,
        note160: d.note160,
        mood: d.mood,
        features: feature?.v,
        anomaly_score: feature?.anomaly_score,
        zmap: feature?.zmap,
      };
    });
  }
}

// Singleton instance
let mockDb: MockDatabase | null = null;

export function getMockDb(): MockDatabase {
  if (!mockDb) {
    mockDb = new MockDatabase();
  }
  return mockDb;
}

