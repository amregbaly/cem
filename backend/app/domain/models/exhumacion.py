from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.inhumacion import Inhumacion
    from app.domain.models.ubicacion import Ubicacion
    from app.domain.models.persona import Persona


class Exhumacion(Base, TimestampMixin):
    """
    Exhumation & Relocation Entity.
    Table: core.tb_exhumacion
    """
    __tablename__ = "tb_exhumacion"
    __table_args__ = (
        Index("idx_exhumacion_inhumacion", "inhumacion_id"),
        Index("idx_exhumacion_origen", "ubicacion_origen_id"),
        Index("idx_exhumacion_destino", "ubicacion_destino_id"),
        Index("idx_exhumacion_fecha", "fecha_exhumacion"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inhumacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_inhumacion.id"), nullable=False, index=True)
    ubicacion_origen_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=False, index=True)
    ubicacion_destino_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=True, index=True)
    
    destino_externo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # E.g., Crematorium, another cemetery
    correlativo_memo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    fecha_exhumacion: Mapped[date] = mapped_column(Date, nullable=False)
    hora_exhumacion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    
    resolucion_numero: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fecha_resolucion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    familiar_solicitante_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_persona.id"), nullable=True)
    motivo: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_exhumacion_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    libera_ubicacion_origen: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    es_reduccion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Legacy migration lineage (R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    inhumacion: Mapped["Inhumacion"] = relationship("Inhumacion", back_populates="exhumaciones")
    ubicacion_origen: Mapped["Ubicacion"] = relationship("Ubicacion", foreign_keys=[ubicacion_origen_id], back_populates="exhumaciones_origen")
    ubicacion_destino: Mapped[Optional["Ubicacion"]] = relationship("Ubicacion", foreign_keys=[ubicacion_destino_id], back_populates="exhumaciones_destino")
    familiar_solicitante: Mapped[Optional["Persona"]] = relationship("Persona", foreign_keys=[familiar_solicitante_id])

    def __repr__(self) -> str:
        return f"<Exhumacion(id={self.id}, fecha='{self.fecha_exhumacion}', resolucion='{self.resolucion_numero}')>"
