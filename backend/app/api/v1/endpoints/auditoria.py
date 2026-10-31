from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import LogAuditoria, RolUsuario, Usuario
from app.domain.schemas.audit import AuditLogResponse, AuditVerificationResult
from app.api.deps import require_role
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    modulo: Optional[str] = Query(None),
    accion: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value))
):
    """List append-only audit logs. Restricted to Administrator role."""
    query = db.query(LogAuditoria)
    if modulo:
        query = query.filter(LogAuditoria.modulo == modulo.upper())
    if accion:
        query = query.filter(LogAuditoria.accion == accion.upper())
    if username:
        query = query.filter(LogAuditoria.username == username)

    return query.order_by(LogAuditoria.id.desc()).offset(offset).limit(limit).all()


@router.get("/verificar", response_model=AuditVerificationResult)
@router.post("/verificar", response_model=AuditVerificationResult)
def verify_audit_trail(
    db: Session = Depends(get_db),
):
    """
    Cryptographic verification endpoint: Walks through the entire HMAC SHA-256 chain,
    re-computing each hash from the genesis block to verify zero records have been altered,
    deleted, or inserted out of sequence.
    """
    is_valid, count, reason = AuditService.verify_chain_integrity(db)
    head_hash = AuditService.get_latest_hash(db)
    return AuditVerificationResult(
        is_valid=is_valid,
        records_checked=count,
        failure_reason=reason,
        chain_head_hash=head_hash
    )
