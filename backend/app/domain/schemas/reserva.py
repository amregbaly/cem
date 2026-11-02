from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class ReservaCreate(BaseModel):
    ubicacion_id: int
    solicitante_nombre: str
    solicitante_rut: Optional[str] = None
    solicitante_telefono: Optional[str] = None
    solicitante_direccion: Optional[str] = None
    fecha_reserva: Optional[date] = None
    fecha_vencimiento: date
    documento_respaldo_url: Optional[str] = None
    observaciones: Optional[str] = None


class ReservaLiberarRequest(BaseModel):
    resolucion_liberacion: str
    motivo_liberacion: str
    observaciones: Optional[str] = None


class ReservaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ubicacion_id: int
    ubicacion_codigo: Optional[str] = None
    solicitante_nombre: str
    solicitante_rut: Optional[str] = None
    solicitante_telefono: Optional[str] = None
    solicitante_direccion: Optional[str] = None
    fecha_reserva: date
    fecha_vencimiento: date
    estado: str
    dias_para_vencer: Optional[int] = None
    documento_respaldo_url: Optional[str] = None
    observaciones: Optional[str] = None
    resolucion_liberacion: Optional[str] = None
    motivo_liberacion: Optional[str] = None
    fecha_liberacion: Optional[date] = None
