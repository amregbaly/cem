import enum
from typing import Optional, TYPE_CHECKING
from datetime import date, datetime
from sqlalchemy import String, Integer, Date, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.cementerio import Cementerio
    from app.domain.models.ubicacion import Ubicacion
    from app.domain.models.inhumacion import Inhumacion
    from app.domain.models.derecho import Derecho


class TipoCertificado(str, enum.Enum):
    INHUMACION = "INHUMACION"
    PROPIEDAD = "PROPIEDAD"
    RENOVACION = "RENOVACION"
    EXHUMACION = "EXHUMACION"


class EstadoCertificado(str, enum.Enum):
    VIGENTE = "VIGENTE"
    ANULADO = "ANULADO"


class Certificado(Base, TimestampMixin):
    """
    Municipal Official Certificate with QR Code and SHA-256 PDF Verification.
    Table: core.tb_certificado
    Compliant with Ley 21.719 and Chilean Municipal Standards.
    """
    __tablename__ = "tb_certificado"
    __table_args__ = (
        Index("idx_certificado_folio", "folio", unique=True),
        Index("idx_certificado_token", "token_verificacion", unique=True),
        Index("idx_certificado_tipo", "tipo_certificado"),
        Index("idx_certificado_estado", "estado"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    folio: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    token_verificacion: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    
    tipo_certificado: Mapped[str] = mapped_column(String(30), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default=EstadoCertificado.VIGENTE.value, nullable=False)
    
    # Optional links to underlying domain entities
    cementerio_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_cementerio.id"), nullable=False)
    ubicacion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=True)
    inhumacion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_inhumacion.id"), nullable=True)
    derecho_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_derecho.id"), nullable=True)

    # Human-readable summary fields (for fast lookup without exposing medical/confidential details)
    fallecido_nombre: Mapped[Optional[str]] = mapped_column(String(220), nullable=True)
    rut_fallecido: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    titular_nombre: Mapped[Optional[str]] = mapped_column(String(220), nullable=True)
    rut_titular: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    
    codigo_ubicacion: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    autoridad_emisora: Mapped[str] = mapped_column(
        String(150), default="Dirección de Cementerios Municipales de San Carlos y Cachapoal", nullable=False
    )
    funcionario_emisor: Mapped[str] = mapped_column(String(100), default="Encargado de Registros Municipales", nullable=False)
    
    fecha_emision: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    fecha_vencimiento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    codigo_qr_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url_pdf: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    cementerio: Mapped["Cementerio"] = relationship("Cementerio")
    ubicacion: Mapped[Optional["Ubicacion"]] = relationship("Ubicacion")
    inhumacion: Mapped[Optional["Inhumacion"]] = relationship("Inhumacion")
    derecho: Mapped[Optional["Derecho"]] = relationship("Derecho")

    def to_public_dict(self) -> dict:
        """
        Public verification representation.
        Strictly excludes cause of death and private contact details (Ley 21.719).
        """
        return {
            "folio": self.folio,
            "token_verificacion": self.token_verificacion,
            "tipo_certificado": self.tipo_certificado,
            "estado": self.estado,
            "es_valido": self.estado == EstadoCertificado.VIGENTE.value,
            "cementerio": self.cementerio.nombre if self.cementerio else "Cementerio Municipal",
            "codigo_ubicacion": self.codigo_ubicacion or (self.ubicacion.codigo_completo if self.ubicacion else "N/A"),
            "fallecido_nombre": self.fallecido_nombre,
            "rut_fallecido": self.rut_fallecido,
            "titular_nombre": self.titular_nombre,
            "rut_titular": self.rut_titular,
            "autoridad_emisora": self.autoridad_emisora,
            "funcionario_emisor": self.funcionario_emisor,
            "fecha_emision": self.fecha_emision.isoformat() if self.fecha_emision else None,
            "fecha_vencimiento": self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            "sha256_hash": self.sha256_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self) -> str:
        return f"<Certificado(folio='{self.folio}', tipo='{self.tipo_certificado}', estado='{self.estado}')>"
