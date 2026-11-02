import enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.usuario import Usuario


class NivelAcceso(str, enum.Enum):
    NONE = "NONE"       # Sin acceso al módulo
    READ = "READ"       # Acceso de solo lectura / consulta
    WRITE = "WRITE"     # Acceso completo de lectura y escritura


class ModuloSistema(str, enum.Enum):
    INHUMACIONES = "INHUMACIONES"       # Registro de defunciones e inhumaciones
    UBICACIONES = "UBICACIONES"         # Catastro GIS, nichos, patios y sectores
    ARRIENDOS = "ARRIENDOS"             # Control de arriendos, pagos y renovaciones
    CERTIFICADOS = "CERTIFICADOS"       # Emisión de certificados digitales QR
    CAMPO = "CAMPO"                     # Cuadrillas operativas y órdenes de terreno
    AUDITORIA = "AUDITORIA"             # Registro inmutable HMAC y trazabilidad
    CONFIGURACION = "CONFIGURACION"     # Personalización de temas y tokens
    USUARIOS = "USUARIOS"               # Administración de usuarios y grupos (RBAC)


class Grupo(Base, TimestampMixin):
    """
    User Group / Role Entity.
    Table: core.tb_grupo
    """
    __tablename__ = "tb_grupo"
    __table_args__ = (
        Index("idx_grupo_nombre", "nombre"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    es_sistema: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    permisos: Mapped[List["GrupoPermiso"]] = relationship("GrupoPermiso", back_populates="grupo", cascade="all, delete-orphan")
    usuarios: Mapped[List["Usuario"]] = relationship("Usuario", back_populates="grupo")

    def __repr__(self) -> str:
        return f"<Grupo(id={self.id}, nombre='{self.nombre}', es_sistema={self.es_sistema})>"


class GrupoPermiso(Base, TimestampMixin):
    """
    Granular Permission Matrix Entry per Group and Functional Module.
    Table: core.tb_grupo_permiso
    """
    __tablename__ = "tb_grupo_permiso"
    __table_args__ = (
        Index("idx_permiso_grupo_modulo", "grupo_id", "modulo"),
        {"schema": "core"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    grupo_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.tb_grupo.id"), nullable=False)
    modulo: Mapped[str] = mapped_column(String(50), nullable=False)
    acceso: Mapped[str] = mapped_column(String(20), default=NivelAcceso.READ.value, nullable=False)

    grupo: Mapped["Grupo"] = relationship("Grupo", back_populates="permisos")

    def __repr__(self) -> str:
        return f"<GrupoPermiso(id={self.id}, grupo_id={self.grupo_id}, modulo='{self.modulo}', acceso='{self.acceso}')>"
