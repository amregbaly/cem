from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base, TimestampMixin


class ConfigTema(Base, TimestampMixin):
    """
    Custom Theme Configuration for Admin Panel & System Interface.
    Table: core.tb_config_tema
    Allows dynamic theme management, custom color palettes, and day/night variations.
    """
    __tablename__ = "tb_config_tema"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    es_activo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_modo_oscuro: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    es_sistema: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Built-in vs User-created
    
    # Hex Color Palette Tokens
    color_primario: Mapped[str] = mapped_column(String(10), default="#1E3A8A", nullable=False)  # Blue 900
    color_secundario: Mapped[str] = mapped_column(String(10), default="#3B82F6", nullable=False) # Blue 500
    color_acento: Mapped[str] = mapped_column(String(10), default="#10B981", nullable=False)    # Emerald 500
    color_fondo: Mapped[str] = mapped_column(String(10), default="#F8FAFC", nullable=False)     # Slate 50
    color_superficie: Mapped[str] = mapped_column(String(10), default="#FFFFFF", nullable=False)# Card / White
    color_texto: Mapped[str] = mapped_column(String(10), default="#0F172A", nullable=False)     # Slate 900
    color_borde: Mapped[str] = mapped_column(String(10), default="#E2E8F0", nullable=False)     # Slate 200
    
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<ConfigTema(id={self.id}, slug='{self.slug}', activo={self.es_activo})>"
