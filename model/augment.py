"""
Scene augmentation for the BCCD training set.

The base model only ever saw colour, stained smears, so it is weak on
(a) grayscale / black-and-white microscope images and (b) video frames
(blur, lighting changes, compression). This script adds two extra copies of
every training image to teach those scenes:

  * <name>_augray  — grayscale (B/W microscope)
  * <name>_augvid  — video-like: blur + brightness/contrast + JPEG artefacts
                     (half of these are also grayscale, to cover B/W video)

All transforms keep geometry unchanged, so each new image simply reuses the
original YOLO label file. Only the TRAIN split is touched; valid/test stay
clean so evaluation stays honest. Re-running is safe (existing/augmented
files are skipped).

Run: python -m model.augment
"""
import glob
import os
import random
import shutil
import sys
import cv2
from model.config import DATA_DIR

GRAY_SUFFIX = "_augray"
VID_SUFFIX  = "_augvid"
SEED = 0


def _train_dirs(base_dir=None):
    base = base_dir or DATA_DIR
    matches = glob.glob(os.path.join(base, "**", "train", "images"), recursive=True)
    if not matches:
        raise FileNotFoundError(f"No train/images folder found under {base}")
    images_dir = matches[0]
    labels_dir = os.path.join(os.path.dirname(images_dir), "labels")
    return images_dir, labels_dir


def _to_gray3(img):
    """Grayscale but kept as a 3-channel image (model expects 3 channels)."""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)


def _video_like(img):
    """Simulate a video frame: optional grayscale, lighting jitter, blur, compression."""
    if random.random() < 0.5:
        img = _to_gray3(img)
    alpha = random.uniform(0.7, 1.3)     # contrast
    beta  = random.uniform(-30, 30)      # brightness
    img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)
    k = random.choice([3, 5])
    img = cv2.GaussianBlur(img, (k, k), 0)
    quality = random.randint(40, 70)
    ok, enc = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if ok:
        img = cv2.imdecode(enc, cv2.IMREAD_COLOR)
    return img


def _write(variant_img, src_stem, ext, suffix, images_dir, labels_dir):
    new_stem = src_stem + suffix
    img_path = os.path.join(images_dir, new_stem + ext)
    lbl_src  = os.path.join(labels_dir, src_stem + ".txt")
    lbl_dst  = os.path.join(labels_dir, new_stem + ".txt")
    if os.path.exists(img_path):
        return False                       # already generated
    if not os.path.exists(lbl_src):
        return False                       # no label -> skip
    cv2.imwrite(img_path, variant_img)
    shutil.copy2(lbl_src, lbl_dst)
    return True


def augment(base_dir=None):
    random.seed(SEED)
    images_dir, labels_dir = _train_dirs(base_dir)
    originals = [
        p for p in glob.glob(os.path.join(images_dir, "*.jpg"))
        if GRAY_SUFFIX not in p and VID_SUFFIX not in p
    ]
    print(f"Augmenting {len(originals)} training images in {images_dir}")

    made = 0
    for p in originals:
        stem = os.path.splitext(os.path.basename(p))[0]
        ext  = os.path.splitext(p)[1]
        img  = cv2.imread(p)
        if img is None:
            continue
        made += _write(_to_gray3(img),   stem, ext, GRAY_SUFFIX, images_dir, labels_dir)
        made += _write(_video_like(img), stem, ext, VID_SUFFIX,  images_dir, labels_dir)

    total = len(glob.glob(os.path.join(images_dir, "*.jpg")))
    print(f"Created {made} new images. Train set now has {total} images.")


if __name__ == "__main__":
    # optional: python -m model.augment <dataset_dir>
    augment(sys.argv[1] if len(sys.argv) > 1 else None)
