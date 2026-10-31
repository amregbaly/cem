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
