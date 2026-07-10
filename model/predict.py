"""Inference utility — loads the trained YOLO model and runs detection."""
from ultralytics import YOLO
from model.config import WEIGHTS_PATH, CELL_TYPES, CONFIDENCE_THRESHOLD, canonical_cell_type


def load_model(model_path: str = None):
    """Load a YOLO model from disk (a .pt file). Returns the YOLO instance."""
    path = model_path or WEIGHTS_PATH
    return YOLO(path)


def format_detections(boxes_xyxy, class_ids, scores, names,
                      threshold: float = CONFIDENCE_THRESHOLD):
    """
    Convert raw YOLO outputs into the API's clean detection list.

    Args:
        boxes_xyxy — iterable of [x1, y1, x2, y2] in pixel coordinates
        class_ids  — iterable of class indices (ints)
        scores     — iterable of confidence scores
        names      — dict {class_index: class_name} from the trained model
        threshold  — minimum confidence to keep a detection

    Returns:
        detections  — list of {cell_type, confidence, box: {x, y, w, h}}
        cell_counts — {RBC: int, WBC: int, Platelet: int}
    """
    detections = []
    cell_counts = {cell: 0 for cell in CELL_TYPES}

    for box, cid, score in zip(boxes_xyxy, class_ids, scores):
        if score < threshold:
            continue
        raw_name = names.get(int(cid)) if isinstance(names, dict) else names[int(cid)]
        cell_type = canonical_cell_type(raw_name)
        if cell_type is None:
            continue
        x1, y1, x2, y2 = box
        detections.append({
            "cell_type":  cell_type,
            "confidence": float(round(float(score), 4)),
            "box": {
                "x": int(x1),
                "y": int(y1),
                "w": int(x2 - x1),
                "h": int(y2 - y1),
            },
        })
        cell_counts[cell_type] += 1

    return detections, cell_counts


def predict(model, image_path: str) -> dict:
    """
    Run full inference on an image file.
    Returns the formatted response dict ready for the API.

    The image path is passed straight to YOLO so Ultralytics loads it in the
    BGR channel order the model was trained on. (Feeding a PIL/RGB array here
    silently swaps the R and B channels and wrecks predictions.)
    """
    results = model(image_path, verbose=False)
    result = results[0]
    height, width = result.orig_shape   # original image (h, w)
    boxes = result.boxes

    if boxes is None or len(boxes) == 0:
        detections, cell_counts = [], {cell: 0 for cell in CELL_TYPES}
    else:
        xyxy   = boxes.xyxy.cpu().numpy().tolist()
        cls    = boxes.cls.cpu().numpy().tolist()
        conf   = boxes.conf.cpu().numpy().tolist()
        detections, cell_counts = format_detections(xyxy, cls, conf, result.names)

    return {
        "image_width":  width,
        "image_height": height,
        "detections":   detections,
        "cell_counts":  cell_counts,
    }
