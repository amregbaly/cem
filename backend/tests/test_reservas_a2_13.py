import uuid
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.db.session import SessionLocal
from app.domain.models import Cementerio, Ubicacion, Persona, Inhumacion, Derecho, TipoUbicacion, TipoDerecho, EstadoDerecho
from app.domain.models.reserva import Reserva, EstadoReserva


@pytest.fixture
def client():
    return TestClient(app)


def get_token(client: TestClient, username: str = "admin", password: str = "AdminCem2026!") -> str:
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_a2_13_reservas_and_state_transitions(client):
    """
    Annex 2 Row 13 (A2-13) & EETT 3.11:
    Probe:
    1. Reject reservation on location with active burial or lease.
    2. Successfully create reservation on available location -> location becomes RESERVADO.
    3. On expiry, location stays locked in RESERVADO until Administrator confirms release.
    4. Admin confirms release with decree/resolution -> location returns to DISPONIBLE.
    5. Dossier timeline displays full reservation and release history.
    """
    token_admin = get_token(client, "admin", "AdminCem2026!")
    token_op = get_token(client, "operador", "OperadorCem2026!")
    headers_admin = {"Authorization": f"Bearer {token_admin}"}
    headers_op = {"Authorization": f"Bearer {token_op}"}

    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        tag = uuid.uuid4().hex[:6]

        # Location with active burial
        u_burial = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-OCC-{tag}", fila="1", numero="1",
            capacidad_total=1, capacidad_ocupada=1, estado="OCUPADO"
        )
        # Available location for reservation
        u_avail = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAB.value,
            sector_codigo=f"PAB-RES-{tag}", fila="2", numero="14",
            capacidad_total=1, capacidad_ocupada=0, estado="DISPONIBLE"
        )
        db.add_all([u_burial, u_avail])
        db.flush()

        p = Persona(nombre_completo=f"FALLECIDO ACTIVO {tag}", rut="11111111-1")
        db.add(p)
        db.flush()

        inh = Inhumacion(
            ubicacion_id=u_burial.id, fallecido_persona_id=p.id, numero_ingreso=f"ING-BUR-{tag}",
            fecha_defuncion=date(2023, 1, 1), fecha_sepultacion=date(2023, 1, 2)
        )
        db.add(inh)
        db.commit()

        u_burial_id = u_burial.id
        u_avail_id = u_avail.id
    finally:
        db.close()

    # 1. Probe: Attempt reservation on location with active burial -> Must be rejected (400)
    res_bad = client.post(
        "/api/v1/reservas",
        headers=headers_admin,
        json={
            "ubicacion_id": u_burial_id,
            "solicitante_nombre": "JUAN PEREZ",
            "solicitante_rut": "12.345.678-5",
            "fecha_vencimiento": (date.today() + timedelta(days=30)).isoformat()
        }
    )
    assert res_bad.status_code == 400
    assert "sepultaciones activas" in res_bad.json()["detail"]

    # 2. Probe: Reserve available location
    res_ok = client.post(
        "/api/v1/reservas",
        headers=headers_op,
        json={
            "ubicacion_id": u_avail_id,
            "solicitante_nombre": "CAROLINA BASCUÑAN",
            "solicitante_rut": "16.789.012-3",
            "solicitante_telefono": "+56912345678",
            "solicitante_direccion": "Calle Maipú 120, San Carlos",
            "fecha_vencimiento": (date.today() + timedelta(days=15)).isoformat(),
            "documento_respaldo_url": "/api/v1/terreno/adjuntos/solicitud_reserva.pdf",
            "observaciones": "Reserva para familiar enfermo grave"
        }
    )
    assert res_ok.status_code == 201
    res_data = res_ok.json()
    reserva_id = res_data["id"]
    assert res_data["estado"] == "VIGENTE"
    assert res_data["solicitante_nombre"] == "CAROLINA BASCUÑAN"

    # Verify location state in DB changed to RESERVADO
    db = SessionLocal()
    try:
        u_db = db.query(Ubicacion).filter_by(id=u_avail_id).first()
        assert u_db.estado == "RESERVADO"
    finally:
        db.close()

    # 3. Probe: Location expiry rule (simulate expiry by setting fecha_vencimiento in the past)
    db = SessionLocal()
    try:
        r_db = db.query(Reserva).filter_by(id=reserva_id).first()
        r_db.fecha_vencimiento = date.today() - timedelta(days=2)
        db.commit()
    finally:
        db.close()

    # Verify location is NOT automatically released to DISPONIBLE
    db = SessionLocal()
    try:
        u_db = db.query(Ubicacion).filter_by(id=u_avail_id).first()
        assert u_db.estado == "RESERVADO"
    finally:
        db.close()

    # 4. Probe: Non-admin (operador) cannot confirm liberation -> 403 Forbidden
    res_lib_op = client.post(
        f"/api/v1/reservas/{reserva_id}/liberar",
        headers=headers_op,
        json={
            "resolucion_liberacion": "DEC-ALC-2026-10",
            "motivo_liberacion": "Plazo expirado sin formalización de compra"
        }
    )
    assert res_lib_op.status_code == 403

    # 5. Probe: Administrator confirms liberation with mandatory resolution and motive
    res_lib_admin = client.post(
        f"/api/v1/reservas/{reserva_id}/liberar",
        headers=headers_admin,
        json={
            "resolucion_liberacion": "DEC-ALC-2026-10",
            "motivo_liberacion": "Plazo de reserva expirado sin formalización de compra",
            "observaciones": "Liberación aprobada por Dirección de Cementerios"
        }
    )
    assert res_lib_admin.status_code == 200
    lib_data = res_lib_admin.json()
    assert lib_data["estado"] == "LIBERADA"
    assert lib_data["resolucion_liberacion"] == "DEC-ALC-2026-10"

    # Verify location state returns to DISPONIBLE
    db = SessionLocal()
    try:
        u_db = db.query(Ubicacion).filter_by(id=u_avail_id).first()
        assert u_db.estado == "DISPONIBLE"
    finally:
        db.close()

    # 6. Verify full reservation history appears in location timeline dossier
    res_hist = client.get(f"/api/v1/ubicaciones/{u_avail_id}/historial", headers=headers_admin)
    assert res_hist.status_code == 200
    hist = res_hist.json()
    res_events = [ev for ev in hist["timeline"] if ev["tipo_evento"] == "RESERVA"]
    assert len(res_events) >= 1
    assert res_events[0]["detalles"]["resolucion_liberacion"] == "DEC-ALC-2026-10"
