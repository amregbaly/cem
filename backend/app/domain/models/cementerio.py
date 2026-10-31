from typing import List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.domain.models.ubicacion import Ubicacion


class Cementerio(Base, TimestampMixin):
    """
    Cemetery Entity (San Carlos & Cachapoal).
    Table: core.tb_cementerio
    """
    __tablename__ = "tb_cementerio"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    comuna: Mapped[str] = mapped_column(String(50), nullable=False, default="San Carlos")
    region: Mapped[str] = mapped_column(String(50), nullable=False, default="Ñuble")
    direccion: Mapped[str] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    ubicaciones: Mapped[List["Ubicacion"]] = relationship("Ubicacion", back_populates="cementerio", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Cementerio(id={self.id}, codigo='{self.codigo}', nombre='{self.nombre}')>"
