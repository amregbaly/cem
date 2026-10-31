from typing import Optional
from datetime import date
from pydantic import BaseModel


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
    observaciones: Optional[str] = None


class InhumacionResponse(BaseModel):
    id: int
    ubicacion_id: int
    numero_ingreso: str
    nombre_fallecido: str
    rut_fallecido: Optional[str] = None
    fecha_defuncion: Optional[date] = None
    fecha_sepultacion: date
    causa_fallecimiento: Optional[str] = None  # Masked if visitor role
    ubicacion_codigo: Optional[str] = None
    pase_sepultacion_folio: Optional[str] = None

    class Config:
        from_attributes = True
