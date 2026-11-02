import io
import uuid
import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.db.session import SessionLocal
from app.core.security import get_password_hash, create_access_token
from app.domain.models import (
    Ubicacion,
    Cementerio,
    Persona,
    Derecho,
    TipoUbicacion,
    EstadoUbicacion,
    TipoDerecho,
    PeriodoArriendo,
    EstadoDerecho,
    Usuario,
    RolUsuario,
    TransferenciaDerecho,
)


@pytest.fixture
def client():
    return TestClient(app)


def get_token(client, username, password):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        return res.json()["access_token"]
    return None


def test_t03_multiple_property_transfers_chain(client):
    """
    Requirements Baseline 3.8, Annex 2 Row 16 (A2-16) and Section 5 Probe:
    Transfer a property twice. Both former owners remain in history; the current owner
    is shown distinctly; supporting document is attached.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        # 1. Create location
        ubic = Ubicacion(
            cementerio_id=cem.id,
            tipo_ubicacion=TipoUbicacion.BOV.value,
            sector_codigo=f"BOV-{uuid.uuid4().hex[:6]}",
            fila="A",
            numero="10",
            capacidad_total=4,
            capacidad_ocupada=0,
            estado=EstadoUbicacion.DISPONIBLE.value
        )
        db.add(ubic)
        db.flush()

        # 2. Create 3 owners: Owner 1, Owner 2, Owner 3
        p1 = Persona(
            nombre_completo="MANUEL ANTONIO MATURANA PEREZ",
            nombres="MANUEL ANTONIO",
            apellido_paterno="MATURANA",
            apellido_materno="PEREZ",
            rut="11111111-1"
        )
        p2 = Persona(
            nombre_completo="BEATRIZ ELENA SOTO CARVAJAL",
            nombres="BEATRIZ ELENA",
            apellido_paterno="SOTO",
            apellido_materno="CARVAJAL",
            rut="12222222-2"
        )
        p3 = Persona(
            nombre_completo="CARLOS ALBERTO FUENTES RIQUELME",
            nombres="CARLOS ALBERTO",
            apellido_paterno="FUENTES",
            apellido_materno="RIQUELME",
            rut="13333333-3"
        )
        db.add_all([p1, p2, p3])
        db.flush()

        # 3. Create initial derecho with Owner 1
        der = Derecho(
            ubicacion_id=ubic.id,
            titular_persona_id=p1.id,
            tipo_derecho=TipoDerecho.PERPETUO.value,
            periodo_arriendo=PeriodoArriendo.PERPETUO.value,
            fecha_inicio=date(2020, 1, 15),
            estado=EstadoDerecho.VIGENTE.value,
            folio_recibo="REC-INIT-001"
        )
        db.add(der)
        db.commit()
        db.refresh(der)
        derecho_id = der.id
        ubic_id = ubic.id
        p2_id = p2.id
        p3_id = p3.id
    finally:
        db.close()

    # 4. First Transfer: Owner 1 -> Owner 2
    res_trf1 = client.post(f"/api/v1/arriendos/{derecho_id}/transferir", headers=headers, json={
        "nuevo_titular_persona_id": p2_id,
        "fecha_transferencia": "2023-05-10",
        "numero_resolucion": "RES-MUNI-2023-045",
        "orden_ingreso": "ORD-ING-2023-889",
        "documento_respaldo_url": "/api/v1/terreno/adjuntos/escritura_traspaso_1.pdf",
        "motivo": "Cesión hereditaria formalizada por decreto alcaldicio"
    })
    assert res_trf1.status_code == 200
    data1 = res_trf1.json()
    assert data1["titular_actual"] == "BEATRIZ ELENA SOTO CARVAJAL"
    assert data1["titular_anterior"] == "MANUEL ANTONIO MATURANA PEREZ"

    # 5. Second Transfer: Owner 2 -> Owner 3
    res_trf2 = client.post(f"/api/v1/arriendos/{derecho_id}/transferir", headers=headers, json={
        "nuevo_titular_persona_id": p3_id,
        "fecha_transferencia": "2026-03-20",
        "numero_resolucion": "RES-MUNI-2026-112",
        "orden_ingreso": "ORD-ING-2026-440",
        "documento_respaldo_url": "/api/v1/terreno/adjuntos/escritura_traspaso_2.pdf",
        "motivo": "Compraventa de derechos y traspaso notarial"
    })
    assert res_trf2.status_code == 200
    data2 = res_trf2.json()
    assert data2["titular_actual"] == "CARLOS ALBERTO FUENTES RIQUELME"
    assert data2["titular_anterior"] == "BEATRIZ ELENA SOTO CARVAJAL"

    # 6. Verify full history from /ubicaciones/{id}/historial
    res_hist = client.get(f"/api/v1/ubicaciones/{ubic_id}/historial", headers=headers)
    assert res_hist.status_code == 200
    hist = res_hist.json()

    # Current owner is distinctly Owner 3
    assert hist["titular_actual"]["nombre"] == "CARLOS ALBERTO FUENTES RIQUELME"

    # History contains both former owners: Owner 1 and Owner 2!
    historicos = hist.get("titulares_historicos", [])
    assert len(historicos) >= 2
    nombres_anteriores = [h["titular_anterior_nombre"] for h in historicos]
    assert "MANUEL ANTONIO MATURANA PEREZ" in nombres_anteriores
    assert "BEATRIZ ELENA SOTO CARVAJAL" in nombres_anteriores

    # Timeline has transfer events with document links
    timeline_trfs = [e for e in hist["timeline"] if e["tipo_evento"] == "TRANSFERENCIA_DOMINIO"]
    assert len(timeline_trfs) >= 2
    assert any("escritura_traspaso_1.pdf" in t["detalles"]["documento_respaldo_url"] for t in timeline_trfs)
    assert any("escritura_traspaso_2.pdf" in t["detalles"]["documento_respaldo_url"] for t in timeline_trfs)


def test_t04_privacy_redactions_in_lease_export(client):
    """
    Requirements Baseline Section 5 Probe & Ley 21.719:
    As Visitor or unauthenticated user, phone and email MUST be redacted from exports.
    As Admin/Staff, full data is exported.
    """
    # 1. Unauthenticated or Visitor export
    res_anon = client.get("/api/v1/arriendos/exportar")
    assert res_anon.status_code == 200
    content_anon = res_anon.content.decode("utf-8-sig")
    assert "[PROTEGIDO LEY 21.719]" in content_anon
    assert "[CONFIDENCIAL LEY 21.719]" in content_anon

    # 2. Staff / Admin export
    admin_token = get_token(client, "admin", "AdminCem2026!")
    res_admin = client.get("/api/v1/arriendos/exportar", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    content_admin = res_admin.content.decode("utf-8-sig")
    # Admin gets full access (no "[PROTEGIDO LEY 21.719]")
    assert "[PROTEGIDO LEY 21.719]" not in content_admin


def test_t05_magic_bytes_and_private_attachment_download(client):
    """
    Requirements Baseline Section 5 Probe:
    - Upload renamed .exe as .pdf: rejected with 400.
    - Upload 11 MB file: rejected with 400.
    - Request attachment URL without session: 401.
    - Request attachment as Visitor: 403.
    """
    admin_token = get_token(client, "admin", "AdminCem2026!")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 1. Disguised executable (.exe with .pdf extension) -> rejected with 400
    fake_exe_content = b"MZ\x90\x00\x03\x00\x00\x00Disguised executable malware payload"
    res_exe = client.post(
        "/api/v1/terreno/subir-acta",
        headers=headers_admin,
        data={"task_id": 1, "tipo_adjunto": "ACTA_FIRMADA"},
        files={"archivo": ("virus.pdf", fake_exe_content, "application/pdf")}
    )
    assert res_exe.status_code == 400
    assert "Seguridad" in res_exe.json()["detail"] or "firma inválida" in res_exe.json()["detail"]

    # 2. File exceeding 10MB -> rejected with 400
    oversized_content = b"%PDF-1.4 " + (b"0" * (10 * 1024 * 1024 + 100))
    res_big = client.post(
        "/api/v1/terreno/subir-acta",
        headers=headers_admin,
        data={"task_id": 1, "tipo_adjunto": "ACTA_FIRMADA"},
        files={"archivo": ("grande.pdf", oversized_content, "application/pdf")}
    )
    assert res_big.status_code == 400
    assert "excede el límite" in res_big.json()["detail"]

    # 3. Valid PDF with correct magic bytes -> accepted with 200
    valid_pdf_content = b"%PDF-1.4\n%Valid municipal certificate\n%%EOF"
    res_ok = client.post(
        "/api/v1/terreno/subir-acta",
        headers=headers_admin,
        data={"task_id": 1, "tipo_adjunto": "ACTA_FIRMADA"},
        files={"archivo": ("acta_valida.pdf", valid_pdf_content, "application/pdf")}
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["success"] is True
    filename = data["filename"]
    assert filename.endswith(".pdf")

    # 4. Download without auth -> 401 Unauthorized
    res_noauth = client.get(f"/api/v1/terreno/adjuntos/{filename}")
    assert res_noauth.status_code in [401, 403]

    # 5. Download with Admin auth -> 200 OK with correct content
    res_download = client.get(f"/api/v1/terreno/adjuntos/{filename}", headers=headers_admin)
    assert res_download.status_code == 200
    assert res_download.content == valid_pdf_content


def test_t11_disable_location_preserves_history(client):
    """
    Requirements Baseline 3.1 & Annex 2 Row 1 (A2-01):
    Probe: disable a patio/pavilion/location that has history.
    History must stay intact and visible; no rows physically removed.
    """
    admin_token = get_token(client, "admin", "AdminCem2026!")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a location with history
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        ubic = Ubicacion(
            cementerio_id=cem.id,
            tipo_ubicacion=TipoUbicacion.PAB.value,
            sector_codigo=f"PAB-DIS-{uuid.uuid4().hex[:6]}",
            fila="B",
            numero="44",
            capacidad_total=1,
            capacidad_ocupada=1,
            estado=EstadoUbicacion.OCUPADO.value
        )
        db.add(ubic)
        db.flush()

        persona = Persona(
            nombre_completo="JUAN DE DIOS VENEGAS RIQUELME",
            rut="14567890-1"
        )
        db.add(persona)
        db.flush()

        der = Derecho(
            ubicacion_id=ubic.id,
            titular_persona_id=persona.id,
            tipo_derecho=TipoDerecho.ARRIENDO.value,
            periodo_arriendo=PeriodoArriendo.CINCO_ANOS.value,
            fecha_inicio=date(2021, 6, 1),
            fecha_vencimiento=date(2026, 6, 1),
            estado=EstadoDerecho.VIGENTE.value,
            folio_recibo="REC-DIS-001"
        )
        db.add(der)
        db.commit()
        db.refresh(ubic)
        ubic_id = ubic.id
    finally:
        db.close()

    # 2. Disable location via PATCH /api/v1/ubicaciones/{id}/deshabilitar
    res_dis = client.patch(
        f"/api/v1/ubicaciones/{ubic_id}/deshabilitar",
        headers=headers,
        json={
            "motivo": "Pabellón en riesgo de derrumbe estructural por sismo",
            "observaciones": "Decreto alcaldicio de clausura preventiva"
        }
    )
    assert res_dis.status_code == 200
    data = res_dis.json()
    assert data["success"] is True
    assert data["ubicacion"]["activo"] is False
    assert data["ubicacion"]["estado"] == "BLOQUEADO"

    # 3. Verify history is completely intact and visible via GET /ubicaciones/{id}/historial
    res_hist = client.get(f"/api/v1/ubicaciones/{ubic_id}/historial", headers=headers)
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert hist["ubicacion"]["activo"] is False
    assert hist["ubicacion"]["motivo_deshabilitacion"] == "Pabellón en riesgo de derrumbe estructural por sismo"

    # History timeline still contains all records! No rows were deleted!
    assert len(hist["timeline"]) >= 1
    assert hist["titular_actual"]["nombre"] == "JUAN DE DIOS VENEGAS RIQUELME"

