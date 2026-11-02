import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_mapa_sectores():
    # Fetch sectors for San Carlos (ID 1)
    res = client.get("/api/v1/ubicaciones/mapa/sectores?cementerio_id=1")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    first = data[0]
    assert "sector_codigo" in first
    assert "total_slots" in first
    assert "slots_ocupados" in first
    assert "slots_disponibles" in first

def test_mapa_cuadricula():
    # Fetch grid slots for San Carlos (default sector or specific PAB-A)
    res = client.get("/api/v1/ubicaciones/mapa/cuadricula?cementerio_id=1&sector_codigo=PAB-A")
    assert res.status_code == 200
    data = res.json()
    assert "sector_codigo" in data
    assert "slots" in data
    assert "total_slots" in data
    assert isinstance(data["slots"], list)
    if data["slots"]:
        slot = data["slots"][0]
        assert "codigo_completo" in slot
        assert "grid_x" in slot
        assert "grid_y" in slot
        assert "color_status" in slot

def test_ubicacion_historial():
    # Ubicacion 1 (seeded in init_db)
    res = client.get("/api/v1/ubicaciones/1/historial")
    assert res.status_code == 200
    data = res.json()
    assert "ubicacion" in data
    assert "timeline" in data
    assert "color_status" in data["ubicacion"]

def test_busqueda_autocomplete_enhanced():
    # Check enhanced autocomplete with coordinates
    res = client.get("/api/v1/busqueda/autocomplete?q=gonzalez")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    # Test character repair with query
    res2 = client.get("/api/v1/busqueda/autocomplete?q=MU?OZ")
    assert res2.status_code == 200

def test_certificados_flow():
    # Emit certificate
    payload = {
        "tipo_certificado": "INHUMACION",
        "cementerio_id": 1,
        "fallecido_nombre": "MANUEL JESUS MUÑOZ SEPULVEDA",
        "rut_fallecido": "7.842.119-4",
        "titular_nombre": "CARLOS ALBERTO DE LA FUENTE RIVAS",
        "rut_titular": "15.678.912-3",
        "observaciones": "Trámite de posesión efectiva"
    }
    res = client.post("/api/v1/certificados/emitir", json=payload)
    assert res.status_code == 201
    cert = res.json()
    assert "folio" in cert
    assert "token_verificacion" in cert
    assert "sha256_hash" in cert

    folio = cert["folio"]
    # Download PDF
    res_pdf = client.get(f"/api/v1/certificados/descargar/{folio}")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 500

    # Public verification (Ley 21.719 / EETT Section 6/8 compliant: only type, folio, date, status, hash)
    res_pub = client.get(f"/api/v1/certificados/publico/{folio}")
    assert res_pub.status_code == 200
    pub_data = res_pub.json()
    assert pub_data["folio"] == folio
    assert pub_data["estado"] == "VIGENTE"
    assert "sha256_hash" in pub_data
    assert "fallecido_nombre" not in pub_data
    # Verify no medical diagnosis leaked
    assert "diagnostico" not in pub_data
    assert "causa_muerte" not in pub_data

def test_arriendos_vencimientos_and_export():
    res = client.get("/api/v1/arriendos/vencimientos?cementerio_id=1")
    assert res.status_code == 200
    data = res.json()
    assert "resumen" in data
    assert "detalles" in data

    # Test export CSV
    res_csv = client.get("/api/v1/arriendos/exportar?cementerio_id=1")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert b"Folio" in res_csv.content or b"Titular" in res_csv.content

def test_terreno_agenda_and_tasks():
    from datetime import date
    today_str = date.today().isoformat()
    # Ensure at least one task exists for today
    client.post("/api/v1/terreno/tarea", json={
        "folio_orden": f"ORD-TEST-{today_str}",
        "cementerio_id": 1,
        "tipo_tarea": "INHUMACION",
        "fallecido_nombre": "TEST PERSONA TERRENO",
        "fecha_programada": today_str,
        "hora_programada": "10:00",
        "sepulturero_asignado": "Operador Test"
    })
    # Get daily agenda
    res = client.get(f"/api/v1/terreno/agenda?cementerio_id=1&fecha={today_str}")
    assert res.status_code == 200
    agenda = res.json()
    assert isinstance(agenda, list)
    assert len(agenda) >= 1
    task_id = agenda[0]["id"]

    # Complete task
    res_comp = client.patch(f"/api/v1/terreno/tarea/{task_id}/completar?operario_nombre=Pedro+Operador&observaciones=Completada+en+terreno")
    assert res_comp.status_code == 200
    updated = res_comp.json()
    assert updated["tarea"]["estado"] == "COMPLETADA"

