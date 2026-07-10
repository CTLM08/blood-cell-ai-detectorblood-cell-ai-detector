"""
Fine-tune a YOLOv8 detector on the BCCD dataset.
Run: python -m model.train [epochs]
Training outputs go to model/runs/. After training, run:
    python -m model.export
to copy the best weights to model/weights/best.pt (loaded by the backend).

Training is fast on a GPU (a few minutes) and works on CPU too (slower).
"""
import glob
import os
import sys
import yaml
from ultralytics import YOLO
from model.config import DATA_DIR, RUNS_DIR

DEFAULT_EPOCHS = 50
IMG_SIZE = 640
BASE_MODEL = "yolov8n.pt"   # nano — auto-downloads (~6 MB) on first run


def find_data_yaml() -> str:
    """Locate the Roboflow data.yaml anywhere under the data directory."""
    matches = glob.glob(os.path.join(DATA_DIR, "**", "data.yaml"), recursive=True)
    if not matches:
        raise FileNotFoundError(
            f"No data.yaml found under {DATA_DIR}. "
            f"Run `python -m model.dataset YOUR_ROBOFLOW_API_KEY` first."
        )
    return matches[0]


def normalize_paths(data_yaml: str) -> str:
    """
    Rewrite train/val/test in data.yaml to absolute paths.

    Roboflow's exported YAML uses relative paths that Ultralytics often cannot
    resolve; pinning them to absolute paths avoids the classic "no images found"
    error. Returns the (possibly rewritten) yaml path.
    """
    root = os.path.dirname(os.path.abspath(data_yaml))
    with open(data_yaml, "r") as f:
        cfg = yaml.safe_load(f)

    for split in ("train", "val", "test"):
        if split in cfg and cfg[split]:
            # Roboflow values look like "../train/images" or "train/images"
            leaf = str(cfg[split]).replace("\\", "/").split("/")
            # keep only the trailing "<split>/images" portion
            if "images" in leaf:
                idx = leaf.index("images")
                rel = os.path.join(leaf[idx - 1], leaf[idx])
            else:
                rel = os.path.join(split, "images")
            cfg[split] = os.path.join(root, rel)

    with open(data_yaml, "w") as f:
        yaml.safe_dump(cfg, f, sort_keys=False)
    return data_yaml


def train(epochs: int = DEFAULT_EPOCHS):
    os.makedirs(RUNS_DIR, exist_ok=True)
    data_yaml = normalize_paths(find_data_yaml())
    print(f"Using dataset config: {data_yaml}")

    model = YOLO(BASE_MODEL)
    model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=IMG_SIZE,
        project=RUNS_DIR,
        name="bccd",
        exist_ok=True,
    )
    print(f"Training complete. Runs saved under: {RUNS_DIR}")


if __name__ == "__main__":
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EPOCHS
    train(epochs)
