import io
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app

client = TestClient(app)

def make_fake_image_bytes() -> bytes:
    """Create a small valid JPEG image in memory."""
    img = Image.fromarray(np.zeros((100, 100, 3), dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_predict_returns_200_with_valid_image():
    fake_response = {
        "image_width": 100, "image_height": 100,
        "detections": [],
        "cell_counts": {"RBC": 0, "WBC": 0, "Platelet": 0},
    }
    with patch("backend.routes.predict.DetectorService") as MockService:
        instance = MockService.return_value
        instance.run.return_value = fake_response

        response = client.post(
            "/predict",
            files={"file": ("test.jpg", make_fake_image_bytes(), "image/jpeg")},
        )

    assert response.status_code == 200
    body = response.json()
    assert "detections"   in body
    assert "cell_counts"  in body
    assert "image_width"  in body
    assert "image_height" in body


def test_predict_rejects_non_image_file():
    response = client.post(
        "/predict",
        files={"file": ("test.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400


def test_predict_requires_file():
    response = client.post("/predict")
    assert response.status_code == 422   # FastAPI validation error
