#!/usr/bin/env python3
"""
ESM Baseline & Anomaly Analyzer
Computes within-person baselines and detects deviations
"""

import numpy as np
from typing import Dict, List, Tuple
from scipy.stats import trim_mean


def compute_robust_baseline(
    feature_history: List[Dict[str, float]], window: int = 30
) -> Dict[str, Dict[str, float]]:
    """
    Compute robust baseline statistics (median, MAD) for each feature.
    
    Args:
        feature_history: List of feature dictionaries (most recent first)
        window: Number of recent sessions to use for baseline
    
    Returns:
        Dict mapping feature name to {median, mad}
    """
    if not feature_history:
        return {}
    
    # Take the most recent window
    recent = feature_history[:window]
    
    # Collect values for each feature
    feature_values = {}
    for features in recent:
        for key, value in features.items():
            if key not in feature_values:
                feature_values[key] = []
            feature_values[key].append(value)
    
    # Compute robust statistics
    baseline = {}
    for key, values in feature_values.items():
        if len(values) < 3:  # Need at least 3 points
            baseline[key] = {"median": np.median(values), "mad": 0.0}
            continue
        
        median = np.median(values)
        mad = np.median(np.abs(np.array(values) - median))
        
        # Avoid zero MAD
        if mad < 1e-6:
            mad = np.std(values) / 1.253  # Approximate MAD from std
            if mad < 1e-6:
                mad = 0.1  # Fallback
        
        baseline[key] = {"median": median, "mad": mad}
    
    return baseline


def compute_z_scores(
    features: Dict[str, float], baseline: Dict[str, Dict[str, float]]
) -> Dict[str, float]:
    """
    Compute robust z-scores for each feature.
    
    z = (x - median) / MAD
    """
    zmap = {}
    
    for key, value in features.items():
        if key not in baseline:
            zmap[key] = 0.0
            continue
        
        median = baseline[key]["median"]
        mad = baseline[key]["mad"]
        
        if mad > 0:
            z = (value - median) / mad
        else:
            z = 0.0
        
        zmap[key] = z
    
    return zmap


def compute_anomaly_score(zmap: Dict[str, float], trim: float = 0.2) -> float:
    """
    Compute composite anomaly score using trimmed mean of absolute z-scores.
    
    Args:
        zmap: Dictionary of z-scores
        trim: Proportion to trim from each end (0.2 = 20% from each end)
    
    Returns:
        Anomaly score (higher = more anomalous)
    """
    if not zmap:
        return 0.0
    
    abs_z = [abs(z) for z in zmap.values()]
    
    if len(abs_z) == 0:
        return 0.0
    
    # Trimmed mean
    trimmed = trim_mean(abs_z, trim)
    
    return trimmed


def detect_change_points_simple(
    anomaly_scores: List[float], threshold: float = 2.5
) -> List[int]:
    """
    Simple change-point detection using MAD-based threshold.
    
    Args:
        anomaly_scores: List of anomaly scores (chronological order)
        threshold: Number of MADs above median to flag as change-point
    
    Returns:
        List of indices where change-points are detected
    """
    if len(anomaly_scores) < 5:
        return []
    
    scores = np.array(anomaly_scores)
    median = np.median(scores)
    mad = np.median(np.abs(scores - median))
    
    if mad < 1e-6:
        return []
    
    # Flag points that exceed threshold
    change_points = []
    for i in range(len(scores)):
        if abs(scores[i] - median) > threshold * mad:
            change_points.append(i)
    
    return change_points


def compute_ema(values: List[float], alpha: float = 0.3) -> List[float]:
    """
    Compute exponential moving average.
    
    Args:
        values: List of values (chronological order)
        alpha: Smoothing factor (0 < alpha <= 1)
    
    Returns:
        List of EMA values
    """
    if not values:
        return []
    
    ema = [values[0]]
    for i in range(1, len(values)):
        ema.append(alpha * values[i] + (1 - alpha) * ema[-1])
    
    return ema


def identify_top_contributing_features(
    zmap: Dict[str, float], top_n: int = 5
) -> List[Tuple[str, float]]:
    """
    Identify features contributing most to anomaly.
    
    Returns:
        List of (feature_name, z_score) tuples, sorted by absolute z-score
    """
    sorted_features = sorted(
        zmap.items(), key=lambda x: abs(x[1]), reverse=True
    )
    
    return sorted_features[:top_n]


def generate_interpretation_text(
    top_features: List[Tuple[str, float]]
) -> str:
    """
    Generate human-readable interpretation of top features.
    """
    if not top_features:
        return "No significant deviations detected."
    
    # Feature name to human-readable description
    descriptions = {
        "geom.mean_curvature": "curvature",
        "geom.total_length": "total ink length",
        "geom.pen_lift_rate": "pen lifts",
        "color.hue_variance": "color diversity",
        "color.palette_size": "number of colors",
        "comp.spatial_entropy": "spatial distribution",
        "geom.mean_velocity": "drawing speed",
        "geom.std_velocity": "speed variation",
        "comp.vertical_symmetry": "symmetry",
        "layer.eraser_ratio": "eraser usage",
    }
    
    parts = []
    for feature, z in top_features[:3]:  # Top 3
        desc = descriptions.get(feature, feature)
        direction = "higher" if z > 0 else "lower"
        parts.append(f"{direction} {desc}")
    
    return "Top signals: " + ", ".join(parts)


if __name__ == "__main__":
    # Test with sample data
    feature_history = [
        {"geom.total_length": 500, "color.hue_variance": 0.2},
        {"geom.total_length": 520, "color.hue_variance": 0.18},
        {"geom.total_length": 480, "color.hue_variance": 0.22},
        {"geom.total_length": 510, "color.hue_variance": 0.19},
        {"geom.total_length": 490, "color.hue_variance": 0.21},
    ]
    
    current_features = {"geom.total_length": 700, "color.hue_variance": 0.05}
    
    baseline = compute_robust_baseline(feature_history)
    print("Baseline:")
    for key, stats in baseline.items():
        print(f"  {key}: median={stats['median']:.2f}, mad={stats['mad']:.2f}")
    
    zmap = compute_z_scores(current_features, baseline)
    print("\nZ-scores:")
    for key, z in zmap.items():
        print(f"  {key}: {z:.2f}")
    
    anomaly = compute_anomaly_score(zmap)
    print(f"\nAnomaly score: {anomaly:.2f}")
    
    top_features = identify_top_contributing_features(zmap)
    print("\nTop contributing features:")
    for feature, z in top_features:
        print(f"  {feature}: {z:.2f}")
    
    interpretation = generate_interpretation_text(top_features)
    print(f"\nInterpretation: {interpretation}")

