from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class ExhumacionCreate(BaseModel):
    inhumacion_id: int
    ubicacion_destino_id: Optional[int] = None
    destino_externo: Optional[str] = None
    fecha_exhumacion: date
    hora_exhumacion: Optional[str] = None
    resolucion_numero: Optional[str] = None
    fecha_resolucion: Optional[date] = None
    solicitante_nombre: Optional[str] = None
    solicitante_rut: Optional[str] = None
    solicitante_telefono: Optional[str] = None
    motivo: str
    tipo_exhumacion_id: Optional[int] = None
    libera_ubicacion_origen: bool = True
    es_reduccion: bool = False
    orden_ingreso_folio: Optional[str] = None
    observaciones: Optional[str] = None


class ExhumacionResponse(BaseModel):
    id: int
    inhumacion_id: int
    fallecido_nombre: str
    fallecido_rut: Optional[str] = None
    ubicacion_origen_id: int
    ubicacion_origen_codigo: str
    ubicacion_destino_id: Optional[int] = None
    ubicacion_destino_codigo: Optional[str] = None
    destino_externo: Optional[str] = None
    fecha_exhumacion: date
    hora_exhumacion: Optional[str] = None
    resolucion_numero: Optional[str] = None
    fecha_resolucion: Optional[date] = None
    solicitante_nombre: Optional[str] = None
    solicitante_rut: Optional[str] = None
    solicitante_telefono: Optional[str] = None  # Masked for visitor
    motivo: str
    libera_ubicacion_origen: bool
    es_reduccion: bool
    observaciones: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
