import pytest
from app.infrastructure.db.audit_listener import AuditService
from app.domain.models.audit import LogAuditoria


def test_audit_log_cryptographic_chain(test_db):
    # Log 3 mutations
    log1 = AuditService.log_mutation(
        session=test_db,
        modulo="INHUMACIONES",
        accion="INSERT",
        entidad="core.tb_inhumacion",
        registro_id="101",
        payload_posterior={"nombre": "Prueba 1"},
        username="operador",
        commit=True
    )

    log2 = AuditService.log_mutation(
        session=test_db,
        modulo="DERECHOS",
        accion="UPDATE",
        entidad="core.tb_derecho",
        registro_id="202",
        payload_anterior={"estado": "DISPONIBLE"},
        payload_posterior={"estado": "ARRIENDO"},
        username="admin",
        commit=True
    )

    log3 = AuditService.log_mutation(
        session=test_db,
        modulo="UBICACIONES",
        accion="INSERT",
        entidad="core.tb_ubicacion",
        registro_id="303",
        payload_posterior={"sector": "PAB-L"},
        username="admin",
        commit=True
    )

    # Verify chaining: log2's previous hash must be log1's hash
    assert log2.hash_anterior == log1.hash_registro
    assert log3.hash_anterior == log2.hash_registro

    # Verify entire chain integrity
    is_valid, count, reason = AuditService.verify_chain_integrity(test_db)
    assert is_valid is True
    assert count >= 3
    assert reason is None


def test_audit_log_tamper_detection(test_db):
    # Add a log
    log = AuditService.log_mutation(
        session=test_db,
        modulo="INHUMACIONES",
        accion="INSERT",
        entidad="core.tb_inhumacion",
        registro_id="999",
        payload_posterior={"valor": "original"},
        username="admin",
        commit=True
    )

    # Tamper with the log payload directly in DB
    log.payload_posterior = {"valor": "alterado_por_atacante"}
    test_db.commit()

    # Integrity verification must detect signature mismatch!
    is_valid, count, reason = AuditService.verify_chain_integrity(test_db)
    assert is_valid is False
    assert "Signature mismatch" in reason
