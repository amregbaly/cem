from typing import Optional, Any, Dict
from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, DateTime, Index, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base


class LogAuditoria(Base):
    """
    Append-Only Cryptographic Audit Log with HMAC SHA-256 Hash Chain.
    Table: audit.tb_log_auditoria
    Compliant with OWASP ASVS Level 2 and EETT P54-P57.
    """
    __tablename__ = "tb_log_auditoria"
    __table_args__ = (
        Index("idx_audit_timestamp", "timestamp"),
        Index("idx_audit_user", "username"),
        Index("idx_audit_modulo", "modulo"),
        Index("idx_audit_entidad_reg", "entidad", "registro_id"),
        {"schema": "audit"}
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # User / Actor metadata
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, default="SISTEMA")
    user_rut: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    user_role: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True, default="127.0.0.1")
    
    # Mutation metadata
    modulo: Mapped[str] = mapped_column(String(50), nullable=False)
    accion: Mapped[str] = mapped_column(String(50), nullable=False)  # INSERT, UPDATE, DELETE, LOGIN, EXPORT
    entidad: Mapped[str] = mapped_column(String(60), nullable=False)  # Table name
    registro_id: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # State changes
    payload_anterior: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    payload_posterior: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    # Cryptographic HMAC SHA-256 Chain
    hash_anterior: Mapped[str] = mapped_column(String(64), nullable=False)
    hash_registro: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<LogAuditoria(id={self.id}, modulo='{self.modulo}', accion='{self.accion}', user='{self.username}')>"
