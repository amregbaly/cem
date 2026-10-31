from typing import Optional, List, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, Boolean, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.derecho import Derecho
    from app.domain.models.inhumacion import Inhumacion


class Persona(Base, TimestampMixin):
    """
    Person Entity (Deceased, Property Holders, Relatives, Masons).
    Table: core.tb_persona
    """
    __tablename__ = "tb_persona"
    __table_args__ = (
        Index("idx_persona_rut", "rut"),
        Index("idx_persona_apellidos", "apellido_paterno", "apellido_materno"),
        Index("idx_persona_nombre_completo", "nombre_completo"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rut: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    rut_cuerpo: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rut_dv: Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    rut_validado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    nombres: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    apellido_paterno: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    apellido_materno: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    nombre_completo: Mapped[str] = mapped_column(String(220), nullable=False, index=True)

    fecha_nacimiento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fecha_nacimiento_desconocida: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_nn: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # NN / Person not identified

    telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    celular: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    direccion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    comuna_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    comuna_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Legacy migration lineage (R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    derechos_titular: Mapped[List["Derecho"]] = relationship(
        "Derecho", foreign_keys="Derecho.titular_persona_id", back_populates="titular"
    )
    inhumaciones: Mapped[List["Inhumacion"]] = relationship(
        "Inhumacion", back_populates="fallecido"
    )

    def __repr__(self) -> str:
        return f"<Persona(id={self.id}, rut='{self.rut}', nombre='{self.nombre_completo}')>"
