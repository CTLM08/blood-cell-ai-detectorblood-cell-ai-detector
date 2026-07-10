from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_cells_returns_three_types():
    response = client.get("/cells")
    assert response.status_code == 200
    data = response.json()
    names = [c["name"] for c in data["cell_types"]]
    assert "RBC"      in names
    assert "WBC"      in names
    assert "Platelet" in names

def test_cells_have_colour_field():
    response = client.get("/cells")
    for cell in response.json()["cell_types"]:
        assert "colour" in cell
        assert cell["colour"].startswith("#")
