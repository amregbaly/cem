from typing import Optional
from pydantic import BaseModel, Field


class TemaBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50)
    es_modo_oscuro: bool = Field(default=False)
    color_primario: str = Field(..., max_length=10)
    color_secundario: str = Field(..., max_length=10)
    color_acento: str = Field(..., max_length=10)
    color_fondo: str = Field(..., max_length=10)
    color_superficie: str = Field(..., max_length=10)
    color_texto: str = Field(..., max_length=10)
    color_borde: str = Field(..., max_length=10)
    descripcion: Optional[str] = None


class TemaCreate(TemaBase):
    pass


class TemaUpdate(BaseModel):
    nombre: Optional[str] = None
    es_modo_oscuro: Optional[bool] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    color_acento: Optional[str] = None
    color_fondo: Optional[str] = None
    color_superficie: Optional[str] = None
    color_texto: Optional[str] = None
    color_borde: Optional[str] = None
    descripcion: Optional[str] = None


class TemaResponse(TemaBase):
    id: int
    es_activo: bool
    es_sistema: bool

    class Config:
        from_attributes = True
