from fastapi import APIRouter
from backend.schemas.detection import CellsResponse, CellTypeInfo
from model.config import CELL_TYPES, CELL_COLOURS

router = APIRouter()

@router.get("/cells", response_model=CellsResponse)
def get_cells():
    """Returns the list of supported cell types and their display colours."""
    return {
        "cell_types": [
            CellTypeInfo(name=name, colour=CELL_COLOURS[name]["hex"])
            for name in CELL_TYPES
        ]
    }
