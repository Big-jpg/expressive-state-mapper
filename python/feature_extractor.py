#!/usr/bin/env python3
"""
ESM Feature Extractor
Extracts objective, non-interpretive features from drawing data
"""

import json
import math
import numpy as np
from typing import Dict, List, Any, Tuple
from collections import defaultdict


def extract_features(drawing_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract all features from a drawing payload.
    Returns a flat dictionary of feature name -> value.
    """
    features = {}
    
    strokes = drawing_data.get("strokes", [])
    canvas_w = drawing_data.get("canvas_w", 800)
    canvas_h = drawing_data.get("canvas_h", 600)
    
    if not strokes:
        return get_empty_features()
    
    # A. Composition & layout features
    features.update(extract_composition_features(strokes, canvas_w, canvas_h))
    
    # B. Geometry & stroke dynamics
    features.update(extract_geometry_features(strokes))
    
    # C. Color & texture
    features.update(extract_color_features(strokes))
    
    # D. Layering & ordering
    features.update(extract_layering_features(strokes))
    
    return features


def extract_composition_features(strokes: List[Dict], canvas_w: int, canvas_h: int) -> Dict[str, float]:
    """Extract composition and layout features."""
    features = {}
    
    # Collect all points
    all_points = []
    for stroke in strokes:
        points = stroke.get("points", [])
        all_points.extend([(p["x"], p["y"]) for p in points])
    
    if not all_points:
        return features
    
    # Normalized centroid
    cx = sum(p[0] for p in all_points) / len(all_points)
    cy = sum(p[1] for p in all_points) / len(all_points)
    features["comp.centroid_x"] = cx / canvas_w
    features["comp.centroid_y"] = cy / canvas_h
    
    # Spatial entropy (2D histogram)
    grid_size = 10
    grid = np.zeros((grid_size, grid_size))
    for x, y in all_points:
        i = min(int(x / canvas_w * grid_size), grid_size - 1)
        j = min(int(y / canvas_h * grid_size), grid_size - 1)
        grid[j, i] += 1
    
    # Normalize and compute entropy
    grid_norm = grid / (grid.sum() + 1e-10)
    entropy = -np.sum(grid_norm * np.log(grid_norm + 1e-10))
    features["comp.spatial_entropy"] = entropy
    
    # Rule of thirds occupancy
    thirds_w = canvas_w / 3
    thirds_h = canvas_h / 3
    thirds_grid = np.zeros((3, 3))
    for x, y in all_points:
        i = min(int(x / thirds_w), 2)
        j = min(int(y / thirds_h), 2)
        thirds_grid[j, i] += 1
    
    # Number of occupied cells
    features["comp.thirds_occupied"] = np.count_nonzero(thirds_grid)
    
    # Symmetry scores (simplified - vertical symmetry)
    left_points = sum(1 for x, y in all_points if x < canvas_w / 2)
    right_points = sum(1 for x, y in all_points if x >= canvas_w / 2)
    total = left_points + right_points
    features["comp.vertical_symmetry"] = 1.0 - abs(left_points - right_points) / (total + 1e-10)
    
    return features


def extract_geometry_features(strokes: List[Dict]) -> Dict[str, float]:
    """Extract geometry and stroke dynamics features."""
    features = {}
    
    total_length = 0
    stroke_lengths = []
    curvatures = []
    velocities = []
    pressures = []
    pen_lifts = len(strokes)
    total_time = 0
    
    for stroke in strokes:
        points = stroke.get("points", [])
        if len(points) < 2:
            continue
        
        # Stroke length
        length = 0
        for i in range(1, len(points)):
            dx = points[i]["x"] - points[i-1]["x"]
            dy = points[i]["y"] - points[i-1]["y"]
            seg_length = math.sqrt(dx*dx + dy*dy)
            length += seg_length
        
        total_length += length
        stroke_lengths.append(length)
        
        # Curvature (angular change)
        for i in range(1, len(points) - 1):
            v1x = points[i]["x"] - points[i-1]["x"]
            v1y = points[i]["y"] - points[i-1]["y"]
            v2x = points[i+1]["x"] - points[i]["x"]
            v2y = points[i+1]["y"] - points[i]["y"]
            
            len1 = math.sqrt(v1x*v1x + v1y*v1y) + 1e-10
            len2 = math.sqrt(v2x*v2x + v2y*v2y) + 1e-10
            
            dot = (v1x*v2x + v1y*v2y) / (len1 * len2)
            dot = max(-1, min(1, dot))  # Clamp to [-1, 1]
            angle = math.acos(dot)
            curvatures.append(angle)
        
        # Velocity
        for i in range(1, len(points)):
            dt = (points[i]["t"] - points[i-1]["t"]) / 1000.0  # Convert to seconds
            if dt > 0:
                dx = points[i]["x"] - points[i-1]["x"]
                dy = points[i]["y"] - points[i-1]["y"]
                dist = math.sqrt(dx*dx + dy*dy)
                vel = dist / dt
                velocities.append(vel)
        
        # Pressure
        for point in points:
            if "pressure" in point:
                pressures.append(point["pressure"])
        
        # Total time
        if len(points) > 0:
            total_time = max(total_time, points[-1]["t"])
    
    # Total ink length
    features["geom.total_length"] = total_length
    
    # Stroke length stats
    if stroke_lengths:
        features["geom.mean_stroke_length"] = np.mean(stroke_lengths)
        features["geom.std_stroke_length"] = np.std(stroke_lengths)
    else:
        features["geom.mean_stroke_length"] = 0
        features["geom.std_stroke_length"] = 0
    
    # Curvature stats
    if curvatures:
        features["geom.mean_curvature"] = np.mean(curvatures)
        features["geom.max_curvature"] = np.max(curvatures)
        features["geom.high_curvature_pct"] = sum(1 for c in curvatures if c > 1.0) / len(curvatures)
    else:
        features["geom.mean_curvature"] = 0
        features["geom.max_curvature"] = 0
        features["geom.high_curvature_pct"] = 0
    
    # Velocity stats
    if velocities:
        features["geom.mean_velocity"] = np.mean(velocities)
        features["geom.std_velocity"] = np.std(velocities)
    else:
        features["geom.mean_velocity"] = 0
        features["geom.std_velocity"] = 0
    
    # Pressure stats
    if pressures:
        features["geom.mean_pressure"] = np.mean(pressures)
        features["geom.std_pressure"] = np.std(pressures)
    else:
        features["geom.mean_pressure"] = 1.0
        features["geom.std_pressure"] = 0
    
    # Pen lift rate
    if total_time > 0:
        features["geom.pen_lift_rate"] = pen_lifts / (total_time / 1000.0)
    else:
        features["geom.pen_lift_rate"] = 0
    
    return features


def extract_color_features(strokes: List[Dict]) -> Dict[str, float]:
    """Extract color and texture features."""
    features = {}
    
    colors = []
    opacities = []
    
    for stroke in strokes:
        color = stroke.get("color", "#000000")
        opacity = stroke.get("opacity", 1.0)
        
        # Parse hex color
        if color.startswith("#"):
            r = int(color[1:3], 16) / 255.0
            g = int(color[3:5], 16) / 255.0
            b = int(color[5:7], 16) / 255.0
            
            # Convert to HSV
            h, s, v = rgb_to_hsv(r, g, b)
            colors.append((h, s, v))
        
        opacities.append(opacity)
    
    if colors:
        hues = [c[0] for c in colors]
        sats = [c[1] for c in colors]
        vals = [c[2] for c in colors]
        
        # Palette size (unique hues, quantized)
        quantized_hues = [round(h * 12) for h in hues]  # 12 bins
        features["color.palette_size"] = len(set(quantized_hues))
        
        # Hue diversity (circular variance)
        features["color.hue_variance"] = np.var(hues)
        
        # Saturation and value stats
        features["color.mean_saturation"] = np.mean(sats)
        features["color.mean_value"] = np.mean(vals)
        
        # Color temperature (warm vs cool)
        warm_count = sum(1 for h in hues if 0 <= h < 0.17 or h > 0.83)  # Red-orange-yellow
        features["color.warm_proportion"] = warm_count / len(hues)
    else:
        features["color.palette_size"] = 1
        features["color.hue_variance"] = 0
        features["color.mean_saturation"] = 0
        features["color.mean_value"] = 0
        features["color.warm_proportion"] = 0
    
    # Opacity stats
    if opacities:
        features["color.mean_opacity"] = np.mean(opacities)
        features["color.std_opacity"] = np.std(opacities)
    else:
        features["color.mean_opacity"] = 1.0
        features["color.std_opacity"] = 0
    
    return features


def extract_layering_features(strokes: List[Dict]) -> Dict[str, float]:
    """Extract layering and ordering features."""
    features = {}
    
    layers = [stroke.get("layer", 0) for stroke in strokes]
    
    if layers:
        features["layer.mean"] = np.mean(layers)
        features["layer.std"] = np.std(layers)
    else:
        features["layer.mean"] = 0
        features["layer.std"] = 0
    
    # Eraser usage
    eraser_count = sum(1 for stroke in strokes if stroke.get("tool") == "eraser")
    features["layer.eraser_ratio"] = eraser_count / len(strokes) if strokes else 0
    
    return features


def rgb_to_hsv(r: float, g: float, b: float) -> Tuple[float, float, float]:
    """Convert RGB to HSV color space."""
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    delta = max_c - min_c
    
    # Value
    v = max_c
    
    # Saturation
    s = 0 if max_c == 0 else delta / max_c
    
    # Hue
    if delta == 0:
        h = 0
    elif max_c == r:
        h = ((g - b) / delta) % 6
    elif max_c == g:
        h = ((b - r) / delta) + 2
    else:
        h = ((r - g) / delta) + 4
    
    h = h / 6.0  # Normalize to [0, 1]
    
    return h, s, v


def get_empty_features() -> Dict[str, float]:
    """Return empty feature set with default values."""
    return {
        "comp.centroid_x": 0.5,
        "comp.centroid_y": 0.5,
        "comp.spatial_entropy": 0,
        "comp.thirds_occupied": 0,
        "comp.vertical_symmetry": 1.0,
        "geom.total_length": 0,
        "geom.mean_stroke_length": 0,
        "geom.std_stroke_length": 0,
        "geom.mean_curvature": 0,
        "geom.max_curvature": 0,
        "geom.high_curvature_pct": 0,
        "geom.mean_velocity": 0,
        "geom.std_velocity": 0,
        "geom.mean_pressure": 1.0,
        "geom.std_pressure": 0,
        "geom.pen_lift_rate": 0,
        "color.palette_size": 1,
        "color.hue_variance": 0,
        "color.mean_saturation": 0,
        "color.mean_value": 0,
        "color.warm_proportion": 0,
        "color.mean_opacity": 1.0,
        "color.std_opacity": 0,
        "layer.mean": 0,
        "layer.std": 0,
        "layer.eraser_ratio": 0,
    }


def compute_qc_flags(features: Dict[str, float], strokes: List[Dict]) -> Dict[str, bool]:
    """Compute quality control flags."""
    qc = {}
    
    # Too short
    qc["too_short"] = features.get("geom.total_length", 0) < 10
    
    # Missing pressure data
    has_pressure = any(
        any("pressure" in p for p in stroke.get("points", []))
        for stroke in strokes
    )
    qc["missing_pressure"] = not has_pressure
    
    # Too few strokes
    qc["too_few_strokes"] = len(strokes) < 3
    
    return qc


if __name__ == "__main__":
    # Test with sample data
    sample_data = {
        "canvas_w": 800,
        "canvas_h": 600,
        "strokes": [
            {
                "id": "test1",
                "tool": "pen",
                "color": "#FF0000",
                "width": 2,
                "opacity": 1.0,
                "points": [
                    {"x": 100, "y": 100, "t": 0, "pressure": 0.8},
                    {"x": 150, "y": 150, "t": 100, "pressure": 0.9},
                    {"x": 200, "y": 100, "t": 200, "pressure": 0.7},
                ],
                "closed": False,
                "layer": 0,
            }
        ],
    }
    
    features = extract_features(sample_data)
    qc = compute_qc_flags(features, sample_data["strokes"])
    
    print("Features:")
    for key, value in sorted(features.items()):
        print(f"  {key}: {value:.4f}")
    
    print("\nQC Flags:")
    for key, value in qc.items():
        print(f"  {key}: {value}")

