"""
Singleton service that loads the YOLO model once and reuses it across requests.
Using a singleton avoids reloading the model on every API call.
"""
from model.predict import load_model, predict


class DetectorService:
    _model = None  # class-level singleton — loaded once on first request

    def __init__(self):
        if DetectorService._model is None:
            print("Loading YOLO model for the first time...")
            DetectorService._model = load_model()
            print("Model loaded ✓")

    def run(self, image_path: str) -> dict:
        """Run inference on image_path. Returns the full prediction dict."""
        return predict(DetectorService._model, image_path)
