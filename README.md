# 🔬 Blood Cell AI Detector

A high school biology × AI project.
Detects and labels **RBC**, **WBC**, and **Platelets** in blood cell microscope images.

## Stack
- AI Model: TensorFlow + SSD MobileNet V2 (TF Object Detection API)
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

## Model status (what's left to make detection live)

The application code, API, and UI are complete and tested. The one remaining
piece is the **trained model weights**, which require steps that need your
own resources:

1. A **Roboflow API key** (free) to download the BCCD dataset:
   `python -m model.dataset YOUR_ROBOFLOW_API_KEY`
2. The **TF Object Detection API** installed, plus the SSD MobileNet V2
   pre-trained checkpoint (see the plan in
   `../docs/superpowers/plans/2026-05-27-blood-cell-detector.md`, Tasks 3 & 6).
3. Training + export: `python -m model.train` then `python -m model.export`,
   which produces `model/exported_model/saved_model/`.

> ⚠️ **Environment note:** this venv currently has **TensorFlow 2.21 on
> Python 3.13**. The TF Object Detection API (the legacy training pipeline
> above) is only known to install cleanly on **TF 2.10–2.13 / Python ≤3.10**.
> To train as designed, create a separate Python 3.10 venv with
> `tensorflow==2.10.0`. The runtime inference code in `model/predict.py`
> works on the installed TF 2.21 — only the training toolchain is version-sensitive.
