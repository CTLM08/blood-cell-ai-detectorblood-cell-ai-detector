import pytest
from unittest.mock import patch, MagicMock
from backend.services.detector import DetectorService


def test_detector_returns_valid_response_structure(tmp_path):
    """DetectorService.run() should return dict with required keys."""
    fake_result = {
        "image_width": 320,
        "image_height": 240,
        "detections": [
            {"cell_type": "RBC", "confidence": 0.95,
             "box": {"x": 10, "y": 10, "w": 30, "h": 30}}
        ],
        "cell_counts": {"RBC": 1, "WBC": 0, "Platelet": 0},
    }

    with patch("backend.services.detector.predict", return_value=fake_result), \
         patch("backend.services.detector.load_model", return_value=MagicMock()):

        service = DetectorService()
        # Create a dummy image file
        img_path = tmp_path / "dummy.jpg"
        from PIL import Image
        import numpy as np
        Image.fromarray(np.zeros((100, 100, 3), dtype=np.uint8)).save(str(img_path))

        result = service.run(str(img_path))

    assert "image_width"  in result
    assert "image_height" in result
    assert "detections"   in result
    assert "cell_counts"  in result
