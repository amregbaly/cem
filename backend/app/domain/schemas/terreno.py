from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class TareaTerrenoCreate(BaseModel):
    cementerio_id: int = 1
    ubicacion_id: Optional[int] = None
    codigo_ubicacion: Optional[str] = None
    tipo_tarea: str = "INHUMACION"
    fallecido_nombre: Optional[str] = None
    rut_fallecido: Optional[str] = None
    solicitante_nombre: Optional[str] = None
    fecha_programada: date
    hora_programada: Optional[str] = "11:00"
    sepulturero_asignado: Optional[str] = "Cuadrilla 1"
    observaciones: Optional[str] = None


class TareaTerrenoUpdate(BaseModel):
    estado: Optional[str] = None  # PENDIENTE, EN_PROCESO, COMPLETADA, CANCELADA
    sepulturero_asignado: Optional[str] = None
    acta_firmada_url: Optional[str] = None
    foto_pase_url: Optional[str] = None
    observaciones: Optional[str] = None


class TareaTerrenoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folio_orden: str
    cementerio_id: int
    cementerio_nombre: str
    ubicacion_id: Optional[int] = None
    codigo_ubicacion: str
    tipo_tarea: str
    estado: str
    fallecido_nombre: Optional[str] = None
    rut_fallecido: Optional[str] = None
    solicitante_nombre: Optional[str] = None
    fecha_programada: str
    hora_programada: Optional[str] = None
    sepulturero_asignado: Optional[str] = None
    acta_firmada_url: Optional[str] = None
    foto_pase_url: Optional[str] = None
    observaciones: Optional[str] = None
    ejecutado_at: Optional[str] = None
    ejecutado_por: Optional[str] = None
