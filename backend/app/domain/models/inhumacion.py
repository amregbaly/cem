from typing import Optional, List, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.ubicacion import Ubicacion
    from app.domain.models.persona import Persona
    from app.domain.models.exhumacion import Exhumacion


class Inhumacion(Base, TimestampMixin):
    """
    Inhumation (Burial) Entity.
    Table: core.tb_inhumacion
    """
    __tablename__ = "tb_inhumacion"
    __table_args__ = (
        Index("idx_inhumacion_ubicacion", "ubicacion_id"),
        Index("idx_inhumacion_fallecido", "fallecido_persona_id"),
        Index("idx_inhumacion_fecha_sep", "fecha_sepultacion"),
        Index("idx_inhumacion_nro_ingreso", "numero_ingreso"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ubicacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=False, index=True)
    fallecido_persona_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_persona.id"), nullable=False, index=True)
    
    numero_ingreso: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    fecha_defuncion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    fecha_sepultacion: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Confidential field: restricted to Admin & Administrativo profiles (masked for visitor)
    causa_fallecimiento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    comuna_defuncion_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    comuna_defuncion_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Official burial permit document (PDF)
    pase_sepultacion_doc_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pase_sepultacion_folio: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    reduccion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Responsible person information (EETT 3.5 & Annex 2 Row 4 / A2-04)
    responsable_nombre: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    responsable_rut: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    responsable_telefono: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    responsable_direccion: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    orden_ingreso_doc_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Optimistic Concurrency Control (OCC)
    version_id: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __mapper_args__ = {
        "version_id_col": version_id
    }


    # Legacy migration lineage (R7 & R9)
    origen_migracion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_sheet: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    legacy_fall_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)

    ubicacion: Mapped["Ubicacion"] = relationship("Ubicacion", back_populates="inhumaciones")
    fallecido: Mapped["Persona"] = relationship("Persona", back_populates="inhumaciones")
    exhumaciones: Mapped[List["Exhumacion"]] = relationship("Exhumacion", back_populates="inhumacion")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ubicacion_id": self.ubicacion_id,
            "fallecido_persona_id": self.fallecido_persona_id,
            "numero_ingreso": self.numero_ingreso,
            "fecha_defuncion": self.fecha_defuncion.isoformat() if self.fecha_defuncion else None,
            "fecha_sepultacion": self.fecha_sepultacion.isoformat() if self.fecha_sepultacion else None,
            "causa_fallecimiento": self.causa_fallecimiento,
            "pase_sepultacion_folio": self.pase_sepultacion_folio,
            "pase_sepultacion_doc_url": self.pase_sepultacion_doc_url,
            "responsable_nombre": self.responsable_nombre,
            "responsable_rut": self.responsable_rut,
            "responsable_telefono": self.responsable_telefono,
            "responsable_direccion": self.responsable_direccion,
            "orden_ingreso_doc_url": self.orden_ingreso_doc_url,
            "observaciones": self.observaciones,
            "version_id": self.version_id
        }

    def __repr__(self) -> str:
        return f"<Inhumacion(id={self.id}, nro_ingreso='{self.numero_ingreso}', fecha='{self.fecha_sepultacion}')>"
