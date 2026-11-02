import pytest
from sqlalchemy.orm.exc import StaleDataError
from fastapi.testclient import TestClient
from app.main import app
from app.domain.models import Ubicacion, Cementerio, TipoUbicacion, EstadoUbicacion


def test_optimistic_concurrency_control(test_db):
    """
    Requirements Baseline Section 5:
    Probe: open the same record in two sessions, save in both.
    The second save must be rejected with a conflict (StaleDataError / 409), not silently overwrite.
    """
    # 1. Create a test location
    cem = test_db.query(Cementerio).first()
    ubic = Ubicacion(
        cementerio_id=cem.id,
        tipo_ubicacion=TipoUbicacion.PAT.value,
        sector_codigo="PAT-TEST-OCC",
        fila="1",
        numero="99",
        capacidad_total=2,
        capacidad_ocupada=0,
        estado=EstadoUbicacion.DISPONIBLE.value
    )
    test_db.add(ubic)
    test_db.commit()
    test_db.refresh(ubic)
    initial_version = ubic.version_id

    # 2. Simulate Session 1 reading the record using sessions bound to test_db
    from sqlalchemy.orm import sessionmaker
    TestingSession = sessionmaker(bind=test_db.bind, autocommit=False, autoflush=False)
    s1 = TestingSession()
    s2 = TestingSession()
    try:
        u1 = s1.query(Ubicacion).filter_by(id=ubic.id).first()
        u2 = s2.query(Ubicacion).filter_by(id=ubic.id).first()

        assert u1.version_id == initial_version
        assert u2.version_id == initial_version

        # 3. Session 1 modifies and commits
        u1.observaciones = "Modificado por Sesión 1"
        s1.commit()
        s1.refresh(u1)
        assert u1.version_id == initial_version + 1

        # 4. Session 2 tries to modify the stale record and commit -> MUST FAIL with StaleDataError
        u2.observaciones = "Modificado por Sesión 2 en conflicto"
        with pytest.raises(StaleDataError):
            s2.commit()
    finally:
        s1.close()
        s2.close()


def test_security_headers_middleware():
    """
    Requirements Baseline Section 7 & Annex 2 Row 27 (A2-27):
    Assert strict HTTP security headers are injected in all responses.
    """
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers

    assert "Strict-Transport-Security" in headers
    assert "max-age=31536000" in headers["Strict-Transport-Security"]
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") in ["DENY", "SAMEORIGIN"]
    assert "strict-origin-when-cross-origin" in headers.get("Referrer-Policy", "")
