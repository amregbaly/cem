import enum
from typing import Optional, TYPE_CHECKING
from datetime import date, datetime
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.cementerio import Cementerio
    from app.domain.models.ubicacion import Ubicacion


class TipoTareaTerreno(str, enum.Enum):
    INHUMACION = "INHUMACION"
    EXHUMACION = "EXHUMACION"
    MANTENCION = "MANTENCION"
    TRABAJO_MAESTRO = "TRABAJO_MAESTRO"
    REVISION_ESTRUCTURAL = "REVISION_ESTRUCTURAL"


class EstadoTareaTerreno(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    EN_PROCESO = "EN_PROCESO"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"


class TareaTerreno(Base, TimestampMixin):
    """
    Field Crew Agenda & Work Execution Entity (Sepultureros PWA).
    Table: core.tb_tarea_terreno
    """
    __tablename__ = "tb_tarea_terreno"
    __table_args__ = (
        Index("idx_tarea_terreno_fecha", "fecha_programada"),
        Index("idx_tarea_terreno_estado", "estado"),
        Index("idx_tarea_terreno_cementerio", "cementerio_id"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    folio_orden: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    
    cementerio_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_cementerio.id"), nullable=False)
    ubicacion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=True)
    
    tipo_tarea: Mapped[str] = mapped_column(String(30), default=TipoTareaTerreno.INHUMACION.value, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default=EstadoTareaTerreno.PENDIENTE.value, nullable=False)
    
    # Task specific details
    fallecido_nombre: Mapped[Optional[str]] = mapped_column(String(220), nullable=True)
    rut_fallecido: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    solicitante_nombre: Mapped[Optional[str]] = mapped_column(String(220), nullable=True)
    
    fecha_programada: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hora_programada: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # e.g., "11:30"
    
    sepulturero_asignado: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Execution documents & photos captured on mobile
    acta_firmada_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    foto_pase_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    ejecutado_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ejecutado_por: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    cementerio: Mapped["Cementerio"] = relationship("Cementerio")
    ubicacion: Mapped[Optional["Ubicacion"]] = relationship("Ubicacion")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "folio_orden": self.folio_orden,
            "cementerio_id": self.cementerio_id,
            "cementerio_nombre": self.cementerio.nombre if self.cementerio else "N/A",
            "ubicacion_id": self.ubicacion_id,
            "codigo_ubicacion": self.ubicacion.codigo_completo if self.ubicacion else "N/A",
            "tipo_tarea": self.tipo_tarea,
            "estado": self.estado,
            "fallecido_nombre": self.fallecido_nombre,
            "rut_fallecido": self.rut_fallecido,
            "solicitante_nombre": self.solicitante_nombre,
            "fecha_programada": self.fecha_programada.isoformat() if self.fecha_programada else None,
            "hora_programada": self.hora_programada,
            "sepulturero_asignado": self.sepulturero_asignado,
            "acta_firmada_url": self.acta_firmada_url,
            "foto_pase_url": self.foto_pase_url,
            "observaciones": self.observaciones,
            "ejecutado_at": self.ejecutado_at.isoformat() if self.ejecutado_at else None,
            "ejecutado_por": self.ejecutado_por
        }

    def __repr__(self) -> str:
        return f"<TareaTerreno(id={self.id}, folio='{self.folio_orden}', estado='{self.estado}')>"
