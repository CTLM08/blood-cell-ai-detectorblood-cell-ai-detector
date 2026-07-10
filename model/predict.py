"""Inference utility — loads the exported SavedModel and runs detection."""
import tensorflow as tf
import numpy as np
from PIL import Image
from typing import Any
from model.config import EXPORTED_DIR, LABEL_MAP, CELL_TYPES, CONFIDENCE_THRESHOLD
import os


def load_model(model_path: str = None):
    """Load the TF SavedModel from disk. Returns a callable TF function."""
    path = model_path or os.path.join(EXPORTED_DIR, "saved_model")
    model = tf.saved_model.load(path)
    return model.signatures["serving_default"]


def preprocess_image(image_path: str):
    """
    Load an image file and convert to a (1, H, W, 3) uint8 tensor.
    Returns: (tensor, original_width, original_height)
    """
    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    image_np = np.array(image, dtype=np.uint8)
    tensor = tf.convert_to_tensor(image_np, dtype=tf.uint8)
    tensor = tensor[tf.newaxis, ...]   # add batch dimension
    return tensor, width, height


def format_detections(
    raw: dict[str, Any],
    width: int,
    height: int,
    threshold: float = CONFIDENCE_THRESHOLD,
) -> tuple[list, dict, int, int]:
    """
    Parse raw TF OD API output into a clean list of detections.

    Returns:
        detections  — list of {cell_type, confidence, box}
        cell_counts — {RBC: int, WBC: int, Platelet: int}
        width       — image width (pixels)
        height      — image height (pixels)
    """
    # np.array() works on both TF tensors and plain numpy arrays (important for tests)
    boxes   = np.array(raw["detection_boxes"][0])
    classes = np.array(raw["detection_classes"][0]).astype(int)
    scores  = np.array(raw["detection_scores"][0])

    detections = []
    cell_counts = {cell: 0 for cell in CELL_TYPES}

    for i, score in enumerate(scores):
        if score < threshold:
            continue
        cell_type = LABEL_MAP.get(classes[i])
        if cell_type is None:
            continue
        ymin, xmin, ymax, xmax = boxes[i]
        detections.append({
            "cell_type":  cell_type,
            "confidence": float(round(float(score), 4)),
            "box": {
                "x": int(xmin * width),
                "y": int(ymin * height),
                "w": int((xmax - xmin) * width),
                "h": int((ymax - ymin) * height),
            },
        })
        cell_counts[cell_type] += 1

    return detections, cell_counts, width, height


def predict(model, image_path: str) -> dict:
    """
    Run full inference on an image file.
    Returns the formatted response dict ready for the API.
    """
    tensor, width, height = preprocess_image(image_path)
    raw = model(tensor)
    detections, cell_counts, w, h = format_detections(raw, width, height)
    return {
        "image_width":  w,
        "image_height": h,
        "detections":   detections,
        "cell_counts":  cell_counts,
    }
