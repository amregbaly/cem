import enum
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.cementerio import Cementerio
    from app.domain.models.derecho import Derecho
    from app.domain.models.inhumacion import Inhumacion
    from app.domain.models.exhumacion import Exhumacion
    from app.domain.models.maestros import DerechosMaestros


class TipoUbicacion(str, enum.Enum):
    PAB = "PAB"  # Pabellón / Nicho
    PAT = "PAT"  # Patio / Sepultura en tierra
    PCO = "PCO"  # Patio Común
    BOV = "BOV"  # Bóveda
    SP4 = "SP4"  # Sepultura en altura / Mausoleo


class EstadoUbicacion(str, enum.Enum):
    DISPONIBLE = "DISPONIBLE"
    RESERVADO = "RESERVADO"
    OCUPADO = "OCUPADO"
    ARRIENDO_VENCIDO = "ARRIENDO_VENCIDO"
    BLOQUEADO = "BLOQUEADO"


class Ubicacion(Base, TimestampMixin):
    """
    Cemetery Location Entity.
    Table: core.tb_ubicacion
    """
    __tablename__ = "tb_ubicacion"
    __table_args__ = (
        UniqueConstraint("cementerio_id", "tipo_ubicacion", "sector_codigo", "fila", "numero", name="uq_ubicacion_coords"),
        Index("idx_ubicacion_coords", "cementerio_id", "tipo_ubicacion", "sector_codigo", "fila", "numero"),
        Index("idx_ubicacion_estado", "estado"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cementerio_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_cementerio.id"), nullable=False, index=True)
    tipo_ubicacion: Mapped[str] = mapped_column(String(10), nullable=False)  # PAB, PAT, PCO, BOV, SP4
    sector_codigo: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    fila: Mapped[str] = mapped_column(String(20), nullable=False, default="0")
    numero: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    
    capacidad_total: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    capacidad_ocupada: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default=EstadoUbicacion.DISPONIBLE.value, nullable=False)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Spatial GIS coordinates (Grid & Vector Map)
    grid_x: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    grid_y: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sector_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    geo_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Legacy migration lineage (Rules R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    legacy_codigo_interno: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)

    # Relationships
    cementerio: Mapped["Cementerio"] = relationship("Cementerio", back_populates="ubicaciones")
    derechos: Mapped[List["Derecho"]] = relationship("Derecho", back_populates="ubicacion")
    inhumaciones: Mapped[List["Inhumacion"]] = relationship("Inhumacion", back_populates="ubicacion")
    exhumaciones_origen: Mapped[List["Exhumacion"]] = relationship("Exhumacion", foreign_keys="Exhumacion.ubicacion_origen_id", back_populates="ubicacion_origen")
    exhumaciones_destino: Mapped[List["Exhumacion"]] = relationship("Exhumacion", foreign_keys="Exhumacion.ubicacion_destino_id", back_populates="ubicacion_destino")
    trabajos_maestros: Mapped[List["DerechosMaestros"]] = relationship("DerechosMaestros", back_populates="ubicacion")

    @property
    def codigo_completo(self) -> str:
        return f"{self.tipo_ubicacion}-{self.sector_codigo}-F{self.fila}-N{self.numero}"

    @property
    def color_status(self) -> str:
        if self.estado == "BLOQUEADO":
            return "BLOQUEADO"
        if self.estado == "RESERVADO":
            return "RESERVADO"
        if self.estado == "ARRIENDO_VENCIDO":
            return "ARRIENDO_VENCIDO"
        # Check active lease expiration threshold (<= 90 days)
        for d in self.derechos or []:
            days_left = d.dias_para_vencer()
            if days_left is not None and days_left <= 90:
                return "ARRIENDO_VENCIDO"
        if self.capacidad_ocupada > 0 or (self.inhumaciones and len(self.inhumaciones) > 0) or self.estado == "OCUPADO":
            return "OCUPADO"
        return "DISPONIBLE"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "cementerio_id": self.cementerio_id,
            "tipo_ubicacion": self.tipo_ubicacion,
            "sector_codigo": self.sector_codigo,
            "sector_code": self.sector_code or self.sector_codigo,
            "fila": self.fila,
            "numero": self.numero,
            "codigo_completo": self.codigo_completo,
            "capacidad_total": self.capacidad_total,
            "capacidad_ocupada": self.capacidad_ocupada,
            "estado": self.estado,
            "color_status": self.color_status,
            "grid_x": self.grid_x,
            "grid_y": self.grid_y,
            "geo_json": self.geo_json,
            "observaciones": self.observaciones
        }

    def __repr__(self) -> str:
        return f"<Ubicacion(id={self.id}, {self.codigo_completo}, estado='{self.estado}')>"
