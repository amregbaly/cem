from typing import Optional
from pydantic import BaseModel


class UbicacionBase(BaseModel):
    cementerio_id: int
    tipo_ubicacion: str
    sector_codigo: str
    fila: str
    numero: str
    capacidad_total: int = 1
    observaciones: Optional[str] = None


class UbicacionCreate(UbicacionBase):
    pass


class UbicacionResponse(UbicacionBase):
    id: int
    capacidad_ocupada: int
    estado: str
    color_status: Optional[str] = None
    grid_x: Optional[int] = None
    grid_y: Optional[int] = None
    codigo_completo: str

    class Config:
        from_attributes = True
