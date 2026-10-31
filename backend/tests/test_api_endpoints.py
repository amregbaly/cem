import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "San Carlos" in data["service"]

def test_themes_api():
    # GET default themes
    res = client.get("/api/v1/temas")
    assert res.status_code == 200
    themes = res.json()
    assert len(themes) >= 4
    slugs = [t["slug"] for t in themes]
    assert "sancarlos-classic" in slugs
    assert "sancarlos-night" in slugs

    import uuid
    random_slug = f"test-cordillera-{uuid.uuid4().hex[:6]}"
    new_theme = {
        "nombre": "Test Cordillera",
        "slug": random_slug,
        "es_modo_oscuro": False,
        "color_primario": "#112233",
        "color_secundario": "#223344",
        "color_acento": "#334455",
        "color_fondo": "#F0F0F0",
        "color_superficie": "#FFFFFF",
        "color_texto": "#000000",
        "color_borde": "#CCCCCC"
    }
    create_res = client.post("/api/v1/temas", json=new_theme)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["slug"] == random_slug

def test_autocomplete_search():
    res = client.get("/api/v1/busqueda/autocomplete?q=munoz")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert isinstance(data["results"], list)

def test_auditoria_verificar():
    # Test GET verification endpoint
    res = client.get("/api/v1/auditoria/verificar")
    assert res.status_code == 200
    data = res.json()
    assert "is_valid" in data
    assert "records_checked" in data

    # Test POST verification endpoint
    res_post = client.post("/api/v1/auditoria/verificar")
    assert res_post.status_code == 200
    assert res_post.json()["is_valid"] is True

def test_migracion_reconciliacion():
    res = client.get("/api/v1/migracion/reconciliacion")
    assert res.status_code == 200
    data = res.json()
    assert "resumen" in data
    assert data["resumen"]["balance_total_ok"] is True
    assert "por_hoja" in data
    assert len(data["por_hoja"]) > 0
