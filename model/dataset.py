"""
Downloads the BCCD dataset from Roboflow in YOLOv8 format.
Run this script once: python -m model.dataset YOUR_ROBOFLOW_API_KEY
"""
import os
import sys
from roboflow import Roboflow
from model.config import DATA_DIR


def download_bccd(api_key: str) -> str:
    """Download BCCD dataset (YOLOv8 format) and return the download folder."""
    os.makedirs(DATA_DIR, exist_ok=True)
    rf = Roboflow(api_key=api_key)
    project = rf.workspace("joseph-nelson").project("bccd")
    dataset = project.version(4).download("yolov8", location=DATA_DIR)
    print(f"Dataset downloaded to: {dataset.location}")
    return dataset.location


def verify_dataset(dataset_path: str) -> bool:
    """Check that data.yaml and the train/valid image folders exist."""
    required = [
        os.path.join(dataset_path, "data.yaml"),
        os.path.join(dataset_path, "train", "images"),
        os.path.join(dataset_path, "valid", "images"),
    ]
    missing = [p for p in required if not os.path.exists(p)]
    if missing:
        print(f"Missing files: {missing}")
        return False
    print("Dataset verified ✓")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m model.dataset YOUR_ROBOFLOW_API_KEY")
        sys.exit(1)
    path = download_bccd(sys.argv[1])
    verify_dataset(path)
