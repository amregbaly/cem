import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def admin_token():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "AdminCem2026!"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ==============================================================================
# SEC-01: Auditoria Exfiltration & Cryptographic Verification Hardening
# ==============================================================================
def test_sec01_auditoria_endpoints_require_admin():
    # Unauthenticated attempts must return 401
    assert client.get("/api/v1/auditoria").status_code == 401
    assert client.get("/api/v1/auditoria/verificar").status_code == 401
    assert client.post("/api/v1/auditoria/verificar").status_code == 401
    assert client.get("/api/v1/auditoria/export-csv").status_code == 401
    assert client.get("/api/v1/auditoria/exit-package").status_code == 401


def test_sec01_auditoria_admin_access_granted(admin_headers):
    # Admin access must succeed
    res = client.get("/api/v1/auditoria", headers=admin_headers)
    assert res.status_code == 200

    verif = client.get("/api/v1/auditoria/verificar", headers=admin_headers)
    assert verif.status_code == 200
    assert "is_valid" in verif.json()


# ==============================================================================
# SEC-02: Certificate Forgery & Unauthorized Issuance Protection
# ==============================================================================
def test_sec02_certificate_issuance_requires_auth():
    # Emitir requires authenticated user with WRITE permissions
    res = client.post("/api/v1/certificados/emitir", json={
        "tipo": "INHUMACION",
        "inhumacion_id": 1
    })
    assert res.status_code == 401

    # Exportar requires READ permissions
    res_exp = client.get("/api/v1/certificados/exportar")
    assert res_exp.status_code == 401


def test_sec02_certificate_download_rejects_forgery():
    # Attempting to download a non-existent certificate without DB record must return 404, NOT forge from query params
    res = client.get("/api/v1/certificados/descargar/FOLIO-FAKE-99999?nombre=Atacante&rut=1-9&tipo=SEPULTACION")
    assert res.status_code == 404
    assert "no encontrado" in res.json()["detail"].lower() or "no existe" in res.json()["detail"].lower()


# ==============================================================================
# SEC-03: Mass Scraping of Burial Ledger Prevention
# ==============================================================================
def test_sec03_inhumaciones_exportar_requires_auth():
    # Exporting the burial ledger requires authenticated user with INHUMACIONES READ permission
    res = client.get("/api/v1/inhumaciones/exportar")
    assert res.status_code == 401


def test_sec03_inhumaciones_create_requires_auth():
    # Creating an inhumation requires authentication
    res = client.post("/api/v1/inhumaciones", json={
        "numero_ingreso": "SEC-TEST-001",
        "ubicacion_id": 1,
        "fallecido_rut": "11111111-1",
        "fallecido_nombre": "Test",
        "fallecido_apellido_paterno": "Test",
        "fecha_defuncion": "2026-01-01",
        "fecha_sepultacion": "2026-01-02"
    })
    assert res.status_code == 401


# ==============================================================================
# SEC-04: Domain Granular RBAC Enactment
# ==============================================================================
def test_sec04_ubicaciones_mutations_require_auth():
    # POST ubicaciones
    assert client.post("/api/v1/ubicaciones", json={
        "cementerio_id": 1,
        "tipo_ubicacion": "NICHO",
        "sector_codigo": "SEC-T",
        "fila": "1",
        "numero": "1",
        "capacidad_total": 1
    }).status_code == 401

    # PATCH deshabilitar
    assert client.patch("/api/v1/ubicaciones/1/deshabilitar", json={"motivo": "Test"}).status_code == 401

    # PATCH habilitar
    assert client.patch("/api/v1/ubicaciones/1/habilitar").status_code == 401


def test_sec04_reservas_mutations_require_auth():
    assert client.get("/api/v1/reservas").status_code == 401
    assert client.post("/api/v1/reservas", json={
        "ubicacion_id": 1,
        "solicitante_nombre": "Juan Perez",
        "solicitante_rut": "11111111-1",
        "fecha_reserva": "2026-01-01",
        "fecha_vencimiento": "2026-02-01"
    }).status_code == 401
    assert client.post("/api/v1/reservas/1/liberar", json={
        "resolucion_liberacion": "RES-01",
        "motivo_liberacion": "Vencida"
    }).status_code == 401


def test_sec04_exhumaciones_and_maestros_mutations_require_auth():
    # Exhumaciones
    assert client.post("/api/v1/exhumaciones", json={
        "inhumacion_id": 1,
        "fecha_exhumacion": "2026-01-01",
        "motivo": "Traslado",
        "resolucion_numero": "RES-99"
    }).status_code == 401

    # Maestros
    assert client.post("/api/v1/maestros", json={
        "rut": "11111111-1",
        "nombres": "Pedro",
        "apellido_paterno": "Perez"
    }).status_code == 401

    # Maestros ordenes
    assert client.post("/api/v1/maestros/ordenes", json={
        "orden_ingreso": "ORD-01",
        "maestro_id": 1,
        "ubicacion_id": 1
    }).status_code == 401


# ==============================================================================
# SEC-05: Path Traversal & Migration Reconciliation Hardening
# ==============================================================================
def test_sec05_reconciliacion_and_migration_require_auth():
    assert client.get("/api/v1/migracion/reconciliacion").status_code == 401
    assert client.post("/api/v1/migracion/ejecutar", json={"excel_path": "test.xlsx"}).status_code == 401


def test_sec05_migration_rejects_path_traversal(admin_headers):
    # Invalid extension rejected with 400 Bad Request
    res_ext = client.post("/api/v1/migracion/ejecutar", json={"excel_path": "../../etc/passwd"}, headers=admin_headers)
    assert res_ext.status_code == 400
    assert "inválido" in res_ext.json()["detail"].lower() or "formato" in res_ext.json()["detail"].lower()

    # Traversal to unauthorized path rejected with 403 Forbidden
    res_trav = client.post("/api/v1/migracion/ejecutar", json={"excel_path": "/var/log/test.xlsx"}, headers=admin_headers)
    assert res_trav.status_code == 403
    assert "no autorizada" in res_trav.json()["detail"].lower()


# ==============================================================================
# SEC-06: Privacy Masking (Ley 21.719 & Ley 20.584)
# ==============================================================================
def test_sec06_autocomplete_titular_masked_for_public():
    # Non-staff query for locations: if a titular exists, it must be masked
    res = client.get("/api/v1/busqueda/autocomplete?q=PAB")
    assert res.status_code == 200
    data = res.json()
    for item in data.get("results", []):
        if item.get("tipo") == "UBICACION" and "Titular: " in item.get("subtitulo", ""):
            assert "[CONFIDENCIAL LEY 21.719]" in item["subtitulo"]


# ==============================================================================
# SEC-07: CORS Tightening
# ==============================================================================
def test_sec07_cors_rejects_untrusted_origins():
    # Untrusted origin must not be reflected in Access-Control-Allow-Origin
    res = client.options("/api/v1/busqueda/autocomplete", headers={
        "Origin": "http://evil-attacker.com",
        "Access-Control-Request-Method": "GET"
    })
    allow_origin = res.headers.get("access-control-allow-origin")
    assert allow_origin != "http://evil-attacker.com"
    assert allow_origin != "*"


def test_sec07_cors_permits_trusted_origins():
    # Trusted origins (like localhost:5011) must be allowed with credentials
    res = client.options("/api/v1/busqueda/autocomplete", headers={
        "Origin": "http://localhost:5011",
        "Access-Control-Request-Method": "GET"
    })
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5011"
    assert res.headers.get("access-control-allow-credentials") == "true"


# ==============================================================================
# SEC-08: Lease Rights & Notification Spam Protection
# ==============================================================================
def test_sec08_arriendos_mutations_and_notifications_require_auth():
    assert client.post("/api/v1/arriendos/notificar", json={"derecho_id": 1, "canal": "SMS"}).status_code == 401
    assert client.post("/api/v1/arriendos/1/transferir", json={
        "nuevo_titular_rut": "11111111-1",
        "nuevo_titular_nombre": "Carlos",
        "nuevo_titular_apellido": "Gomez"
    }).status_code == 401
    assert client.post("/api/v1/arriendos/1/renovar", json={"anos": 5}).status_code == 401
    assert client.post("/api/v1/arriendos/compra-perpetua", json={"derecho_id": 1}).status_code == 401
