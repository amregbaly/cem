import enum
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base, TimestampMixin


class RolUsuario(str, enum.Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    ADMINISTRATIVO = "ADMINISTRATIVO"
    VISITA = "VISITA"


class Usuario(Base, TimestampMixin):
    """
    User Account Entity.
    Table: core.tb_usuario
    """
    __tablename__ = "tb_usuario"
    __table_args__ = (
        Index("idx_usuario_username", "username"),
        Index("idx_usuario_rut", "rut"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    rut: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    nombre_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(30), default=RolUsuario.ADMINISTRATIVO.value, nullable=False)
    
    # TOTP 2FA (Mandatory for Admin & Administrative, optional for Visitor)
    totp_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ultimo_acceso: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<Usuario(id={self.id}, username='{self.username}', rol='{self.rol}')>"
