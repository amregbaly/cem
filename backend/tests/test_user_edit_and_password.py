import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_user_edit_and_password_flow(client: TestClient):
    # 1. Login as admin
    login_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "AdminCem2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a test user
    import time
    uname = f"test_edit_{int(time.time())}"
    create_res = client.post("/api/v1/auth/usuarios", headers=headers, json={
        "username": uname,
        "email": f"{uname}@munisancarlos.cl",
        "rut": "12345678-5",
        "nombre_completo": "Usuario Para Editar",
        "password": "PasswordInitial2026!",
        "rol": "ADMINISTRATIVO"
    })
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    # 3. Edit user (change name, email, rol, activo)
    edit_res = client.put(f"/api/v1/auth/usuarios/{user_id}", headers=headers, json={
        "nombre_completo": "Usuario Editado Exitosamente",
        "email": f"{uname}_mod@munisancarlos.cl",
        "rol": "ADMINISTRADOR",
        "activo": True
    })
    assert edit_res.status_code == 200
    updated = edit_res.json()
    assert updated["nombre_completo"] == "Usuario Editado Exitosamente"
    assert updated["email"] == f"{uname}_mod@munisancarlos.cl"
    assert updated["rol"] == "ADMINISTRADOR"

    # 4. Change password as admin with weak password -> rejected
    weak_pw_res = client.post(f"/api/v1/auth/usuarios/{user_id}/password", headers=headers, json={
        "new_password": "weak"
    })
    assert weak_pw_res.status_code == 400

    # 5. Change password as admin with valid >=12 char password
    new_pw = "NewSecureAdminPassword2026!"
    pw_res = client.post(f"/api/v1/auth/usuarios/{user_id}/password", headers=headers, json={
        "new_password": new_pw
    })
    assert pw_res.status_code == 200
    assert "actualizada exitosamente" in pw_res.json()["message"]

    # 6. Verify login with the new password works
    new_login_res = client.post("/api/v1/auth/login", json={
        "username": uname,
        "password": new_pw
    })
    assert new_login_res.status_code == 200
    assert new_login_res.json()["username"] == uname
