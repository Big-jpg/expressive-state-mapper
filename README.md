# Expressive State Mapper (ESM)

A longitudinal drawing analysis system that captures vector drawings with self-notes, extracts objective features, tracks within-person deviations from personal baselines, and visualizes trajectories over time.

## Core Principles

- **Objective Features Only**: Analyzes geometry, color, and dynamics—not interpretations
- **Interpretation Humility**: Surfaces signals (e.g., "more pen lifts than usual"), not labels (e.g., "anxious")
- **Within-Person Comparisons**: You're only compared to yourself, never to others
- **Privacy First**: Granular consent and sharing controls

## Architecture

### Frontend
- **Next.js 15** with App Router and TypeScript
- **Paper.js** for vector drawing canvas with stroke-level capture
- **Recharts** for time-series visualizations
- **Tailwind CSS** for styling

### Backend
- **Next.js API Routes** for RESTful endpoints
- **PostgreSQL** for data persistence
- **Python** for feature extraction and baseline analysis

### Data Flow

1. User creates a drawing on the canvas
2. Stroke data (points, pressure, timing) is captured in real-time
3. Drawing + metadata is sent to `/api/drawing/ingest`
4. Feature extraction service extracts ~25 objective features
5. Baseline analyzer computes z-scores against personal history
6. Dashboard visualizes anomaly scores and feature trajectories

## Features Extracted

### A. Composition & Layout
- Normalized centroid
- Spatial entropy
- Rule-of-thirds occupancy
- Symmetry scores

### B. Geometry & Stroke Dynamics
- Total ink length
- Stroke length statistics
- Curvature statistics
- Velocity and acceleration
- Pressure statistics
- Pen-lift rate

### C. Color & Texture
- Palette size
- Hue diversity
- Saturation and value statistics
- Color temperature
- Opacity usage

### D. Layering & Ordering
- Layer depth variance
- Eraser usage ratio

## Setup Instructions

### Prerequisites

- Node.js 22+
- Python 3.11+
- PostgreSQL 14+

### Installation

1. Install dependencies:

```bash
npm install
```

2. Install Python dependencies:

```bash
pip3 install numpy scipy
```

3. Set up PostgreSQL database and configure `.env.local`:

```bash
cp .env.local.example .env.local
# Edit .env.local with your database credentials
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The database schema will be automatically created on first API call.

## Testing the System

1. **Create a Drawing**: 
   - Go to the "Draw" tab
   - Use the pen/brush tools to create a drawing
   - Add an optional self-note (≤160 characters)
   - Click "Save Drawing"

2. **View Dashboard**:
   - Switch to the "Dashboard" tab
   - After creating 3+ drawings, you'll see:
     - Anomaly score timeline
     - Feature trajectories
     - Change-point detection
     - Top contributing features

3. **Observe Baseline Development**:
   - Create 5-10 drawings with consistent patterns
   - Then create a deliberately different drawing
   - The dashboard will flag the deviation

## API Endpoints

- `POST /api/drawing/ingest` - Ingest a new drawing
- `POST /api/drawing/feature-extract` - Extract features (internal)
- `GET /api/drawing/series` - Get time-series data
- `GET /api/analysis/timeseries` - Get analysis with anomaly detection
- `GET /api/analysis/baseline` - Get baseline statistics

## Privacy & Ethics

- **No diagnostic claims**: This system does not diagnose conditions
- **No cross-person comparisons**: All baselines are personal
- **Transparent features**: All contributing features are shown
- **User control**: Export, delete, and sharing controls

## License

MIT License

