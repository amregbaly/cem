import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.core.config import settings
from app.domain.models.audit import LogAuditoria

GENESIS_HASH = "0" * 64


def calculate_audit_hash(
    previous_hash: str,
    timestamp_iso: str,
    user_id: Optional[int],
    username: str,
    ip_address: str,
    modulo: str,
    accion: str,
    entidad: str,
    registro_id: str,
    payload_str: str,
    secret_key: Optional[str] = None
) -> str:
    """
    Computes an HMAC SHA-256 cryptographic digest binding this mutation to the preceding record.
    Any tampering with timestamp, user, action, entity, ID, payload, or sequence breaks the chain.
    """
    key = (secret_key or settings.AUDIT_HMAC_SECRET).encode("utf-8")
    canonical_message = (
        f"{previous_hash}|{timestamp_iso}|{user_id or 'NULL'}|{username}|"
        f"{ip_address}|{modulo}|{accion}|{entidad}|{registro_id}|{payload_str}"
    )
    return hmac.new(key, canonical_message.encode("utf-8"), hashlib.sha256).hexdigest()


class AuditService:
    """
    Cryptographic Chained Audit Logging Service.
    Appends tamper-evident audit records to audit.tb_log_auditoria.
    """

    @staticmethod
    def get_latest_hash(session: Session) -> str:
        """Fetch the hash of the latest audit log entry, or GENESIS_HASH if empty."""
        stmt = select(LogAuditoria.hash_registro).order_by(desc(LogAuditoria.id)).limit(1)
        result = session.execute(stmt).scalar_one_or_none()
        return result or GENESIS_HASH

    @classmethod
    def log_mutation(
        cls,
        session: Session,
        modulo: str,
        accion: str,
        entidad: str,
        registro_id: str,
        payload_anterior: Optional[Dict[str, Any]] = None,
        payload_posterior: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        username: str = "SISTEMA",
        user_rut: Optional[str] = None,
        user_role: Optional[str] = None,
        ip_address: str = "127.0.0.1",
        commit: bool = False
    ) -> LogAuditoria:
        """
        Record a mutation with cryptographic chaining.
        """
        now = datetime.now(timezone.utc)
        prev_hash = cls.get_latest_hash(session)
        
        # Serialize payload for deterministic hash calculation
        payload_combined = {
            "anterior": payload_anterior,
            "posterior": payload_posterior
        }
        payload_canonical_str = json.dumps(payload_combined, sort_keys=True, default=str)
        
        current_hash = calculate_audit_hash(
            previous_hash=prev_hash,
            timestamp_iso=now.isoformat(),
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            modulo=modulo,
            accion=accion,
            entidad=entidad,
            registro_id=str(registro_id),
            payload_str=payload_canonical_str,
            secret_key=settings.AUDIT_HMAC_SECRET
        )

        entry = LogAuditoria(
            timestamp=now,
            user_id=user_id,
            username=username,
            user_rut=user_rut,
            user_role=user_role,
            ip_address=ip_address,
            modulo=modulo,
            accion=accion,
            entidad=entidad,
            registro_id=str(registro_id),
            payload_anterior=payload_anterior,
            payload_posterior=payload_posterior,
            hash_anterior=prev_hash,
            hash_registro=current_hash
        )

        session.add(entry)
        if commit:
            session.commit()
            session.refresh(entry)
        return entry

    @classmethod
    def verify_chain_integrity(cls, session: Session) -> Tuple[bool, int, Optional[str]]:
        """
        Verifies the cryptographic integrity of the entire audit chain.
        Returns:
            (is_valid: bool, records_checked: int, failure_reason: Optional[str])
        """
        stmt = select(LogAuditoria).order_by(LogAuditoria.id.asc())
        logs = session.execute(stmt).scalars().all()

        if not logs:
            return True, 0, None

        expected_prev_hash = GENESIS_HASH
        for i, entry in enumerate(logs):
            # Check previous hash pointer
            if entry.hash_anterior != expected_prev_hash:
                return (
                    False,
                    i,
                    f"Broken link at Log ID {entry.id}: previous_hash '{entry.hash_anterior}' != expected '{expected_prev_hash}'"
                )

            # Recompute current hash
            payload_combined = {
                "anterior": entry.payload_anterior,
                "posterior": entry.payload_posterior
            }
            payload_str = json.dumps(payload_combined, sort_keys=True, default=str)
            
            recomputed = calculate_audit_hash(
                previous_hash=entry.hash_anterior,
                timestamp_iso=entry.timestamp.isoformat() if entry.timestamp.tzinfo else entry.timestamp.replace(tzinfo=timezone.utc).isoformat(),
                user_id=entry.user_id,
                username=entry.username,
                ip_address=entry.ip_address,
                modulo=entry.modulo,
                accion=entry.accion,
                entidad=entry.entidad,
                registro_id=str(entry.registro_id),
                payload_str=payload_str,
                secret_key=settings.AUDIT_HMAC_SECRET
            )

            if entry.hash_registro != recomputed:
                return (
                    False,
                    i,
                    f"Signature mismatch at Log ID {entry.id}: stored '{entry.hash_registro}' != recomputed '{recomputed}'"
                )

            expected_prev_hash = entry.hash_registro

        return True, len(logs), None
