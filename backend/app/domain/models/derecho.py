import enum
from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, Numeric, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.ubicacion import Ubicacion
    from app.domain.models.persona import Persona


class TipoDerecho(str, enum.Enum):
    PERPETUO = "PERPETUO"
    ARRIENDO = "ARRIENDO"


class PeriodoArriendo(str, enum.Enum):
    DOS_MESES = "2_MESES"
    TRES_ANOS = "3_ANOS"
    CINCO_ANOS = "5_ANOS"
    VEINTE_ANOS = "20_ANOS"
    CINCUENTA_ANOS = "50_ANOS"
    PERPETUO = "PERPETUO"


class EstadoDerecho(str, enum.Enum):
    VIGENTE = "VIGENTE"
    VENCIDO = "VENCIDO"
    TRANSFERIDO = "TRANSFERIDO"
    ANULADO = "ANULADO"


class Derecho(Base, TimestampMixin):
    """
    Cemetery Property Rights & Leases Entity.
    Table: core.tb_derecho
    """
    __tablename__ = "tb_derecho"
    __table_args__ = (
        Index("idx_derecho_ubicacion", "ubicacion_id"),
        Index("idx_derecho_titular", "titular_persona_id"),
        Index("idx_derecho_vencimiento", "fecha_vencimiento"),
        Index("idx_derecho_estado", "estado"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ubicacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=False, index=True)
    titular_persona_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_persona.id"), nullable=False, index=True)
    
    tipo_derecho: Mapped[str] = mapped_column(String(20), default=TipoDerecho.ARRIENDO.value, nullable=False)
    periodo_arriendo: Mapped[str] = mapped_column(String(20), default=PeriodoArriendo.CINCO_ANOS.value, nullable=False)
    
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_vencimiento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # Null for perpetual
    
    monto_pagado: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    folio_recibo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default=EstadoDerecho.VIGENTE.value, nullable=False)

    # Ownership transfer lineage
    titular_anterior_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_persona.id"), nullable=True)
    fecha_transferencia: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Legacy migration lineage (R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    legacy_ven_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)

    # Relationships
    ubicacion: Mapped["Ubicacion"] = relationship("Ubicacion", back_populates="derechos")
    titular: Mapped["Persona"] = relationship("Persona", foreign_keys=[titular_persona_id], back_populates="derechos_titular")
    titular_anterior: Mapped[Optional["Persona"]] = relationship("Persona", foreign_keys=[titular_anterior_id])

    @property
    def es_perpetuo(self) -> bool:
        return self.tipo_derecho == TipoDerecho.PERPETUO.value or self.periodo_arriendo == PeriodoArriendo.PERPETUO.value

    def dias_para_vencer(self, hoy: Optional[date] = None) -> Optional[int]:
        if self.es_perpetuo or not self.fecha_vencimiento:
            return None
        current = hoy or date.today()
        return (self.fecha_vencimiento - current).days

    def __repr__(self) -> str:
        return f"<Derecho(id={self.id}, tipo='{self.tipo_derecho}', estado='{self.estado}')>"
