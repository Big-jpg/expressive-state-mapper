import { sql } from "@vercel/postgres";

export async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        handle TEXT UNIQUE NOT NULL,
        consent JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Create drawings table
    await sql`
      CREATE TABLE IF NOT EXISTS drawings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        canvas_w INT NOT NULL,
        canvas_h INT NOT NULL,
        svg TEXT NOT NULL,
        strokes_json JSONB NOT NULL,
        note160 VARCHAR(160),
        mood JSONB
      )
    `;

    // Create features table
    await sql`
      CREATE TABLE IF NOT EXISTS features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        v JSONB NOT NULL,
        qc JSONB NOT NULL,
        anomaly_score DOUBLE PRECISION,
        zmap JSONB,
        UNIQUE(drawing_id)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_drawings_user_created ON drawings (user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_features_user_created ON features (user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_features_drawing ON features (drawing_id)`;

    // Insert demo user
    await sql`
      INSERT INTO users (handle, consent) 
      VALUES ('demo', '{"data_collection": true, "analysis": true}'::jsonb)
      ON CONFLICT (handle) DO NOTHING
    `;

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

export { sql };

