import os

# ── Cell type definitions ──────────────────────────────────────────────────
# To add a new cell type in Phase 2: add an entry here + retrain the model.

CELL_TYPES = ["RBC", "WBC", "Platelet"]

# Maps TF OD API class index (1-based) → cell type name
LABEL_MAP = {
    1: "RBC",
    2: "WBC",
    3: "Platelet",
}

# Colour used when drawing bounding boxes (hex strings for frontend, RGB for backend)
CELL_COLOURS = {
    "RBC":      {"hex": "#FF4444", "rgb": (255, 68, 68)},
    "WBC":      {"hex": "#44FF44", "rgb": (68, 255, 68)},
    "Platelet": {"hex": "#FFD700", "rgb": (255, 215, 0)},
}

CONFIDENCE_THRESHOLD = 0.5   # detections below this score are ignored

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT_DIR         = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR        = os.path.join(ROOT_DIR, "model")
DATA_DIR         = os.path.join(MODEL_DIR, "data")
TRAINING_DIR     = os.path.join(MODEL_DIR, "training")
EXPORTED_DIR     = os.path.join(MODEL_DIR, "exported_model")
PRETRAINED_DIR   = os.path.join(MODEL_DIR, "pre-trained-model")
LABEL_MAP_PATH   = os.path.join(MODEL_DIR, "label_map.pbtxt")
PIPELINE_CONFIG  = os.path.join(MODEL_DIR, "pipeline.config")
