import pytest
from model.predict import format_detections


def test_format_detections_filters_low_confidence():
    """format_detections should exclude detections below threshold."""
    names = {0: "RBC", 1: "WBC"}
    boxes  = [[10, 10, 50, 50], [20, 20, 60, 60]]
    cls    = [0, 1]
    scores = [0.9, 0.2]   # second one is below the 0.5 threshold

    detections, counts = format_detections(boxes, cls, scores, names)
    assert len(detections) == 1
    assert detections[0]["cell_type"] == "RBC"
    assert detections[0]["confidence"] == pytest.approx(0.9, abs=0.01)
    assert detections[0]["box"] == {"x": 10, "y": 10, "w": 40, "h": 40}


def test_format_detections_returns_correct_counts():
    """format_detections should count cells per type across all CELL_TYPES."""
    names = {0: "RBC"}
    boxes  = [[0, 0, 30, 30], [40, 40, 80, 80]]
    cls    = [0, 0]
    scores = [0.9, 0.8]

    _, counts = format_detections(boxes, cls, scores, names)
    assert counts["RBC"] == 2
    assert counts["WBC"] == 0
    assert counts["Platelet"] == 0


def test_format_detections_normalizes_platelets_label():
    """The BCCD 'Platelets' class name should fold to canonical 'Platelet'."""
    names = {0: "Platelets"}
    detections, counts = format_detections([[0, 0, 5, 5]], [0], [0.99], names)
    assert detections[0]["cell_type"] == "Platelet"
    assert counts["Platelet"] == 1


def test_format_detections_ignores_unknown_classes():
    """Classes with no canonical mapping (e.g. COCO 'person') are dropped."""
    names = {0: "person", 1: "car"}
    detections, counts = format_detections(
        [[0, 0, 5, 5], [6, 6, 9, 9]], [0, 1], [0.99, 0.99], names
    )
    assert detections == []
    assert counts == {"RBC": 0, "WBC": 0, "Platelet": 0}
