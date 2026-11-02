from typing import Optional
from datetime import date
from pydantic import BaseModel, ConfigDict


class InhumacionCreate(BaseModel):
    ubicacion_id: int
    numero_ingreso: str
    rut: Optional[str] = None
    nombres: Optional[str] = None
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    fecha_defuncion: Optional[date] = None
    fecha_sepultacion: date
    causa_fallecimiento: Optional[str] = None
    pase_sepultacion_folio: Optional[str] = None
    pase_sepultacion_doc_url: Optional[str] = None
    responsable_nombre: Optional[str] = None
    responsable_rut: Optional[str] = None
    responsable_telefono: Optional[str] = None
    responsable_direccion: Optional[str] = None
    orden_ingreso_doc_url: Optional[str] = None
    observaciones: Optional[str] = None


class InhumacionResponse(BaseModel):
    id: int
    ubicacion_id: int
    numero_ingreso: str
    nombre_fallecido: str
    rut_fallecido: Optional[str] = None
    fecha_defuncion: Optional[date] = None
    fecha_sepultacion: date
    causa_fallecimiento: Optional[str] = None  # Masked if visitor role (Ley 20.584)
    ubicacion_codigo: Optional[str] = None
    pase_sepultacion_folio: Optional[str] = None
    pase_sepultacion_doc_url: Optional[str] = None
    responsable_nombre: Optional[str] = None
    responsable_rut: Optional[str] = None
    responsable_telefono: Optional[str] = None  # Masked if visitor role (Ley 21.719)
    responsable_direccion: Optional[str] = None  # Masked if visitor role (Ley 21.719)
    orden_ingreso_doc_url: Optional[str] = None
    observaciones: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
