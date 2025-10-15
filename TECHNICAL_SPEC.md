# Expressive State Mapper - Technical Specification

## Executive Summary

The Expressive State Mapper (ESM) is a longitudinal drawing analysis system that implements the core principle of **interpretation humility**: extracting objective features from drawings without making diagnostic claims or subjective interpretations. The system tracks within-person deviations from personal baselines over time, surfacing signals rather than labels.

## System Design Philosophy

### Core Tenets

1. **Objectivity**: Extract only measurable features (geometry, color, dynamics)
2. **Personal Baselines**: Compare each person only to themselves, never to others
3. **Transparency**: Show exactly which features contribute to any alert
4. **Privacy**: Granular consent, no hidden inferences
5. **Humility**: Surface "more pen lifts than usual," not "anxious"

### Non-Goals

- Cross-person comparisons or population norms
- Diagnostic classification or mental health assessment
- Subjective interpretation of drawing content
- Hidden machine learning inferences

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────────┐           ┌─────────────────────────┐ │
│  │  Drawing Canvas  │           │      Dashboard          │ │
│  │   (Paper.js)     │           │     (Recharts)          │ │
│  └────────┬─────────┘           └──────────┬──────────────┘ │
│           │                                 │                │
└───────────┼─────────────────────────────────┼────────────────┘
            │                                 │
            ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js Routes)                │
│  /api/drawing/ingest  │  /api/drawing/feature-extract       │
│  /api/analysis/timeseries  │  /api/analysis/baseline        │
└─────────────────────────────────────────────────────────────┘
            │                                 │
            ▼                                 ▼
┌─────────────────────┐         ┌───────────────────────────┐
│  Python Services    │         │   Data Storage            │
│  - Feature Extract  │◄────────┤   - Drawings              │
│  - Baseline Analyze │         │   - Features              │
└─────────────────────┘         │   - Users                 │
                                └───────────────────────────┘
```

## Data Models

### User
```typescript
{
  id: UUID
  handle: string (unique)
  consent: JSONB {
    data_collection: boolean
    analysis: boolean
    research: boolean
  }
  created_at: timestamp
}
```

### Drawing
```typescript
{
  id: UUID
  user_id: UUID (FK)
  created_at: timestamp
  canvas_w: integer
  canvas_h: integer
  svg: text (full SVG export)
  strokes_json: JSONB {
    strokes: [{
      id: string
      tool: "pen" | "brush" | "eraser"
      color: string (hex)
      width: number
      opacity: number
      points: [{
        x: number
        y: number
        t: number (milliseconds)
        pressure?: number (0-1)
        tilt?: number
      }]
      closed: boolean
      layer: number
    }]
  }
  note160: varchar(160) (optional self-note)
  mood: JSONB (optional valence/arousal)
}
```

### Features
```typescript
{
  id: UUID
  drawing_id: UUID (FK, unique)
  user_id: UUID (FK)
  created_at: timestamp
  v: JSONB {
    // Composition features
    "comp.centroid_x": number
    "comp.centroid_y": number
    "comp.spatial_entropy": number
    "comp.thirds_occupied": number
    "comp.vertical_symmetry": number
    
    // Geometry features
    "geom.total_length": number
    "geom.mean_stroke_length": number
    "geom.std_stroke_length": number
    "geom.mean_curvature": number
    "geom.max_curvature": number
    "geom.high_curvature_pct": number
    "geom.mean_velocity": number
    "geom.std_velocity": number
    "geom.mean_pressure": number
    "geom.std_pressure": number
    "geom.pen_lift_rate": number
    
    // Color features
    "color.palette_size": number
    "color.hue_variance": number
    "color.mean_saturation": number
    "color.mean_value": number
    "color.warm_proportion": number
    "color.mean_opacity": number
    "color.std_opacity": number
    
    // Layer features
    "layer.mean": number
    "layer.std": number
    "layer.eraser_ratio": number
  }
  qc: JSONB {
    too_short: boolean
    missing_pressure: boolean
    too_few_strokes: boolean
  }
  anomaly_score: float (composite deviation)
  zmap: JSONB {
    [feature_name]: z_score
  }
}
```

## Feature Extraction Pipeline

### Stage 1: Stroke-Level Capture (Frontend)

**Captured Data:**
- Point coordinates (x, y) normalized to canvas
- Timestamp (milliseconds from session start)
- Pressure (0-1, if available from input device)
- Tilt angle (if available)
- Tool type (pen/brush/eraser)
- Color (RGBA)
- Stroke width
- Layer/z-index

**Implementation:**
```typescript
// Paper.js event handlers
view.onMouseDown = (event) => {
  const point = {
    x: event.point.x,
    y: event.point.y,
    t: Date.now() - startTime,
    pressure: event.pressure || 1.0
  };
  // Add to current stroke
};
```

### Stage 2: Feature Extraction (Python)

**A. Composition & Layout Features**

1. **Normalized Centroid**
   ```python
   cx = sum(p.x for p in all_points) / len(all_points)
   cy = sum(p.y for p in all_points) / len(all_points)
   centroid_x = cx / canvas_width
   centroid_y = cy / canvas_height
   ```

2. **Spatial Entropy**
   ```python
   # 10x10 grid histogram
   grid = np.zeros((10, 10))
   for x, y in points:
       i, j = int(x/width*10), int(y/height*10)
       grid[j, i] += 1
   grid_norm = grid / grid.sum()
   entropy = -sum(p * log(p) for p in grid_norm if p > 0)
   ```

3. **Rule-of-Thirds Occupancy**
   ```python
   # 3x3 grid
   thirds_grid = np.zeros((3, 3))
   for x, y in points:
       i, j = int(x/(width/3)), int(y/(height/3))
       thirds_grid[min(j,2), min(i,2)] += 1
   occupied_cells = np.count_nonzero(thirds_grid)
   ```

4. **Vertical Symmetry**
   ```python
   left_count = sum(1 for x, y in points if x < width/2)
   right_count = sum(1 for x, y in points if x >= width/2)
   symmetry = 1.0 - abs(left_count - right_count) / total
   ```

**B. Geometry & Stroke Dynamics**

1. **Total Ink Length**
   ```python
   total_length = 0
   for stroke in strokes:
       for i in range(1, len(stroke.points)):
           dx = points[i].x - points[i-1].x
           dy = points[i].y - points[i-1].y
           total_length += sqrt(dx*dx + dy*dy)
   ```

2. **Curvature (Angular Change)**
   ```python
   for i in range(1, len(points)-1):
       v1 = points[i] - points[i-1]
       v2 = points[i+1] - points[i]
       angle = acos(dot(v1, v2) / (|v1| * |v2|))
       curvatures.append(angle)
   mean_curvature = mean(curvatures)
   ```

3. **Velocity**
   ```python
   for i in range(1, len(points)):
       dt = (points[i].t - points[i-1].t) / 1000  # seconds
       dist = distance(points[i], points[i-1])
       velocity = dist / dt if dt > 0 else 0
       velocities.append(velocity)
   ```

4. **Pen-Lift Rate**
   ```python
   pen_lift_rate = num_strokes / (total_time_seconds)
   ```

**C. Color & Texture Features**

1. **Palette Size**
   ```python
   # Quantize hues to 12 bins
   quantized_hues = [round(h * 12) for h in hues]
   palette_size = len(set(quantized_hues))
   ```

2. **Hue Diversity (Circular Variance)**
   ```python
   # Convert RGB to HSV
   hues = [rgb_to_hsv(r, g, b)[0] for r, g, b in colors]
   hue_variance = np.var(hues)
   ```

3. **Color Temperature**
   ```python
   # Warm: red-orange-yellow (hue 0-60° or 300-360°)
   warm_count = sum(1 for h in hues if h < 0.17 or h > 0.83)
   warm_proportion = warm_count / len(hues)
   ```

**D. Layering & Ordering**

1. **Layer Statistics**
   ```python
   layers = [stroke.layer for stroke in strokes]
   layer_mean = mean(layers)
   layer_std = std(layers)
   ```

2. **Eraser Usage**
   ```python
   eraser_count = sum(1 for s in strokes if s.tool == "eraser")
   eraser_ratio = eraser_count / len(strokes)
   ```

### Stage 3: Baseline Computation

**Robust Statistics (Median + MAD)**

```python
def compute_baseline(feature_history, window=30):
    recent = feature_history[:window]
    
    baseline = {}
    for feature_name in feature_names:
        values = [session[feature_name] for session in recent]
        
        median = np.median(values)
        mad = np.median(np.abs(values - median))
        
        # Avoid zero MAD
        if mad < 1e-6:
            mad = np.std(values) / 1.253  # Approximate from std
        
        baseline[feature_name] = {
            "median": median,
            "mad": mad
        }
    
    return baseline
```

**Z-Score Computation**

```python
def compute_z_scores(features, baseline):
    zmap = {}
    for feature_name, value in features.items():
        median = baseline[feature_name]["median"]
        mad = baseline[feature_name]["mad"]
        
        z = (value - median) / mad if mad > 0 else 0
        zmap[feature_name] = z
    
    return zmap
```

**Composite Anomaly Score**

```python
from scipy.stats import trim_mean

def compute_anomaly_score(zmap, trim=0.2):
    abs_z = [abs(z) for z in zmap.values()]
    
    # Trimmed mean (remove 20% from each end)
    anomaly = trim_mean(abs_z, trim)
    
    return anomaly
```

### Stage 4: Change-Point Detection

**Simple MAD-Based Threshold**

```python
def detect_change_points(anomaly_scores, threshold=2.5):
    scores = np.array(anomaly_scores)
    median = np.median(scores)
    mad = np.median(np.abs(scores - median))
    
    change_points = []
    for i, score in enumerate(scores):
        if abs(score - median) > threshold * mad:
            change_points.append(i)
    
    return change_points
```

**Future: Bayesian Online Change-Point Detection (BOCPD)**

```python
# Planned enhancement
def bocpd(data, hazard_rate=1/100):
    """
    Detect change-points using Bayesian online algorithm.
    Returns run-length distribution and change-point probabilities.
    """
    # Implementation of Adams & MacKay (2007) algorithm
    pass
```

## API Specifications

### POST /api/drawing/ingest

**Request:**
```json
{
  "canvas": {
    "width": 800,
    "height": 600,
    "dpi": 96
  },
  "strokes": [
    {
      "id": "uuid",
      "tool": "pen",
      "color": "#FF0000",
      "width": 2,
      "opacity": 1.0,
      "points": [
        {"x": 100, "y": 100, "t": 0, "pressure": 0.8},
        {"x": 150, "y": 150, "t": 100, "pressure": 0.9}
      ],
      "closed": false,
      "layer": 0
    }
  ],
  "shapes": [],
  "svg": "<svg>...</svg>",
  "note160": "Testing the system",
  "createdAt": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "drawingId": "uuid",
  "message": "Drawing saved successfully"
}
```

### GET /api/analysis/timeseries?limit=30

**Response:**
```json
{
  "success": true,
  "timeseries": [
    {
      "id": "uuid",
      "created_at": "2025-10-14T12:00:00Z",
      "note160": "Feeling creative",
      "features": {
        "geom.total_length": 523.4,
        "color.hue_variance": 0.18,
        ...
      },
      "anomaly_score": 1.2,
      "zmap": {
        "geom.total_length": 0.5,
        "color.hue_variance": -0.3,
        ...
      }
    }
  ],
  "stats": {
    "count": 15,
    "meanAnomalyScore": 1.05,
    "maxAnomalyScore": 2.3,
    "recentTrend": "stable"
  },
  "changePoints": [
    {
      "index": 8,
      "timestamp": "2025-10-12T15:30:00Z",
      "anomalyScore": 3.1
    }
  ]
}
```

## Performance Optimization

### Frontend Optimizations

1. **Canvas Rendering**
   - Paper.js uses requestAnimationFrame for smooth 60 FPS
   - Stroke simplification for long paths (Douglas-Peucker)
   - Lazy loading of historical drawings

2. **State Management**
   - React hooks for local state
   - Minimal re-renders with useCallback/useMemo
   - Debounced API calls for dashboard updates

### Backend Optimizations

1. **Feature Extraction**
   - Numpy vectorization for batch operations
   - Cached baseline computations
   - Async Python subprocess calls

2. **Database Queries**
   - Indexed queries on (user_id, created_at)
   - Limit queries to rolling window (30 sessions)
   - JSONB indexing for feature lookups

## Security & Privacy

### Data Protection

1. **Consent Management**
   - Explicit opt-in for data collection
   - Granular permissions (self/clinician/research)
   - Audit log of data access

2. **Data Minimization**
   - No personally identifiable information in drawings
   - Optional self-notes (user-controlled)
   - Automatic data retention limits

3. **Anonymization**
   - Research mode uses differential privacy
   - Separate keyspace for anonymized data
   - No reverse-linkage to individuals

### Ethical Safeguards

1. **No Diagnostic Claims**
   - System explicitly disclaims medical use
   - UI emphasizes "signals not labels"
   - No cross-person comparisons

2. **Transparency**
   - "Why am I seeing this?" panel for all alerts
   - Feature contributions always visible
   - Open-source algorithms

3. **User Control**
   - Export all data (JSON/CSV)
   - Delete account and all data
   - Pause analysis at any time

## Testing Strategy

### Unit Tests

```typescript
// Feature extraction tests
describe('FeatureExtractor', () => {
  test('computes centroid correctly', () => {
    const drawing = createTestDrawing();
    const features = extractFeatures(drawing);
    expect(features['comp.centroid_x']).toBeCloseTo(0.5, 2);
  });
});
```

### Integration Tests

```typescript
// End-to-end workflow
describe('Drawing Pipeline', () => {
  test('ingests drawing and extracts features', async () => {
    const drawing = createTestDrawing();
    const response = await POST('/api/drawing/ingest', drawing);
    expect(response.success).toBe(true);
    
    // Wait for feature extraction
    await sleep(1000);
    
    const features = await GET(`/api/drawing/features/${response.drawingId}`);
    expect(features.v).toHaveProperty('geom.total_length');
  });
});
```

### Validation Tests

```python
# Baseline computation validation
def test_baseline_robustness():
    # Test with outliers
    history = [100, 102, 98, 101, 99, 500]  # 500 is outlier
    baseline = compute_baseline(history)
    
    # Median should be robust to outlier
    assert baseline['median'] == pytest.approx(100, abs=2)
```

## Deployment Architecture

### Development
```
Next.js Dev Server (port 3000)
├── Hot Module Replacement
├── In-memory Mock Database
└── Python subprocess calls
```

### Production
```
Load Balancer
├── Next.js Server (PM2/Docker)
│   ├── API Routes
│   └── Static Assets
├── PostgreSQL (Primary + Replica)
│   ├── Connection Pooling (PgBouncer)
│   └── Automated Backups
└── Python Worker Pool
    ├── Feature Extraction Queue
    └── Baseline Computation Cache
```

## Monitoring & Observability

### Metrics

1. **Performance**
   - Feature extraction latency (p50, p95, p99)
   - API response times
   - Database query performance

2. **Usage**
   - Drawings per day
   - Active users
   - Dashboard views

3. **Quality**
   - QC flag rates (too_short, missing_pressure)
   - Feature extraction errors
   - Anomaly score distribution

### Logging

```typescript
// Structured logging
logger.info('feature_extraction_complete', {
  drawing_id: drawingId,
  user_id: userId,
  feature_count: Object.keys(features).length,
  anomaly_score: anomalyScore,
  duration_ms: extractionTime
});
```

## Future Research Directions

### Advanced Change-Point Detection

Implement BOCPD (Bayesian Online Change-Point Detection) for more sensitive detection of regime changes in drawing patterns.

### Manifold Learning

Train per-user autoencoders to learn the personal "drawing manifold" and use reconstruction error as a more sophisticated anomaly metric.

### Clustering & Modes

Apply HDBSCAN to UMAP-reduced feature space to discover recurring "expression modes" within a person's drawing history.

### Time-Series Forecasting

Use Prophet or STL decomposition to model trend and seasonality in key features, enabling predictive alerts.

### Multi-Modal Integration

Extend to other expressive modalities: voice (prosody features), text (writing dynamics), movement (accelerometer data).

## References

### Statistical Methods
- Rousseeuw & Croux (1993): "Alternatives to the Median Absolute Deviation"
- Adams & MacKay (2007): "Bayesian Online Change-Point Detection"

### Feature Engineering
- Plamondon & Srihari (2000): "Online and Off-Line Handwriting Recognition"
- Faundez-Zanuy (2007): "On-line signature recognition based on VQ-DTW"

### Ethics & Privacy
- Dwork & Roth (2014): "The Algorithmic Foundations of Differential Privacy"
- Mittelstadt et al. (2016): "The ethics of algorithms: Mapping the debate"

---

**Document Version**: 1.0  
**Last Updated**: October 14, 2025  
**Status**: Production-Ready Implementation

