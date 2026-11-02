from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base, TimestampMixin


class ConfigPortal(Base, TimestampMixin):
    """
    Public Citizen Portal Configuration.
    Table: core.tb_config_portal
    Controls whether external/public visitors can see only certificates or also the death list (inhumaciones).
    """
    __tablename__ = "tb_config_portal"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    permitir_lista_fallecidos: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    permitir_busqueda_publica: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    titulo_portal: Mapped[str] = mapped_column(String(150), default="Portal Ciudadano de Certificados Municipales", nullable=False)
    mensaje_portal: Mapped[str] = mapped_column(
        Text,
        default="Verificación digital y autenticidad de certificados para los Cementerios de San Carlos y Cachapoal (Ley 21.719).",
        nullable=False
    )
    actualizado_por: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "permitir_lista_fallecidos": self.permitir_lista_fallecidos,
            "permitir_busqueda_publica": self.permitir_busqueda_publica,
            "titulo_portal": self.titulo_portal,
            "mensaje_portal": self.mensaje_portal,
            "actualizado_por": self.actualizado_por,
            "updated_at": self.updated_at.isoformat() if hasattr(self, "updated_at") and self.updated_at else None
        }
