"""
Copy the newest trained YOLO checkpoint to model/weights/best.pt,
which is the path the FastAPI backend loads for inference.
Run after training: python -m model.export
"""
import glob
import os
import shutil
from model.config import RUNS_DIR, WEIGHTS_DIR, WEIGHTS_PATH


def find_latest_best() -> str:
    """Return the most recently modified best.pt under the runs directory."""
    matches = glob.glob(os.path.join(RUNS_DIR, "**", "best.pt"), recursive=True)
    if not matches:
        raise FileNotFoundError(
            f"No best.pt found under {RUNS_DIR}. Run `python -m model.train` first."
        )
    return max(matches, key=os.path.getmtime)


def export():
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    best = find_latest_best()
    shutil.copy2(best, WEIGHTS_PATH)
    print(f"Exported {best}\n      -> {WEIGHTS_PATH}")


if __name__ == "__main__":
    export()
