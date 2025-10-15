#!/usr/bin/env python3
"""
CLI wrapper for feature extraction
Usage: python3 extract_features.py '<json_data>'
"""

import sys
import json
from feature_extractor import extract_features, compute_qc_flags

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input data provided"}))
        sys.exit(1)
    
    try:
        drawing_data = json.loads(sys.argv[1])
        
        strokes = drawing_data.get("strokes", [])
        features = extract_features(drawing_data)
        qc = compute_qc_flags(features, strokes)
        
        result = {
            "features": features,
            "qc": qc,
        }
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

