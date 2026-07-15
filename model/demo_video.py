"""
Build a demo video from BCCD stained-smear test images.

The detector is trained on stained smears, so this produces a video in the
domain it actually works in — useful for demoing the Video tracking tab.
Each test image is upscaled and a viewport pans slowly across it, which
simulates moving a slide under a microscope: cells drift across the frame,
so the tracker assigns persistent IDs and accumulates unique counts.

Run: python -m model.demo_video [num_images] [seconds_per_image]
Output: demo/stained_smear_demo.mp4
"""
import glob
import os
import sys
import cv2
from model.config import DATA_DIR, ROOT_DIR

OUT_DIR = os.path.join(ROOT_DIR, "demo")
OUT_PATH = os.path.join(OUT_DIR, "stained_smear_demo.mp4")
FPS = 30
VIEW_W, VIEW_H = 640, 480     # output frame size (4:3, matches the video stage)
UPSCALE = 2.0                 # enlarge the smear so there is room to pan


def _pan_frames(img, seconds):
    """Yield frames panning a viewport diagonally across an upscaled image."""
    big = cv2.resize(img, None, fx=UPSCALE, fy=UPSCALE, interpolation=cv2.INTER_CUBIC)
    H, W = big.shape[:2]
    max_x = max(W - VIEW_W, 0)
    max_y = max(H - VIEW_H, 0)
    n = int(seconds * FPS)
    for i in range(n):
        t = i / max(n - 1, 1)
        x = int(max_x * t)
        y = int(max_y * t)
        crop = big[y:y + VIEW_H, x:x + VIEW_W]
        if crop.shape[0] != VIEW_H or crop.shape[1] != VIEW_W:
            crop = cv2.resize(crop, (VIEW_W, VIEW_H))
        yield crop


def build(num_images: int = 8, seconds_each: float = 4.0):
    imgs = sorted(glob.glob(os.path.join(DATA_DIR, "**", "test", "images", "*.jpg"),
                            recursive=True))[:num_images]
    if not imgs:
        raise FileNotFoundError(f"No test images found under {DATA_DIR}")

    os.makedirs(OUT_DIR, exist_ok=True)
    writer = cv2.VideoWriter(OUT_PATH, cv2.VideoWriter_fourcc(*"mp4v"),
                             FPS, (VIEW_W, VIEW_H))
    total = 0
    for p in imgs:
        img = cv2.imread(p)
        if img is None:
            continue
        for frame in _pan_frames(img, seconds_each):
            writer.write(frame)
            total += 1
    writer.release()
    print(f"Wrote {total} frames ({total/FPS:.1f}s) from {len(imgs)} smears -> {OUT_PATH}")
    return OUT_PATH


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    s = float(sys.argv[2]) if len(sys.argv) > 2 else 4.0
    build(n, s)
