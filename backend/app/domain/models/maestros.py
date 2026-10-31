import enum
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.ubicacion import Ubicacion


class TipoTrabajoMaestro(int, enum.Enum):
    COLOCACION_LAPIDA = 1  # Headstone installation
    CONSTRUCCION_REPARACION = 2  # Construction / Repair
    MANTENCION = 3  # Maintenance


class Maestro(Base, TimestampMixin):
    """
    Authorized Mason Entity.
    Table: core.tb_maestros
    """
    __tablename__ = "tb_maestros"
    __table_args__ = (
        Index("idx_maestro_rut", "rut"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rut: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    nombres: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido_paterno: Mapped[str] = mapped_column(String(60), nullable=False)
    apellido_materno: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Legacy migration lineage (R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    ordenes_trabajo: Mapped[List["DerechosMaestros"]] = relationship("DerechosMaestros", back_populates="maestro")

    @property
    def nombre_completo(self) -> str:
        parts = [self.nombres, self.apellido_paterno]
        if self.apellido_materno:
            parts.append(self.apellido_materno)
        return " ".join(parts)

    def __repr__(self) -> str:
        return f"<Maestro(id={self.id}, rut='{self.rut}', nombre='{self.nombre_completo}')>"


class DerechosMaestros(Base, TimestampMixin):
    """
    Mason Work Orders linked to Property History.
    Table: core.tb_derechos_maestros
    """
    __tablename__ = "tb_derechos_maestros"
    __table_args__ = (
        Index("idx_derechos_maestros_orden", "orden_ingreso"),
        Index("idx_derechos_maestros_ubicacion", "ubicacion_id"),
        Index("idx_derechos_maestros_fecha", "fecha_orden"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orden_ingreso: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    maestro_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_maestros.id"), nullable=True, index=True)
    rut_maestro_legacy: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    
    ubicacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=False, index=True)
    fecha_orden: Mapped[date] = mapped_column(Date, nullable=False)
    tipo_trabajo: Mapped[int] = mapped_column(Integer, default=TipoTrabajoMaestro.COLOCACION_LAPIDA.value, nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Legacy migration lineage (R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    maestro: Mapped[Optional["Maestro"]] = relationship("Maestro", back_populates="ordenes_trabajo")
    ubicacion: Mapped["Ubicacion"] = relationship("Ubicacion", back_populates="trabajos_maestros")

    def __repr__(self) -> str:
        return f"<DerechosMaestros(id={self.id}, orden='{self.orden_ingreso}', tipo={self.tipo_trabajo})>"
