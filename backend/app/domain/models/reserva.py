import enum
from typing import Optional, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.ubicacion import Ubicacion
    from app.domain.models.usuario import Usuario


class EstadoReserva(str, enum.Enum):
    VIGENTE = "VIGENTE"
    VENCIDA = "VENCIDA"
    LIBERADA = "LIBERADA"
    CONVERTIDA = "CONVERTIDA"


class Reserva(Base, TimestampMixin):
    """
    Reservation Model for Municipal Cemetery Locations (EETT 3.11 & Annex 2 Row 13 / A2-13).
    Table: core.tb_reserva
    """
    __tablename__ = "tb_reserva"
    __table_args__ = (
        Index("idx_reserva_ubicacion", "ubicacion_id"),
        Index("idx_reserva_estado", "estado"),
        Index("idx_reserva_vencimiento", "fecha_vencimiento"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ubicacion_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_ubicacion.id"), nullable=False, index=True)

    solicitante_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    solicitante_rut: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    solicitante_telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    solicitante_direccion: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)

    fecha_reserva: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(30), default=EstadoReserva.VIGENTE.value, nullable=False)

    documento_respaldo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Fields for Admin confirmation of liberation after expiry (EETT 3.11)
    resolucion_liberacion: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    motivo_liberacion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_liberacion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    usuario_liberacion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("core.tb_usuario.id"), nullable=True)

    ubicacion: Mapped["Ubicacion"] = relationship("Ubicacion", foreign_keys=[ubicacion_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ubicacion_id": self.ubicacion_id,
            "solicitante_nombre": self.solicitante_nombre,
            "solicitante_rut": self.solicitante_rut,
            "solicitante_telefono": self.solicitante_telefono,
            "solicitante_direccion": self.solicitante_direccion,
            "fecha_reserva": self.fecha_reserva.isoformat() if self.fecha_reserva else None,
            "fecha_vencimiento": self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            "estado": self.estado,
            "documento_respaldo_url": self.documento_respaldo_url,
            "observaciones": self.observaciones,
            "resolucion_liberacion": self.resolucion_liberacion,
            "motivo_liberacion": self.motivo_liberacion,
            "fecha_liberacion": self.fecha_liberacion.isoformat() if self.fecha_liberacion else None
        }
