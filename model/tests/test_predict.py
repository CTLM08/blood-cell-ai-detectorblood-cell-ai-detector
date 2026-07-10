import pytest
import numpy as np
from unittest.mock import MagicMock, patch
from model.predict import preprocess_image, format_detections


def test_preprocess_image_returns_correct_shape(tmp_path):
    """preprocess_image should return a uint8 tensor of shape (1, H, W, 3)."""
    from PIL import Image
    img = Image.fromarray(np.zeros((100, 120, 3), dtype=np.uint8))
    img_path = str(tmp_path / "test.jpg")
    img.save(img_path)

    tensor, width, height = preprocess_image(img_path)
    assert tensor.shape == (1, 100, 120, 3)
    assert width == 120
    assert height == 100


def test_format_detections_filters_low_confidence():
    """format_detections should exclude detections below threshold."""
    import numpy as np
    raw = {
        "detection_boxes":   [np.array([[0.1, 0.1, 0.5, 0.5], [0.2, 0.2, 0.6, 0.6]])],
        "detection_classes": [np.array([1.0, 2.0])],
        "detection_scores":  [np.array([0.9, 0.2])],   # second one is below 0.5 threshold
    }
    results, counts, w, h = format_detections(raw, width=100, height=100)
    assert len(results) == 1
    assert results[0]["cell_type"] == "RBC"
    assert results[0]["confidence"] == pytest.approx(0.9, abs=0.01)


def test_format_detections_returns_correct_counts():
    """format_detections should count cells per type."""
    import numpy as np
    raw = {
        "detection_boxes":   [np.array([[0.0, 0.0, 0.3, 0.3], [0.4, 0.4, 0.8, 0.8]])],
        "detection_classes": [np.array([1.0, 1.0])],
        "detection_scores":  [np.array([0.9, 0.8])],
    }
    _, counts, _, _ = format_detections(raw, width=100, height=100)
    assert counts["RBC"] == 2
    assert counts["WBC"] == 0
    assert counts["Platelet"] == 0
