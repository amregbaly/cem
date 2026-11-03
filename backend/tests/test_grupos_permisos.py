import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def admin_token():
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "AdminCem2026!"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def operator_token():
    res = client.post("/api/v1/auth/login", json={"username": "operador", "password": "OperadorCem2026!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_listar_grupos_admin(admin_token):
    response = client.get("/api/v1/grupos", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    # Verify first group has permissions
    first_group = data[0]
    assert "nombre" in first_group
    assert "permisos" in first_group
    assert len(first_group["permisos"]) == 9
    # Check permissions format
    for p in first_group["permisos"]:
        assert p["acceso"] in ["NONE", "READ", "WRITE"]


def test_listar_grupos_forbidden_for_non_admin(operator_token):
    response = client.get("/api/v1/grupos", headers={"Authorization": f"Bearer {operator_token}"})
    assert response.status_code == 403


def test_crear_y_modificar_grupo_personalizado(admin_token):
    import time
    unique_grp = f"Grupo Obras {int(time.time())}"
    # 1. Create custom group
    payload = {
        "nombre": unique_grp,
        "descripcion": "Acceso de escritura en catastro y lectura en inhumaciones",
        "permisos": [
            {"modulo": "INHUMACIONES", "acceso": "READ"},
            {"modulo": "UBICACIONES", "acceso": "WRITE"},
            {"modulo": "CAMPO", "acceso": "WRITE"},
            {"modulo": "AUDITORIA", "acceso": "READ"},
            {"modulo": "USUARIOS", "acceso": "NONE"},
            {"modulo": "ARRIENDOS", "acceso": "NONE"},
            {"modulo": "CERTIFICADOS", "acceso": "NONE"},
            {"modulo": "CONFIGURACION", "acceso": "NONE"}
        ]
    }
    create_res = client.post("/api/v1/grupos", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_res.status_code == 201
    grp_data = create_res.json()
    grp_id = grp_data["id"]
    assert grp_data["nombre"] == unique_grp
    assert grp_data["es_sistema"] is False

    # Check permission values
    perm_dict = {p["modulo"]: p["acceso"] for p in grp_data["permisos"]}
    assert perm_dict["UBICACIONES"] == "WRITE"
    assert perm_dict["INHUMACIONES"] == "READ"
    assert perm_dict["USUARIOS"] == "NONE"

    # 2. Modify group
    update_res = client.put(
        f"/api/v1/grupos/{grp_id}",
        json={
            "descripcion": "Descripción actualizada con permiso de arriendos",
            "permisos": [
                {"modulo": "ARRIENDOS", "acceso": "READ"}
            ]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["descripcion"] == "Descripción actualizada con permiso de arriendos"
    up_perm_dict = {p["modulo"]: p["acceso"] for p in updated_data["permisos"]}
    assert up_perm_dict["ARRIENDOS"] == "READ"

    # 3. Assign user to group
    assign_res = client.post(
        f"/api/v1/grupos/{grp_id}/usuarios/2",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert assign_res.status_code == 200

    # 4. Attempt to delete a system group (should fail with 400)
    del_sys_res = client.delete("/api/v1/grupos/1", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_sys_res.status_code == 400

    # 5. Delete custom group (should succeed)
    del_custom_res = client.delete(f"/api/v1/grupos/{grp_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_custom_res.status_code == 200
