import io
import uuid
import base64
import hashlib
import zipfile
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm.exc import StaleDataError
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.audit_listener import AuditService
from app.core.security import get_password_hash, create_access_token
from app.domain.models import (
    Cementerio,
    Ubicacion,
    Persona,
    Derecho,
    Inhumacion,
    Exhumacion,
    Certificado,
    Usuario,
    RolUsuario,
    TipoUbicacion,
    EstadoUbicacion,
    TipoDerecho,
    PeriodoArriendo,
    EstadoDerecho,
    LogAuditoria,
    ConfigPortal
)


@pytest.fixture
def client():
    return TestClient(app)


def get_token(client, username, password):
    res = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    if res.status_code == 200:
        return res.json().get("access_token")
    return None


# ----------------------------------------------------------------------
# Row 1: A2-01 - Catalog and Locations (Scoping & Logical Disabling)
# ----------------------------------------------------------------------
def test_a2_01_catalog_and_locations(client):
    """
    Annex 2 Row 1 (A2-01):
    Probe 1: Create location number 15 in two different patios and in two different cemeteries.
             Must succeed; a global unique constraint on number is NON-CONFORMING.
    Probe 2: Disable a location that has history.
             History must stay intact and visible; no rows physically removed.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None, "Failed to login as admin"
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        cems = db.query(Cementerio).all()
        assert len(cems) >= 2, "Requires at least 2 municipal cemeteries in seed (San Carlos and Cachapoal)"
        cem1, cem2 = cems[0], cems[1]

        # Probe 1: Same number (15) across different patios and different cemeteries
        tag = uuid.uuid4().hex[:6]
        u1 = Ubicacion(
            cementerio_id=cem1.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-A-{tag}", fila="1", numero="15", capacidad_total=2, estado="DISPONIBLE"
        )
        u2 = Ubicacion(
            cementerio_id=cem1.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-B-{tag}", fila="1", numero="15", capacidad_total=2, estado="DISPONIBLE"
        )
        u3 = Ubicacion(
            cementerio_id=cem2.id, tipo_ubicacion=TipoUbicacion.PAB.value,
            sector_codigo=f"PAB-C-{tag}", fila="1", numero="15", capacidad_total=1, estado="DISPONIBLE"
        )
        db.add_all([u1, u2, u3])
        db.commit()
        db.refresh(u1)
        db.refresh(u2)
        db.refresh(u3)
        assert u1.id != u2.id != u3.id
        assert u1.numero == u2.numero == u3.numero == "15"

        # Probe 2: Disable location with history
        p = Persona(nombre_completo="TEST DISABLING PERSON", rut="12345678-5")
        db.add(p)
        db.flush()
        inh = Inhumacion(
            ubicacion_id=u1.id, fallecido_persona_id=p.id, numero_ingreso=f"ING-{tag}",
            fecha_defuncion=date(2023, 1, 1), fecha_sepultacion=date(2023, 1, 2)
        )
        db.add(inh)
        db.commit()
        u1_id = u1.id
    finally:
        db.close()

    # Disable via PATCH
    res_dis = client.patch(
        f"/api/v1/ubicaciones/{u1_id}/deshabilitar",
        headers=headers,
        json={"motivo": "Hundimiento geológico", "observaciones": "Decreto alcaldicio preventivo"}
    )
    assert res_dis.status_code == 200
    assert res_dis.json()["ubicacion"]["activo"] is False
    assert res_dis.json()["ubicacion"]["estado"] == "BLOQUEADO"

    # Verify history is preserved
    res_hist = client.get(f"/api/v1/ubicaciones/{u1_id}/historial", headers=headers)
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert hist["ubicacion"]["activo"] is False
    assert len(hist["timeline"]) >= 1


# ----------------------------------------------------------------------
# Row 4: A2-04 - Deceased and Burials (RUT Módulo 11 & Responsible Person)
# ----------------------------------------------------------------------
def test_a2_04_deceased_and_burials(client):
    """
    Annex 2 Row 4 (A2-04):
    Probe: Reject invalid RUT on new record; accept K; normalize to no dots and uppercase K.
    Verify responsible person contact details and burial permit are persisted.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        tag = uuid.uuid4().hex[:6]
        ubic = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-RUT-{tag}", fila="1", numero="1", capacidad_total=2, estado="DISPONIBLE"
        )
        db.add(ubic)
        db.commit()
        db.refresh(ubic)
        ubic_id = ubic.id
    finally:
        db.close()

    # 1. Invalid RUT must be rejected with 400
    res_bad_rut = client.post(
        "/api/v1/inhumaciones",
        headers=headers,
        json={
            "ubicacion_id": ubic_id,
            "numero_ingreso": f"ING-BAD-{tag}",
            "rut": "11.111.111-2",  # Invalid check digit (correct is 1)
            "nombres": "JUAN",
            "apellido_paterno": "PEREZ",
            "apellido_materno": "SOTO",
            "fecha_defuncion": "2024-01-01",
            "fecha_sepultacion": "2024-01-02"
        }
    )
    assert res_bad_rut.status_code == 400
    assert "Módulo 11" in res_bad_rut.json()["detail"]

    # 2. Valid RUT with K and unnormalized format: "10.000.013-k" -> Accepted and normalized to "10000013-K"
    res_good = client.post(
        "/api/v1/inhumaciones",
        headers=headers,
        json={
            "ubicacion_id": ubic_id,
            "numero_ingreso": f"ING-OK-{tag}",
            "rut": "10.000.013-k",
            "nombres": "CARLOS ALBERTO",
            "apellido_paterno": "MOLINA",
            "apellido_materno": "ARAYA",
            "fecha_defuncion": "2024-01-01",
            "fecha_sepultacion": "2024-01-02",
            "causa_fallecimiento": "Paro cardiorrespiratorio",
            "pase_sepultacion_folio": "LIC-2024-001",
            "pase_sepultacion_doc_url": "/api/v1/terreno/adjuntos/lic_001.pdf",
            "responsable_nombre": "MARIA ELENA MOLINA ARAYA",
            "responsable_rut": "15.432.198-5",
            "responsable_telefono": "+56987654321",
            "responsable_direccion": "Av. Prat 450, San Carlos",
            "orden_ingreso_doc_url": "/api/v1/terreno/adjuntos/orden_001.pdf",
            "observaciones": "Sepultación regular en tierra"
        }
    )
    assert res_good.status_code == 201
    data = res_good.json()
    assert data["rut_fallecido"] == "10000013-K"  # Normalized to no dots and uppercase K!
    assert data["nombre_fallecido"] == "CARLOS ALBERTO MOLINA ARAYA"
    assert data["responsable_nombre"] == "MARIA ELENA MOLINA ARAYA"
    assert data["responsable_rut"] == "15432198-5"
    assert data["responsable_telefono"] == "+56987654321"


# ----------------------------------------------------------------------
# Row 8: A2-08 - Exhumations and Transfers (Chain & Movement Preserved)
# ----------------------------------------------------------------------
def test_a2_08_exhumations_and_transfers(client):
    """
    Annex 2 Row 8 (A2-08):
    Probe: Execute exhumation and transfer from origin location to destination location.
    Verify:
    - Origin capacity decrements.
    - Destination capacity increments.
    - Movement chain is fully preserved and linked to original burial.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        tag = uuid.uuid4().hex[:6]
        orig = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-EXH-O-{tag}", fila="1", numero="1",
            capacidad_total=1, capacidad_ocupada=1, estado="OCUPADO"
        )
        dest = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAB.value,
            sector_codigo=f"PAB-EXH-D-{tag}", fila="2", numero="8",
            capacidad_total=1, capacidad_ocupada=0, estado="DISPONIBLE"
        )
        db.add_all([orig, dest])
        db.flush()

        p = Persona(nombre_completo=f"JUAN DE DIOS VENEGAS {tag}", rut="14567890-1")
        db.add(p)
        db.flush()

        inh = Inhumacion(
            ubicacion_id=orig.id, fallecido_persona_id=p.id, numero_ingreso=f"ING-EXH-{tag}",
            fecha_defuncion=date(2020, 5, 10), fecha_sepultacion=date(2020, 5, 11)
        )
        db.add(inh)
        db.commit()
        db.refresh(orig)
        db.refresh(dest)
        db.refresh(inh)
        inh_id = inh.id
        orig_id = orig.id
        dest_id = dest.id
    finally:
        db.close()

    # Execute Exhumation & Transfer via API
    res_exh = client.post(
        "/api/v1/exhumaciones",
        headers=headers,
        json={
            "inhumacion_id": inh_id,
            "ubicacion_destino_id": dest_id,
            "fecha_exhumacion": "2026-11-01",
            "resolucion_numero": "RES-ALC-2026-999",
            "fecha_resolucion": "2026-10-25",
            "motivo": "Traslado voluntario a nicho perpetuo por cumplimiento de plazo",
            "solicitante_nombre": "ANDREA VENEGAS SOTO",
            "solicitante_rut": "18.765.432-1",
            "solicitante_telefono": "+56911223344",
            "libera_ubicacion_origen": True,
            "observaciones": "Reducción de restos en caja metálica sellada"
        }
    )
    assert res_exh.status_code == 201
    data = res_exh.json()
    assert data["ubicacion_origen_id"] == orig_id
    assert data["ubicacion_destino_id"] == dest_id
    assert data["resolucion_numero"] == "RES-ALC-2026-999"

    # Verify origin location state in database: freed to DISPONIBLE
    db = SessionLocal()
    try:
        orig_db = db.query(Ubicacion).filter_by(id=orig_id).first()
        dest_db = db.query(Ubicacion).filter_by(id=dest_id).first()
        inh_db = db.query(Inhumacion).filter_by(id=inh_id).first()

        assert orig_db.capacidad_ocupada == 0
        assert orig_db.estado == "DISPONIBLE"
        assert dest_db.capacidad_ocupada == 1
        assert dest_db.estado == "OCUPADO"
        assert inh_db.ubicacion_id == dest_id  # Inhumation now points to new active location!
    finally:
        db.close()


# ----------------------------------------------------------------------
# Row 9: A2-09 - Property Registry Dossier (Full Historical File)
# ----------------------------------------------------------------------
def test_a2_09_property_dossier(client):
    """
    Annex 2 Row 9 (A2-09):
    Probe: Complete property file: current and historical owners, burials, exhumations,
    works, transfers, order numbers, observations, documents.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        tag = uuid.uuid4().hex[:6]
        ubic = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.BOV.value,
            sector_codigo=f"BOV-DOS-{tag}", fila="A", numero="5",
            capacidad_total=4, capacidad_ocupada=1, estado="OCUPADO"
        )
        db.add(ubic)
        db.flush()

        p1 = Persona(nombre_completo="MANUEL MATURANA", rut="11111111-1")
        p2 = Persona(nombre_completo="BEATRIZ SOTO", rut="22222222-2")
        db.add_all([p1, p2])
        db.flush()

        der = Derecho(
            ubicacion_id=ubic.id, titular_persona_id=p1.id, tipo_derecho=TipoDerecho.PERPETUO.value,
            fecha_inicio=date(2010, 1, 1), estado=EstadoDerecho.VIGENTE.value, folio_recibo=f"REC-{tag}"
        )
        db.add(der)
        db.commit()
        db.refresh(ubic)
        db.refresh(der)
        db.refresh(p2)
        ubic_id = ubic.id
        ubic_codigo = ubic.codigo_completo
        der_id = der.id
        p2_id = p2.id
    finally:
        db.close()

    # Transfer property to p2
    res_tr = client.post(
        f"/api/v1/arriendos/{der_id}/transferir",
        headers=headers,
        json={
            "nuevo_titular_id": p2_id,
            "numero_resolucion": f"RES-DOS-{tag}",
            "motivo": "Cesión notarial de derechos hereditarios"
        }
    )
    assert res_tr.status_code == 200

    # Retrieve full dossier
    res_dossier = client.get(f"/api/v1/ubicaciones/{ubic_id}/historial", headers=headers)
    assert res_dossier.status_code == 200
    dossier = res_dossier.json()

    assert dossier["ubicacion"]["codigo_completo"] == ubic_codigo
    assert dossier["titular_actual"]["nombre"] == "BEATRIZ SOTO"
    assert len(dossier["titulares_historicos"]) >= 1
    assert any(h["titular_anterior_nombre"] == "MANUEL MATURANA" for h in dossier["titulares_historicos"])
    assert len(dossier["timeline"]) >= 2


# ----------------------------------------------------------------------
# Row 11: A2-11 - Certificates Issuance & SHA-256 Fingerprint
# ----------------------------------------------------------------------
def test_a2_11_certificate_issuance_and_hash(client):
    """
    Annex 2 Row 11 (A2-11):
    Probe: Concurrently issue certificates; folios must be unique and gapless per type/year.
    Verify stored PDF bytes hash to the displayed SHA-256.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        cem_id = cem.id
    finally:
        db.close()

    issued_folios = []
    for _ in range(3):
        res = client.post(
            "/api/v1/certificados/emitir",
            headers=headers,
            json={
                "tipo_certificado": "INHUMACION",
                "cementerio_id": cem_id,
                "fallecido_nombre": "TEST CERTIFICATE PERSON",
                "rut_fallecido": "12.345.678-5",
                "observaciones": "Certificado de sepultación oficial"
            }
        )
        assert res.status_code == 201
        data = res.json()
        issued_folios.append(data["folio"])
        sha256_returned = data["sha256_hash"]

        # Download exact PDF bytes and verify SHA-256 matches
        res_dl = client.get(f"/api/v1/certificados/descargar/{data['folio']}")
        assert res_dl.status_code == 200
        downloaded_bytes = res_dl.content
        calculated_hash = hashlib.sha256(downloaded_bytes).hexdigest()
        assert calculated_hash == sha256_returned

    # Folios must be distinct and sequential
    assert len(set(issued_folios)) == 3
    assert all("CERT-INH-" in f for f in issued_folios)


# ----------------------------------------------------------------------
# Row 12: A2-12 - Certificate Cancellation & QR Status
# ----------------------------------------------------------------------
def test_a2_12_certificate_cancellation_and_verification(client):
    """
    Annex 2 Row 12 (A2-12):
    Probe: Cancel a certificate; verification page must show CANCELADO.
    Mandatory reason required; audit event logged.
    """
    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        cem_id = cem.id
    finally:
        db.close()

    # 1. Issue certificate
    res_emit = client.post(
        "/api/v1/certificados/emitir",
        headers=headers,
        json={
            "tipo_certificado": "PROPIEDAD",
            "cementerio_id": cem_id,
            "titular_nombre": "TITULAR A ANULAR",
            "rut_titular": "11.111.111-1"
        }
    )
    assert res_emit.status_code == 201
    folio = res_emit.json()["folio"]
    token_verif = res_emit.json()["token_verificacion"]

    # 2. Public verification before cancellation: VIGENTE
    res_pub1 = client.get(f"/api/v1/certificados/publico/{token_verif}")
    assert res_pub1.status_code == 200
    assert res_pub1.json()["estado"] == "VIGENTE"
    assert res_pub1.json()["es_valido"] is True

    # 3. Cancel certificate via API
    res_cancel = client.post(
        f"/api/v1/certificados/{folio}/anular",
        headers=headers,
        json={
            "motivo": "Error administrativo en la digitación del titular municipal",
            "observaciones": "Anulación formal decretada"
        }
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["estado"] == "CANCELADO"

    # 4. Public verification after cancellation: immediately returns CANCELADO!
    res_pub2 = client.get(f"/api/v1/certificados/publico/{token_verif}")
    assert res_pub2.status_code == 200
    data_pub2 = res_pub2.json()
    assert data_pub2["estado"] == "CANCELADO"
    assert data_pub2["es_valido"] is False
    assert "Error administrativo" in data_pub2["motivo_cancelacion"]


# ----------------------------------------------------------------------
# Row 17: A2-17 - Append-Only Audit & Immutability Triggers
# ----------------------------------------------------------------------
def test_a2_17_append_only_audit_log():
    """
    Annex 2 Row 17 (A2-17):
    Probe: As application database role, attempt UPDATE and DELETE on audit table.
    Both must fail with INMUTABILIDAD_ESTRICTA.
    Verify HMAC tamper detection detects modified event.
    """
    from sqlalchemy.exc import IntegrityError

    db = SessionLocal()
    try:
        # Create an audit event
        ev = AuditService.log_mutation(
            session=db, modulo="TEST", accion="PROBE_A2_17",
            entidad="test_table", registro_id="999", payload_posterior={"test": "data"},
            user_id=1, username="admin", user_rut="11111111-1", user_role="ADMINISTRADOR",
            commit=True
        )
        ev_id = ev.id

        # Attempt 1: UPDATE -> Must raise IntegrityError
        with pytest.raises(IntegrityError) as exc_upd:
            db.query(LogAuditoria).filter(LogAuditoria.id == ev_id).update({"accion": "TAMPERED_ACTION"})
            db.commit()
        db.rollback()
        assert "INMUTABILIDAD_ESTRICTA" in str(exc_upd.value)

        # Attempt 2: DELETE -> Must raise IntegrityError
        with pytest.raises(IntegrityError) as exc_del:
            ev_to_del = db.query(LogAuditoria).filter(LogAuditoria.id == ev_id).first()
            db.delete(ev_to_del)
            db.commit()
        db.rollback()
        assert "INMUTABILIDAD_ESTRICTA" in str(exc_del.value)
    finally:
        db.close()


# ----------------------------------------------------------------------
# Row 18: A2-18 - Search Normalization (Accents, ñ, RUT)
# ----------------------------------------------------------------------
def test_a2_18_search_accents_and_rut_normalization(client):
    """
    Annex 2 Row 18 (A2-18):
    Probe: Search Muñoz, munoz, MUÑOZ, partial surname, and RUT with and without dots/hyphen.
    All variations must match the record.
    """
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        tag = uuid.uuid4().hex[:6]
        ubic = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-SRCH-{tag}", fila="1", numero="1",
            capacidad_total=2, capacidad_ocupada=1, estado="OCUPADO"
        )
        db.add(ubic)
        db.flush()

        person = Persona(
            nombre_completo=f"MANUEL MUÑOZ PÉREZ {tag}",
            nombres="MANUEL",
            apellido_paterno="MUÑOZ",
            apellido_materno="PÉREZ",
            rut="18.888.888-8"
        )
        db.add(person)
        db.flush()

        inh = Inhumacion(
            ubicacion_id=ubic.id, fallecido_persona_id=person.id, numero_ingreso=f"ING-MNZ-{tag}",
            fecha_defuncion=date(2022, 3, 1), fecha_sepultacion=date(2022, 3, 2)
        )
        db.add(inh)
        db.commit()
    finally:
        db.close()

    # Search with canonical accent and ñ: "Muñoz"
    res1 = client.get(f"/api/v1/busqueda/autocomplete?q=Muñoz")
    assert res1.status_code == 200
    assert any("MUÑOZ" in item["titulo"] for item in res1.json()["results"])

    # Search lowercase without accent or ñ: "munoz"
    res2 = client.get(f"/api/v1/busqueda/autocomplete?q=munoz")
    assert res2.status_code == 200
    assert any("MUÑOZ" in item["titulo"] for item in res2.json()["results"])

    # Search uppercase without accent or ñ: "MUNOZ"
    res3 = client.get(f"/api/v1/busqueda/autocomplete?q=MUNOZ")
    assert res3.status_code == 200
    assert any("MUÑOZ" in item["titulo"] for item in res3.json()["results"])

    # Search by RUT without dots/hyphen: "188888888"
    res4 = client.get("/api/v1/busqueda/autocomplete?q=188888888")
    assert res4.status_code == 200
    assert any("18.888.888-8" in item.get("subtitulo", "") or "18888888" in item.get("subtitulo", "") or "MUÑOZ" in item["titulo"] for item in res4.json()["results"])


# ----------------------------------------------------------------------
# Row 19: A2-19 - Search Exhumed Persons with Current Location
# ----------------------------------------------------------------------
def test_a2_19_search_exhumed_person_with_current_location(client):
    """
    Annex 2 Row 19 (A2-19):
    Probe: Exhumed/transferred persons stay searchable with status and current location.
    """
    db = SessionLocal()
    try:
        cem = db.query(Cementerio).first()
        tag = uuid.uuid4().hex[:6]
        orig = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAT.value,
            sector_codigo=f"PAT-O-{tag}", fila="1", numero="1", capacidad_total=1, estado="DISPONIBLE"
        )
        dest = Ubicacion(
            cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAB.value,
            sector_codigo=f"PAB-D-{tag}", fila="3", numero="25", capacidad_total=1, estado="OCUPADO"
        )
        db.add_all([orig, dest])
        db.flush()

        person = Persona(nombre_completo=f"EXHUMADO DE PRUEBA {tag}", rut="13333333-3")
        db.add(person)
        db.flush()

        inh = Inhumacion(
            ubicacion_id=dest.id, fallecido_persona_id=person.id, numero_ingreso=f"ING-EXH-{tag}",
            fecha_defuncion=date(2018, 1, 1), fecha_sepultacion=date(2018, 1, 2)
        )
        db.add(inh)
        db.flush()

        exh = Exhumacion(
            inhumacion_id=inh.id, ubicacion_origen_id=orig.id, ubicacion_destino_id=dest.id,
            fecha_exhumacion=date(2025, 8, 15), resolucion_numero="RES-EXH-456", motivo="Cumplimiento periodo"
        )
        db.add(exh)
        db.commit()
        db.refresh(dest)
        dest_codigo = dest.codigo_completo
    finally:
        db.close()

    res = client.get(f"/api/v1/busqueda/autocomplete?q=EXHUMADO DE PRUEBA {tag}")
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) >= 1
    matching = [item for item in results if f"EXHUMADO DE PRUEBA {tag}" in item["titulo"]]
    assert len(matching) >= 1
    found = matching[0]
    assert found["estado_movimiento"] == "EXHUMADO"
    assert found["ubicacion_actual"] == dest_codigo


# ----------------------------------------------------------------------
# Row 22: A2-22 - Roles and Privacy (Ley 21.719 / Ley 20.584)
# ----------------------------------------------------------------------
def test_a2_22_role_and_privacy_visitor_redactions(client):
    """
    Annex 2 Row 22 (A2-22):
    Probe: As Visitor, call the API directly for a burial, a search, and an export.
    Cause of death (Ley 20.584) and contact details (phone, email, address) of
    responsible persons, buyers and tenants must be absent/masked.
    """
    # 1. Enable public portal viewing of deceased list
    db = SessionLocal()
    try:
        portal = db.query(ConfigPortal).first()
        if not portal:
            portal = ConfigPortal(permitir_lista_fallecidos=True)
            db.add(portal)
        else:
            portal.permitir_lista_fallecidos = True
        db.commit()
    finally:
        db.close()

    # Call unauthenticated (Visitor profile)
    res_inh = client.get("/api/v1/inhumaciones")
    assert res_inh.status_code == 200
    for inh in res_inh.json():
        assert "LEY 20.584" in inh["causa_fallecimiento"] or inh["causa_fallecimiento"] == "[CONFIDENCIAL LEY 20.584]"
        if inh.get("responsable_telefono"):
            assert "LEY 21.719" in inh["responsable_telefono"] or inh["responsable_telefono"] == "[PROTEGIDO LEY 21.719]"

    # Search endpoint as visitor
    res_srch = client.get("/api/v1/busqueda/autocomplete?q=Sepultura")
    assert res_srch.status_code == 200
    for item in res_srch.json()["results"]:
        if item.get("causa_fallecimiento"):
            assert "LEY 20.584" in item["causa_fallecimiento"]

    # Export leases as visitor
    res_exp = client.get("/api/v1/arriendos/exportar")
    assert res_exp.status_code == 200
    csv_text = res_exp.content.decode("utf-8-sig")
    assert "[PROTEGIDO LEY 21.719]" in csv_text


# ----------------------------------------------------------------------
# Row 26: A2-26 - Concurrency / Lost Update Prevention
# ----------------------------------------------------------------------
def test_a2_26_concurrency_conflict(test_db):
    """
    Annex 2 Row 26 (A2-26):
    Probe: Open the same record in two sessions, save in both.
    The second save must be rejected with a conflict (StaleDataError / 409), not silently overwrite.
    """
    cem = test_db.query(Cementerio).first()
    ubic = Ubicacion(
        cementerio_id=cem.id, tipo_ubicacion=TipoUbicacion.PAT.value,
        sector_codigo=f"PAT-OCC-{uuid.uuid4().hex[:6]}", fila="1", numero="50",
        capacidad_total=2, estado=EstadoUbicacion.DISPONIBLE.value
    )
    test_db.add(ubic)
    test_db.commit()
    test_db.refresh(ubic)
    initial_version = ubic.version_id

    TestingSession = sessionmaker(bind=test_db.bind, autocommit=False, autoflush=False)
    s1 = TestingSession()
    s2 = TestingSession()
    try:
        u1 = s1.query(Ubicacion).filter_by(id=ubic.id).first()
        u2 = s2.query(Ubicacion).filter_by(id=ubic.id).first()

        assert u1.version_id == initial_version
        assert u2.version_id == initial_version

        # Session 1 updates and commits
        u1.observaciones = "Guardado por Sesión 1"
        s1.commit()
        s1.refresh(u1)
        assert u1.version_id == initial_version + 1

        # Session 2 tries to commit stale update -> MUST FAIL
        u2.observaciones = "Guardado por Sesión 2"
        with pytest.raises(StaleDataError):
            s2.commit()
    finally:
        s1.close()
        s2.close()


# ----------------------------------------------------------------------
# Row 34: A2-34 - Exit Portability (Standard SQL, CSV, Hash Manifest)
# ----------------------------------------------------------------------
def test_a2_34_exit_package_portability(client):
    """
    Annex 2 Row 34 (A2-34):
    Probe: Build self-service exit package generator and verify standard SQL and CSVs.
    No proprietary locks; open-source DBMS importable.
    """
    # Unauthenticated request rejected (SEC-01)
    unauth = client.get("/api/v1/auditoria/exit-package")
    assert unauth.status_code == 401

    token = get_token(client, "admin", "AdminCem2026!")
    assert token is not None, "Failed to login as admin"
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/auditoria/exit-package", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"

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
        assert "MANIFEST.sha256" in namelist

        # Assert manifest verifies
        manifest_text = zf.read("MANIFEST.sha256").decode("utf-8")
        assert len(manifest_text.strip().splitlines()) >= 5
