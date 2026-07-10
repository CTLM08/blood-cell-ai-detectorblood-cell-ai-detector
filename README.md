# 🔬 Blood Cell AI Detector

A high school biology × AI project.
Detects and labels **RBC**, **WBC**, and **Platelets** in blood cell microscope images.

## Stack
- AI Model: Ultralytics YOLOv8 (fine-tuned on BCCD)
- Backend: FastAPI (Python)
- Frontend: React.js (Vite) + HTML5 Canvas

## Project layout
```
model/     inference utility, training pipeline, cell config
backend/   FastAPI app: /health, /cells, /predict
frontend/  React UI: upload, canvas overlay, results table
```

## Run

### Backend
```powershell
cd biology-ai-project
.\venv\Scripts\Activate.ps1
# from the project root so `model` and `backend` import as packages:
uvicorn backend.main:app --reload --port 8000
```
Open http://localhost:8000/docs for the interactive API.
`/health` and `/cells` work immediately. `/predict` needs a trained model
(see "Model status" below) — without it, the first `/predict` call errors
while loading `model/exported_model/`.

### Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

### Tests
```powershell
cd biology-ai-project
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
pytest backend/tests/ model/tests/ -v
```
All backend and model unit tests mock the model, so they pass without
trained weights.

## Training the model

The detector is Ultralytics YOLOv8, which runs on this Python 3.13 venv.
To (re)train from scratch:

1. **Download the BCCD dataset** (needs a free Roboflow API key):
   ```powershell
   python -m model.dataset YOUR_ROBOFLOW_API_KEY
   ```
   Downloads to `model/data/` in YOLOv8 format.

2. **Train** (fine-tunes `yolov8n`; optional epoch count, default 50):
   ```powershell
   python -m model.train 50
   ```
   Outputs go to `model/runs/`. Fast on a GPU; on CPU expect ~2–3 min/epoch.
   BCCD is easy — even a handful of epochs reaches ~0.88 mAP@50.

3. **Export** the best checkpoint to the path the backend loads:
   ```powershell
   python -m model.export        # -> model/weights/best.pt
   ```

Once `model/weights/best.pt` exists, the backend `/predict` endpoint returns
real detections. The model weights, dataset, and training runs are gitignored.

> **Why YOLO instead of TensorFlow?** The original plan used the TensorFlow
> Object Detection API, which only installs on TF 2.10–2.13 / Python ≤3.10.
> This venv has TF 2.21 / Python 3.13, so the model layer was migrated to
> Ultralytics YOLOv8. The API contract and frontend are identical either way.
