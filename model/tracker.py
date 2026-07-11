"""
Multi-object cell tracking across video frames.

Wraps Ultralytics' built-in tracker (ByteTrack) so each cell keeps a stable
track ID from frame to frame. That lets us count *unique* cells instead of
re-counting the same cell on every frame.
"""
from ultralytics import YOLO
from model.config import WEIGHTS_PATH, CELL_TYPES, CONFIDENCE_THRESHOLD, canonical_cell_type


def format_tracks(boxes_xyxy, track_ids, class_ids, scores, names,
                  threshold: float = CONFIDENCE_THRESHOLD):
    """
    Convert raw tracker outputs into clean track records.

    Args:
        boxes_xyxy — iterable of [x1, y1, x2, y2] in pixel coordinates
        track_ids  — iterable of persistent track IDs (ints)
        class_ids  — iterable of class indices (ints)
        scores     — iterable of confidence scores
        names      — dict {class_index: class_name} from the model
        threshold  — minimum confidence to keep a track

    Returns:
        list of {id, cell_type, confidence, box: {x, y, w, h}}
    """
    tracks = []
    for box, tid, cid, score in zip(boxes_xyxy, track_ids, class_ids, scores):
        if score < threshold:
            continue
        cell_type = canonical_cell_type(names.get(int(cid)) if isinstance(names, dict)
                                        else names[int(cid)])
        if cell_type is None:
            continue
        x1, y1, x2, y2 = box
        tracks.append({
            "id":         int(tid),
            "cell_type":  cell_type,
            "confidence": float(round(float(score), 4)),
            "box": {
                "x": int(x1),
                "y": int(y1),
                "w": int(x2 - x1),
                "h": int(y2 - y1),
            },
        })
    return tracks


class CellTracker:
    """
    Stateful per-session tracker. Create one per video/WebSocket session so its
    ByteTrack state and unique-ID sets are isolated from other sessions.
    """

    def __init__(self, model_path: str = None, tracker_cfg: str = "bytetrack.yaml"):
        self.model = YOLO(model_path or WEIGHTS_PATH)
        self.tracker_cfg = tracker_cfg
        self._seen = {cell: set() for cell in CELL_TYPES}

    def _ingest(self, tracks):
        """Record each track's ID under its cell type for unique counting."""
        for t in tracks:
            self._seen[t["cell_type"]].add(t["id"])

    def unique_counts(self) -> dict:
        """Distinct cells seen so far, per type."""
        return {cell: len(ids) for cell, ids in self._seen.items()}

    def track_frame(self, frame_bgr) -> dict:
        """
        Run tracking on a single BGR frame.
        Returns {"tracks": [...], "unique_counts": {...}}.
        """
        results = self.model.track(
            frame_bgr, persist=True, tracker=self.tracker_cfg, verbose=False
        )
        result = results[0]
        boxes = result.boxes

        if boxes is None or boxes.id is None or len(boxes) == 0:
            tracks = []
        else:
            xyxy = boxes.xyxy.cpu().numpy().tolist()
            ids  = boxes.id.cpu().numpy().tolist()
            cls  = boxes.cls.cpu().numpy().tolist()
            conf = boxes.conf.cpu().numpy().tolist()
            tracks = format_tracks(xyxy, ids, cls, conf, result.names)

        self._ingest(tracks)
        return {"tracks": tracks, "unique_counts": self.unique_counts()}
