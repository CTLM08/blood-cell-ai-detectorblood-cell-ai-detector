"""
Downloads the BCCD dataset from Roboflow in TFRecord format.
Run this script once: python -m model.dataset YOUR_ROBOFLOW_API_KEY
"""
import os
import sys
from roboflow import Roboflow
from model.config import DATA_DIR


def download_bccd(api_key: str) -> str:
    """Download BCCD dataset and return path to the downloaded folder."""
    os.makedirs(DATA_DIR, exist_ok=True)
    rf = Roboflow(api_key=api_key)
    project = rf.workspace("joseph-nelson").project("bccd")
    dataset = project.version(4).download("tfrecord", location=DATA_DIR)
    print(f"Dataset downloaded to: {dataset.location}")
    return dataset.location


def verify_dataset(dataset_path: str) -> bool:
    """Check that train, valid, test TFRecord files exist."""
    required = [
        os.path.join(dataset_path, "train", "BCCD.tfrecord"),
        os.path.join(dataset_path, "valid", "BCCD.tfrecord"),
        os.path.join(dataset_path, "test",  "BCCD.tfrecord"),
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
