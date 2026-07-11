import io
import numpy as np
from PIL import Image
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def make_jpeg_bytes() -> bytes:
    img = Image.fromarray(np.zeros((64, 64, 3), dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_ws_track_streams_results():
    """The WebSocket should send 'ready', then a 'result' per frame."""
    fake = MagicMock()
    fake.track_frame.return_value = {
        "tracks": [{"id": 1, "cell_type": "RBC", "confidence": 0.9,
                    "box": {"x": 1, "y": 1, "w": 5, "h": 5}}],
        "unique_counts": {"RBC": 1, "WBC": 0, "Platelet": 0},
    }

    # Patch the tracker so the test needs no trained weights.
    with patch("backend.routes.track.CellTracker", return_value=fake):
        with client.websocket_connect("/ws/track") as ws:
            assert ws.receive_json() == {"type": "ready"}

            ws.send_bytes(make_jpeg_bytes())
            msg = ws.receive_json()

    assert msg["type"] == "result"
    assert msg["unique_counts"] == {"RBC": 1, "WBC": 0, "Platelet": 0}
    assert msg["tracks"][0]["id"] == 1


def test_ws_track_reports_bad_frame():
    """Undecodable bytes should produce an 'error' message, not a crash."""
    fake = MagicMock()
    with patch("backend.routes.track.CellTracker", return_value=fake):
        with client.websocket_connect("/ws/track") as ws:
            assert ws.receive_json() == {"type": "ready"}
            ws.send_bytes(b"not an image")
            msg = ws.receive_json()

    assert msg["type"] == "error"
    fake.track_frame.assert_not_called()
