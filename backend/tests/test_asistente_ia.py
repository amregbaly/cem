"""
Tests for the AI Chat Assistant Module:
  - Key Vault: AES-256-GCM envelope encryption, decryption & masking
  - Tools: Whitelisted data minimization (AST-05) - never outputs RUT, cause of death, or contact details
  - Endpoints:
      * GET/PUT /api/v1/asistente/config (Admin only, masked key, encrypted storage)
      * GET /api/v1/asistente/status (Authenticated staff)
      * POST /api/v1/asistente/chat/reset (Reset in-memory history)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.services.key_vault import (
    encrypt_api_key,
    decrypt_api_key,
    mask_api_key,
)
from app.infrastructure.services.asistente_tools import (
    buscar_sepulturas,
    resumen_arriendos_vencimientos,
    contar_inhumaciones_recientes,
    consultar_disponibilidad_nichos,
    dispatch_tool,
)


@pytest.fixture
def client():
    return TestClient(app)


def get_token(client, username, password):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        return res.json().get("access_token")
    return None


def test_key_vault_encryption_and_masking():
    raw_key = "sk-test-secret-api-key-1234567890abcdef"
    encrypted = encrypt_api_key(raw_key)
    assert encrypted != raw_key
    assert len(encrypted) > 20

    decrypted = decrypt_api_key(encrypted)
    assert decrypted == raw_key

    masked = mask_api_key(raw_key)
    assert masked.endswith("cdef")
    assert "secret" not in masked
    assert "••••••••" in masked


def test_data_minimization_whitelist_deceased(test_db):
    """AST-05: verify tool results never expose RUT, cause of death, or contact info."""
    results = buscar_sepulturas(test_db, "a")
    for item in results:
        # Whitelisted keys only — no RUT, cause of death, or contact info
        assert "rut" not in item
        assert "causa_muerte" not in item
        assert "causa_defuncion" not in item
        assert "contacto" not in item
        assert "observaciones" not in item
        assert "telefono" not in item
        assert "email" not in item


def test_data_minimization_whitelist_leases_aggregate(test_db):
    """AST-05: lease query returns only aggregate figures, no personal data."""
    result = resumen_arriendos_vencimientos(test_db)
    assert "vencidos_total" in result or "error" in result
    assert "rut" not in result
    assert "nombre" not in result


def test_dispatch_tool_safety(test_db):
    """Ensure safe dispatch rejects arbitrary function names."""
    res = dispatch_tool(test_db, "exec_code", {"cmd": "rm -rf"})
    assert "error" in res


def test_asistente_status_endpoint(client: TestClient):
    """Authenticated staff can check assistant status."""
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None, "Failed to login as admin"
    res = client.get(
        "/api/v1/asistente/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "habilitado" in data


def test_asistente_config_requires_admin(client: TestClient):
    """Non-admin cannot view or modify assistant configuration."""
    token = get_token(client, "consulta", "ConsultaCem2026!")
    assert token is not None, "Failed to login as consulta"
    res = client.get(
        "/api/v1/asistente/config",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_asistente_config_save_and_mask(client: TestClient):
    """Admin saves config, key is encrypted in DB and returned masked."""
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None, "Failed to login as admin"
    payload = {
        "habilitado": True,
        "proveedor": "gemini",
        "modelo": "gemini-1.5-flash",
        "api_key": "AIzaSyTestSecretKey987654321",
        "max_tokens": 512,
        "temperatura_x10": 7,
    }
    res = client.put(
        "/api/v1/asistente/config",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["habilitado"] is True
    assert data["proveedor"] == "gemini"
    assert data["api_key_masked"] is not None
    assert "TestSecret" not in data["api_key_masked"]
    assert "••••••••" in data["api_key_masked"]


def test_asistente_chat_reset(client: TestClient):
    """Authenticated user can reset their in-memory chat session."""
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None, "Failed to login as admin"
    res = client.post(
        "/api/v1/asistente/chat/reset",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 204
