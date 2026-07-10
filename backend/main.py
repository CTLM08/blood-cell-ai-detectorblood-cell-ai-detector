from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import health, cells, predict

app = FastAPI(
    title="Blood Cell AI Detector",
    description="Detects RBC, WBC and Platelets in microscope images.",
    version="1.0.0",
)

# Allow React dev server (port 5173) and any local origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(cells.router)
app.include_router(predict.router)
