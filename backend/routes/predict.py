import os
import uuid
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.schemas.detection import PredictResponse
from backend.services.detector import DetectorService

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/bmp", "image/tiff"}
MAX_FILE_SIZE_MB = 10

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG or PNG.",
        )

    contents = await file.read()

    # Validate file size
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB.",
        )

    # Save to a temp file so TF can read it from disk
    suffix = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        service = DetectorService()
        result = service.run(tmp_path)
    finally:
        os.unlink(tmp_path)   # always clean up temp file

    return result
