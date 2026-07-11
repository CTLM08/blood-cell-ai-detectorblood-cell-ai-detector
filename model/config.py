import os

# ── Cell type definitions ──────────────────────────────────────────────────
# To add a new cell type in Phase 2: add an entry here + retrain the model.

CELL_TYPES = ["RBC", "WBC", "Platelet"]

# Colour used when drawing bounding boxes (hex strings for frontend, RGB for backend)
CELL_COLOURS = {
    "RBC":      {"hex": "#FF4444", "rgb": (255, 68, 68)},
    "WBC":      {"hex": "#44FF44", "rgb": (68, 255, 68)},
    "Platelet": {"hex": "#FFD700", "rgb": (255, 215, 0)},
}

CONFIDENCE_THRESHOLD = 0.4   # detections below this score are ignored
# 0.4 leans slightly toward recall for dense RBCs vs the old 0.5, without the
# false-positive flood seen at 0.3. Real accuracy gains need a stronger model
# (see model/train.py — yolov8s), since the nano model's mAP is the true limit.

# Maps a raw class name (as trained, e.g. the BCCD "Platelets" label) → our
# canonical cell type. Case-insensitive. Unknown names return None and are
# ignored during formatting (e.g. COCO classes from a stand-in model).
NAME_NORMALIZATION = {
    "rbc":       "RBC",
    "wbc":       "WBC",
    "platelet":  "Platelet",
    "platelets": "Platelet",
}


def canonical_cell_type(raw_name: str):
    """Return the canonical cell type for a trained class name, or None."""
    if raw_name is None:
        return None
    return NAME_NORMALIZATION.get(str(raw_name).strip().lower())


# ── Paths ──────────────────────────────────────────────────────────────────
ROOT_DIR         = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR        = os.path.join(ROOT_DIR, "model")
DATA_DIR         = os.path.join(MODEL_DIR, "data")
RUNS_DIR         = os.path.join(MODEL_DIR, "runs")          # YOLO training outputs
WEIGHTS_DIR      = os.path.join(MODEL_DIR, "weights")       # exported best.pt lives here
WEIGHTS_PATH     = os.path.join(WEIGHTS_DIR, "best.pt")     # loaded by the backend
