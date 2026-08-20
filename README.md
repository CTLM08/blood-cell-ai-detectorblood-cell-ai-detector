---
title: Blood Cell AI Detector
emoji: 🔬
colorFrom: red
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 🔬 Blood Cell AI Detector

Detect and count **red blood cells (RBC)**, **white blood cells (WBC)**, and
**platelets** in microscope blood-smear images — and track them across video
frames. A high-school **biology × AI** project.

- **AI model:** Ultralytics YOLOv8 (fine-tuned on stained blood smears, test mAP@0.5 ≈ 0.93)
- **Backend:** FastAPI (Python) — REST API + a WebSocket for live video tracking
- **Frontend:** React (Vite) with an HTML5-Canvas overlay

---

## Features

- 📷 **Image detection** — upload a smear image, get colour-coded bounding boxes and a per-type count.
- 🎥 **Video tracking** — webcam or uploaded video; cells get persistent IDs so you count *unique* cells (not the same cell every frame), with motion trails.
- ⚫ **Grayscale-robust** — works on black-and-white microscope images too.

---

## Quick start

**Prerequisites:** Python 3.10+ and Node.js 18+. The trained model
(`model/weights/best.pt`, ~6 MB) is included, so it works right after cloning.

```bash
git clone <your-repo-url>
cd biology-ai-project
```

### 1. Backend (FastAPI)

```powershell
# create + activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1          # Windows PowerShell
# source venv/bin/activate           # macOS/Linux

pip install -r backend/requirements.txt

# run from the project root so `backend` and `model` import as packages
$env:PYTHONPATH = (Get-Location).Path # PowerShell
# export PYTHONPATH=$(pwd)            # macOS/Linux
uvicorn backend.main:app --port 8000
```

Backend runs at **http://localhost:8000** (interactive API docs at `/docs`).

### 2. Frontend (React)

```bash
cd frontend
cp .env.example .env       # sets VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## How to use the app

Open http://localhost:5173 — there are two tabs:

**Image**
1. Drag a blood-smear image onto the upload panel (or click to browse).
2. The AI draws boxes: **red = RBC, green = WBC, yellow = Platelet**, with a count table.

**Video tracking**
1. Choose **Webcam** or **Upload**, then press **Start**.
2. Cells are tracked with a `#id` label and a motion trail; the panel shows the running **unique** count per type.
3. No sample clip? Generate a stained-smear demo: `python -m model.demo_video 8 4` → upload `demo/stained_smear_demo.mp4`.

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/cells` | GET | Supported cell types + colours |
| `/predict` | POST | Upload an image → detections + counts |
| `/ws/track` | WebSocket | Stream frames → per-frame tracks + unique counts |

---

## Project structure

```
biology-ai-project/
├── model/            # YOLO inference, training, augmentation, cell config
│   ├── predict.py    #   run detection on an image
│   ├── tracker.py    #   ByteTrack tracking for video
│   ├── train.py / augment.py / export.py / demo_video.py
│   └── weights/best.pt   # the trained model (committed)
├── backend/          # FastAPI app
│   ├── main.py
│   ├── routes/       #   /health, /cells, /predict, /ws/track
│   ├── services/     #   detector singleton
│   └── tests/        #   pytest (model is mocked, no weights needed)
└── frontend/         # React + Vite UI
    └── src/components/  UploadPanel, ImageCanvas, VideoTracker, ...
```

Run the tests: `pytest backend/tests/ model/tests/ -v`

---

## Training your own model

The included model is fine-tuned on ~1,100 stained-smear images (with grayscale
+ video-style augmentation). To retrain:

```powershell
# 1. Get a dataset (YOLO format). e.g. download BCCD via Roboflow (free API key):
python -m model.dataset YOUR_ROBOFLOW_API_KEY

# 2. (optional) add grayscale + video-like scene augmentation
python -m model.augment model/data

# 3. fine-tune, then export the best checkpoint to model/weights/best.pt
python -m model.train 40 yolov8n.pt 640 model/data
python -m model.export
```

> **Never commit your Roboflow API key.** Pass it only as a command-line
> argument (as above); it is never written to a file.

---

## Deploy on Hugging Face Spaces

The whole app runs as **one Docker container** (FastAPI serves both the API and
the built React frontend on port 7860). To host it:

1. Create a **Docker Space** at <https://huggingface.co/new-space> (SDK: *Docker*).
2. Push this repository to the Space's git remote:
   ```bash
   git remote add space https://huggingface.co/spaces/<user>/<space-name>
   git push space main
   ```
   (Authenticate with a Hugging Face **access token** as the password — create one
   at <https://huggingface.co/settings/tokens>.)
3. The Space builds the `Dockerfile` and goes live at
   `https://<user>-<space-name>.hf.space`.

The Space config (SDK + port) is read from the YAML header at the top of this file.
Note: on the free CPU tier, detection/tracking work but run slowly (~a few fps).

## Accuracy & limitations

- **Test mAP@0.5 ≈ 0.93.** WBC detection is excellent; platelets (the rarest
  class) are the weakest. `CONFIDENCE_THRESHOLD` in `model/config.py` (0.4)
  trades recall vs. false positives.
- **Domain scope:** the model is trained on **stained smears**. It also handles
  grayscale and clearer video, but **unstained brightfield** microscopy (pale
  "ring" cells) is a different imaging modality it detects poorly — fixing that
  needs labelled brightfield training data. This is documented as future work.

---

## Authors

Biology × AI group project:

- 蔡陈礼詺
- 刘锦廷
- 吴文介
- 荘展睿

## Tech notes / credits

- Model: [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) · tracking via ByteTrack
- Data: BCCD + community blood-cell datasets (stained peripheral smears)
- Built as a biology × AI learning project.
