from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    username: str
    user_rut: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    modulo: str
    accion: str
    entidad: str
    registro_id: str
    payload_anterior: Optional[Dict[str, Any]] = None
    payload_posterior: Optional[Dict[str, Any]] = None
    hash_anterior: str
    hash_registro: str

    class Config:
        from_attributes = True


class AuditVerificationResult(BaseModel):
    is_valid: bool
    records_checked: int
    failure_reason: Optional[str] = None
    chain_head_hash: Optional[str] = None


class ActividadUsuarioCreate(BaseModel):
    username: Optional[str] = "ANONIMO"
    user_rut: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metodo: str = "GET"
    ruta: str
    modulo: str = "SISTEMA"
    accion: str = "NAVEGACION"
    descripcion: str
    status_code: int = 200
    duracion_ms: Optional[float] = None
    detalles: Optional[Dict[str, Any]] = None


class ActividadUsuarioResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: str
    user_rut: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: str
    user_agent: Optional[str] = None
    metodo: str
    ruta: str
    modulo: str
    accion: str
    descripcion: str
    status_code: int
    duracion_ms: Optional[float] = None
    detalles: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ActividadUsuarioResumen(BaseModel):
    total_movimientos: int
    usuarios_unicos: int
    ips_unicas: int
    modificaciones_count: int
    lecturas_count: int
    errores_count: int


class ActividadUsuarioListResponse(BaseModel):
    total: int
    items: list[ActividadUsuarioResponse]
    resumen: ActividadUsuarioResumen
