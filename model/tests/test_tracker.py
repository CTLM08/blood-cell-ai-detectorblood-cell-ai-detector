from unittest.mock import MagicMock, patch
import pytest
from model.tracker import format_tracks, CellTracker


def test_format_tracks_builds_track_records():
    """xyxy boxes become top-left {x,y,w,h} and carry the track id + cell type."""
    names = {0: "RBC", 1: "WBC"}
    boxes  = [[10, 20, 50, 80]]        # x1,y1,x2,y2
    ids    = [7]
    cls    = [0]
    scores = [0.9]

    tracks = format_tracks(boxes, ids, cls, scores, names)
    assert tracks == [{
        "id": 7,
        "cell_type": "RBC",
        "confidence": pytest.approx(0.9, abs=0.01),
        "box": {"x": 10, "y": 20, "w": 40, "h": 60},
    }]


def test_format_tracks_filters_low_confidence():
    names = {0: "RBC"}
    tracks = format_tracks([[0, 0, 5, 5], [6, 6, 9, 9]], [1, 2], [0, 0], [0.9, 0.2], names)
    assert [t["id"] for t in tracks] == [1]


def test_format_tracks_drops_unknown_classes():
    names = {0: "person"}
    tracks = format_tracks([[0, 0, 5, 5]], [1], [0], [0.99], names)
    assert tracks == []


def test_cell_tracker_accumulates_unique_ids_across_frames():
    """Unique counts should track distinct IDs per class over multiple frames."""
    with patch("model.tracker.YOLO", return_value=MagicMock()):
        tracker = CellTracker()

    # Frame 1: RBC #1, WBC #2
    tracker._ingest([
        {"id": 1, "cell_type": "RBC", "confidence": 0.9, "box": {}},
        {"id": 2, "cell_type": "WBC", "confidence": 0.9, "box": {}},
    ])
    # Frame 2: same RBC #1 (should NOT double-count) + new RBC #3
    tracker._ingest([
        {"id": 1, "cell_type": "RBC", "confidence": 0.9, "box": {}},
        {"id": 3, "cell_type": "RBC", "confidence": 0.9, "box": {}},
    ])

    assert tracker.unique_counts() == {"RBC": 2, "WBC": 1, "Platelet": 0}
