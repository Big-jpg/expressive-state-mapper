#!/usr/bin/env python3
"""
CLI wrapper for baseline and anomaly computation
Usage: python3 compute_baseline.py '<json_data>'
"""

import sys
import json
from baseline_analyzer import (
    compute_robust_baseline,
    compute_z_scores,
    compute_anomaly_score,
    identify_top_contributing_features,
    generate_interpretation_text,
)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided"}))
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[1])
        
        current_features = data.get("current_features", {})
        feature_history = data.get("feature_history", [])
        
        # Compute baseline
        baseline = compute_robust_baseline(feature_history)
        
        # Compute z-scores
        zmap = compute_z_scores(current_features, baseline)
        
        # Compute anomaly score
        anomaly_score = compute_anomaly_score(zmap)
        
        # Identify top features
        top_features = identify_top_contributing_features(zmap)
        
        # Generate interpretation
        interpretation = generate_interpretation_text(top_features)
        
        result = {
            "baseline": baseline,
            "zmap": zmap,
            "anomaly_score": anomaly_score,
            "top_features": [{"feature": f, "z": z} for f, z in top_features],
            "interpretation": interpretation,
        }
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

