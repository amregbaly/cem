from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import ExcepcionMigracion, ReconciliacionMigracion, Usuario, RolUsuario
from app.api.deps import require_role
from etl.reconciliation_report import generate_reconciliation_report
from etl.migrate_excel import run_migration_pipeline

router = APIRouter()


@router.get("/reconciliacion")
def get_reconciliation_report(db: Session = Depends(get_db)):
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


@router.post("/ejecutar")
def trigger_migration(
    background_tasks: BackgroundTasks,
    excel_path: Optional[str] = None,
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value))
):
    """Triggers the legacy Excel migration in the background."""
    background_tasks.add_task(run_migration_pipeline, excel_path)
    return {"message": "Proceso de migración ETL iniciado en segundo plano."}
