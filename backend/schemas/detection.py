from pydantic import BaseModel, Field
from typing import List, Dict


class BoundingBox(BaseModel):
    x: int = Field(..., description="Left edge in pixels")
    y: int = Field(..., description="Top edge in pixels")
    w: int = Field(..., description="Width in pixels")
    h: int = Field(..., description="Height in pixels")


class Detection(BaseModel):
    cell_type:  str        = Field(..., description="RBC | WBC | Platelet")
    confidence: float      = Field(..., ge=0.0, le=1.0)
    box:        BoundingBox


class PredictResponse(BaseModel):
    image_width:  int
    image_height: int
    detections:   List[Detection]
    cell_counts:  Dict[str, int]


class HealthResponse(BaseModel):
    status: str


class CellTypeInfo(BaseModel):
    name:  str
    colour: str   # hex string


class CellsResponse(BaseModel):
    cell_types: List[CellTypeInfo]
