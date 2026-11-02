from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.derecho import Derecho
    from app.domain.models.persona import Persona
    from app.domain.models.usuario import Usuario


class TransferenciaDerecho(Base, TimestampMixin):
    """
    Property Ownership Transfer History Entity.
    Table: core.tb_transferencia_derecho
    Complies with EETT Section 3.8 and Annex 2 Row 16 (A2-16).
    Preserves complete chain of multiple ownership transfers over time.
    """
    __tablename__ = "tb_transferencia_derecho"
    __table_args__ = (
        Index("idx_transferencia_derecho", "derecho_id"),
        Index("idx_transferencia_anterior", "titular_anterior_id"),
        Index("idx_transferencia_nuevo", "titular_nuevo_id"),
        Index("idx_transferencia_fecha", "fecha_transferencia"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    derecho_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_derecho.id"), nullable=False, index=True)
    titular_anterior_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_persona.id"), nullable=False, index=True)
    titular_nuevo_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_persona.id"), nullable=False, index=True)
    
    fecha_transferencia: Mapped[date] = mapped_column(Date, nullable=False)
    numero_resolucion: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    orden_ingreso: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    documento_respaldo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    motivo: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    usuario_registro_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_usuario.id"), nullable=True)

    # Relationships
    derecho: Mapped["Derecho"] = relationship("Derecho", back_populates="transferencias")
    titular_anterior: Mapped["Persona"] = relationship("Persona", foreign_keys=[titular_anterior_id])
    titular_nuevo: Mapped["Persona"] = relationship("Persona", foreign_keys=[titular_nuevo_id])
    usuario_registro: Mapped[Optional["Usuario"]] = relationship("Usuario")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "derecho_id": self.derecho_id,
            "titular_anterior_id": self.titular_anterior_id,
            "titular_anterior_nombre": self.titular_anterior.nombre_completo if self.titular_anterior else None,
            "titular_anterior_rut": self.titular_anterior.rut if self.titular_anterior else None,
            "titular_nuevo_id": self.titular_nuevo_id,
            "titular_nuevo_nombre": self.titular_nuevo.nombre_completo if self.titular_nuevo else None,
            "titular_nuevo_rut": self.titular_nuevo.rut if self.titular_nuevo else None,
            "fecha_transferencia": self.fecha_transferencia.isoformat() if self.fecha_transferencia else None,
            "numero_resolucion": self.numero_resolucion,
            "orden_ingreso": self.orden_ingreso,
            "documento_respaldo_url": self.documento_respaldo_url,
            "motivo": self.motivo,
            "observaciones": self.observaciones
        }

    def __repr__(self) -> str:
        return f"<TransferenciaDerecho(id={self.id}, derecho_id={self.derecho_id}, fecha='{self.fecha_transferencia}')>"
