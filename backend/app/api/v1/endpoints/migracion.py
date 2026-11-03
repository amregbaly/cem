import os
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import ExcepcionMigracion, ReconciliacionMigracion, Usuario, RolUsuario
from app.api.deps import require_role
from etl.reconciliation_report import generate_reconciliation_report
from etl.migrate_excel import run_migration_pipeline

router = APIRouter()


@router.get("/reconciliacion")
def get_reconciliation_report(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """Returns the official reconciliation balance (Migrated + Exceptions + Discarded = Total)."""
    return generate_reconciliation_report(db)


@router.get("/excepciones")
def list_exceptions(
    regla_id: Optional[str] = Query(None),
    resuelto: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """Lists legacy migration exceptions logged for Municipal resolution."""
    query = db.query(ExcepcionMigracion)
    if regla_id:
        query = query.filter(ExcepcionMigracion.regla_id == regla_id)
    if resuelto is not None:
        query = query.filter(ExcepcionMigracion.resuelto == resuelto)

    return query.order_by(ExcepcionMigracion.id.asc()).offset(offset).limit(limit).all()


from pydantic import BaseModel


class MigracionEjecutarRequest(BaseModel):
    excel_path: Optional[str] = None


@router.post("/ejecutar")
def trigger_migration(
    background_tasks: BackgroundTasks,
    payload: Optional[MigracionEjecutarRequest] = None,
    excel_path: Optional[str] = Query(None),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value))
):
    """Triggers the legacy Excel migration in the background with strict path traversal checks."""
    path_to_check = (payload.excel_path if payload and payload.excel_path else None) or excel_path
    safe_path = None
    if path_to_check:
        cleaned = os.path.abspath(path_to_check.strip())
        if not (cleaned.lower().endswith(".xlsx") or cleaned.lower().endswith(".xls")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de archivo inválido. Solo se admiten archivos .xlsx o .xls."
            )
        # Disallow traversing into system directories
        allowed_prefixes = [
            "/home/amr/dev",
            "/home/amr/Downloads",
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
        ]
        if not any(cleaned.startswith(p) for p in allowed_prefixes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ruta de archivo no autorizada para el proceso de migración."
            )
        if not os.path.exists(cleaned):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El archivo especificado no existe: {cleaned}"
            )
        safe_path = cleaned

    background_tasks.add_task(run_migration_pipeline, safe_path)
    return {"message": "Proceso de migración ETL iniciado en segundo plano."}

