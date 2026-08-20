# ─────────────────────────────────────────────────────────────────────────────
# Blood Cell AI Detector — single-container build for Hugging Face Spaces (Docker)
# Stage 1 builds the React frontend; stage 2 runs FastAPI, which serves both the
# API and the built frontend on port 7860 (the port HF Spaces expects).
# ─────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# No .env in the image -> API_BASE = "" -> the app calls the API same-origin.
RUN npm run build

# ---- Stage 2: Python backend + model ----
FROM python:3.11-slim

# OpenCV (pulled in by ultralytics) needs these system libraries.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-only torch first (smaller, no CUDA), then the runtime deps.
# Unpinned from the CPU index so pip resolves a build compatible with ultralytics.
RUN pip install --no-cache-dir torch torchvision \
        --index-url https://download.pytorch.org/whl/cpu
COPY backend/requirements-deploy.txt ./backend/requirements-deploy.txt
RUN pip install --no-cache-dir -r backend/requirements-deploy.txt

# App code, model weights, and the built frontend.
COPY backend/ ./backend/
COPY model/ ./model/
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Writable dirs for Ultralytics/matplotlib (the HF container user isn't root).
ENV PYTHONPATH=/app \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    MPLCONFIGDIR=/tmp/mpl \
    HF_HOME=/tmp/hf \
    PYTHONUNBUFFERED=1

EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
