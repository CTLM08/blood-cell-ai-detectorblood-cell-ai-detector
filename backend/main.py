import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routes import health, cells, predict, track

app = FastAPI(
    title="Blood Cell AI Detector",
    description="Detects RBC, WBC and Platelets in microscope images.",
    version="1.0.0",
)

# Allow the React dev server (separate origin during local development).
# In production the frontend is served from this same server, so CORS is moot.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes (registered first so they take precedence over the static mount) ──
app.include_router(health.router)
app.include_router(cells.router)
app.include_router(predict.router)
app.include_router(track.router)

# ── Serve the built React frontend, if present (production / Docker) ──────────
# `npm run build` outputs to frontend/dist; the Dockerfile copies it here.
FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"
)
if os.path.isdir(FRONTEND_DIST):
    # Mounted at "/" LAST, so /health, /cells, /predict, /ws/track still match first.
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
