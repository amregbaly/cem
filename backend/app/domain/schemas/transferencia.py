from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class TransferenciaCreate(BaseModel):
    nuevo_titular_persona_id: Optional[int] = None
    nuevo_titular_id: Optional[int] = None
    fecha_transferencia: Optional[date] = None
    numero_resolucion: Optional[str] = None
    orden_ingreso: Optional[str] = None
    documento_respaldo_url: Optional[str] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None


class TransferenciaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    derecho_id: int
    titular_anterior_id: int
    titular_anterior_nombre: Optional[str] = None
    titular_anterior_rut: Optional[str] = None
    titular_nuevo_id: int
    titular_nuevo_nombre: Optional[str] = None
    titular_nuevo_rut: Optional[str] = None
    fecha_transferencia: date
    numero_resolucion: Optional[str] = None
    orden_ingreso: Optional[str] = None
    documento_respaldo_url: Optional[str] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
