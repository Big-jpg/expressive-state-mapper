-- ESM Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  consent JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drawings table
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
);

-- Features table
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  v JSONB NOT NULL,             -- flat feature map
  qc JSONB NOT NULL,            -- quality control flags
  anomaly_score DOUBLE PRECISION,
  zmap JSONB                    -- per-feature z-scores
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawings_user_created ON drawings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_features_user_created ON features (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_features_drawing ON features (drawing_id);

-- Insert a demo user for testing
INSERT INTO users (handle, consent) 
VALUES ('demo', '{"data_collection": true, "analysis": true}'::jsonb)
ON CONFLICT (handle) DO NOTHING;

