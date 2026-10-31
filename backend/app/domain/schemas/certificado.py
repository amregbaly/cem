from typing import Optional
from pydantic import BaseModel, ConfigDict


class CertificadoEmitirRequest(BaseModel):
    tipo_certificado: str  # INHUMACION, PROPIEDAD, RENOVACION, EXHUMACION
    cementerio_id: int
    ubicacion_id: Optional[int] = None
    inhumacion_id: Optional[int] = None
    derecho_id: Optional[int] = None
    fallecido_nombre: Optional[str] = None
    rut_fallecido: Optional[str] = None
    titular_nombre: Optional[str] = None
    rut_titular: Optional[str] = None
    observaciones: Optional[str] = None


class CertificadoPublicoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    folio: str
    token_verificacion: str
    tipo_certificado: str
    estado: str
    es_valido: bool
    cementerio: str
    codigo_ubicacion: str
    fallecido_nombre: Optional[str] = None
    rut_fallecido: Optional[str] = None
    titular_nombre: Optional[str] = None
    rut_titular: Optional[str] = None
    autoridad_emisora: str
    funcionario_emisor: str
    fecha_emision: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    sha256_hash: str
    created_at: Optional[str] = None
