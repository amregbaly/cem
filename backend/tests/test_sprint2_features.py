import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.db.session import SessionLocal
from app.domain.models import Usuario, RolUsuario, Ubicacion, Cementerio, Persona, Inhumacion, Derecho
from app.core.security import get_password_hash, validate_password_policy, create_access_token


@pytest.fixture
def client():
    return TestClient(app)


def test_password_policy():
    # Less than 12 chars
    valid, msg = validate_password_policy("Short1!")
    assert not valid
    assert "mínimo de 12" in msg

    # Breached password
    valid, msg = validate_password_policy("password123456")
    assert not valid
    assert "vulneradas" in msg

    # Valid strong password
    valid, msg = validate_password_policy("ClaveSegura2026!#")
    assert valid
    assert msg == "OK"


def test_exit_package_endpoint(client):
    res = client.get("/api/v1/auditoria/exit-package")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    assert "paquete_salida_cementerio" in res.headers["content-disposition"]

    # Read and inspect zip contents
    zip_bytes = io.BytesIO(res.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "csv/tb_cementerio.csv" in namelist
        assert "csv/tb_ubicacion.csv" in namelist
        assert "csv/tb_inhumacion.csv" in namelist
        assert "csv/tb_audit_log.csv" in namelist
        assert "sql/dump_cementerio_completo.sql" in namelist
        assert "certificates/certificates_verification_table.csv" in namelist
        assert "attachments/attachments_index.csv" in namelist
        assert "audit/chain_verification_report.json" in namelist
        assert "metadata/data_dictionary.json" in namelist
        assert "MANIFEST.sha256" in namelist

        # Verify SQL dump has content
        sql_content = zf.read("sql/dump_cementerio_completo.sql").decode("utf-8")
        assert "DUMP COMPLETO BASE DE DATOS MUNICIPAL" in sql_content

        # Verify MANIFEST.sha256
        manifest = zf.read("MANIFEST.sha256").decode("utf-8")
        assert "csv/tb_cementerio.csv" in manifest


def test_account_lockout(client):
    db = SessionLocal()
    try:
        # Create a test user
        test_user = db.query(Usuario).filter(Usuario.username == "test_lockout_user").first()
        if not test_user:
            test_user = Usuario(
                username="test_lockout_user",
                email="lockout@test.cl",
                nombre_completo="Usuario Prueba Bloqueo",
                hashed_password=get_password_hash("PasswordValida2026!"),
                rol=RolUsuario.ADMINISTRATIVO.value,
                activo=True
            )
            db.add(test_user)
        else:
            test_user.intentos_fallidos = 0
            test_user.bloqueado_hasta = None
        db.commit()

        # 4 failed attempts
        for i in range(4):
            res = client.post("/api/v1/auth/login", json={
                "username": "test_lockout_user",
                "password": "WrongPassword!"
            })
            assert res.status_code == 401

        # 5th failed attempt -> locks account
        res5 = client.post("/api/v1/auth/login", json={
            "username": "test_lockout_user",
            "password": "WrongPassword!"
        })
        assert res5.status_code == 401

        # 6th attempt should return HTTP 423 Locked
        res6 = client.post("/api/v1/auth/login", json={
            "username": "test_lockout_user",
            "password": "PasswordValida2026!"
        })
        assert res6.status_code == 423
        assert "bloqueada" in res6.json()["detail"]
    finally:
        db.close()


def test_maestros_endpoints(client):
    # 1. Register a new mason
    res = client.post("/api/v1/maestros", json={
        "rut": "12345678-5",
        "nombres": "JUAN CARLOS",
        "apellido_paterno": "ROBLES",
        "apellido_materno": "PEREZ",
        "direccion": "Calle Maipú 450, San Carlos",
        "telefono": "+56987654321"
    })
    # Either 201 or 400 if already exists
    assert res.status_code in [201, 400]

    # 2. List masons
    res_list = client.get("/api/v1/maestros")
    assert res_list.status_code == 200
    maestros = res_list.json()
    assert len(maestros) > 0


def test_visita_privacy_redactions(client):
    # Public / Visitor search does not expose cause of death or titular RUT
    res = client.get("/api/v1/busqueda/autocomplete?q=Manuel")
    assert res.status_code == 200
    data = res.json()
    for item in data.get("results", []):
        if item.get("tipo") == "INHUMADO":
            # Unauthenticated / Visita MUST NOT view cause of death
            assert "[CONFIDENCIAL" in item.get("causa_fallecimiento", "")


def test_create_user_admin_endpoint(client):
    # 1. Login as admin to get bearer token
    login_res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "AdminCem2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Try creating user with weak password -> rejected
    bad_res = client.post("/api/v1/auth/usuarios", headers=headers, json={
        "username": "nuevo_funcionario",
        "nombre_completo": "Funcionario Prueba",
        "password": "short",
        "rol": "ADMINISTRATIVO"
    })
    assert bad_res.status_code == 400

    # 3. Create user with compliant password and valid RUT
    import time
    unique_user = f"operador_test_{int(time.time())}"
    ok_res = client.post("/api/v1/auth/usuarios", headers=headers, json={
        "username": unique_user,
        "email": f"{unique_user}@munisancarlos.cl",
        "rut": "12345678-5",
        "nombre_completo": "Funcionario Municipal Prueba",
        "password": "FuncionarioCem2026!",
        "rol": "ADMINISTRATIVO"
    })
    assert ok_res.status_code == 201
    created = ok_res.json()
    assert created["username"] == unique_user
    assert created["rol"] == "ADMINISTRATIVO"
    assert created["activo"] is True

    # 4. Verify listed in /api/v1/auth/usuarios
    list_res = client.get("/api/v1/auth/usuarios", headers=headers)
    assert list_res.status_code == 200
    usernames = [u["username"] for u in list_res.json()]
    assert unique_user in usernames

