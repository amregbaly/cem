from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Maestro, DerechosMaestros, Ubicacion, Usuario, RolUsuario
from app.api.deps import require_role, get_current_user_optional, get_current_user
from app.infrastructure.db.audit_listener import AuditService
from etl.rut_validator import validate_and_format_rut

router = APIRouter()


class MaestroCreate(BaseModel):
    rut: str
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None


class MaestroResponse(BaseModel):
    id: int
    rut: str
    nombre_completo: str
    nombres: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True


class TrabajoMaestroCreate(BaseModel):
    orden_ingreso: str = Field(..., description="Número de Orden de Ingreso Municipal")
    maestro_id: int
    ubicacion_id: int
    fecha_orden: date = Field(default_factory=date.today)
    tipo_trabajo: int = Field(1, description="1: Colocación de Lápida, 2: Construcción/Reparación, 3: Mantención")
    observaciones: Optional[str] = None


class TrabajoMaestroResponse(BaseModel):
    id: int
    orden_ingreso: str
    maestro_id: Optional[int]
    maestro_nombre: Optional[str]
    ubicacion_id: int
    codigo_ubicacion: str
    fecha_orden: str
    tipo_trabajo: int
    observaciones: Optional[str]


@router.get("", response_model=List[MaestroResponse])
def list_maestros(
    activo: Optional[bool] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List registered and authorized masons (tb_maestros)."""
    query = db.query(Maestro)
    if activo is not None:
        query = query.filter(Maestro.activo == activo)
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter(
            (Maestro.nombres.ilike(pat)) |
            (Maestro.apellido_paterno.ilike(pat)) |
            (Maestro.rut.ilike(pat))
        )
    return query.order_by(Maestro.apellido_paterno.asc()).all()


@router.post("", response_model=MaestroResponse, status_code=status.HTTP_201_CREATED)
def create_maestro(
    req: MaestroCreate,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Register a new authorized mason.
    Validates RUT Modulo 11 check.
    """
    is_valid, formatted_rut, _, _ = validate_and_format_rut(req.rut)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"RUT de maestro '{req.rut}' inválido (Falla Módulo 11).")

    existing = db.query(Maestro).filter(Maestro.rut == formatted_rut).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El maestro con RUT {formatted_rut} ya está registrado.")

    maestro = Maestro(
        rut=formatted_rut,
        nombres=req.nombres.strip().upper(),
        apellido_paterno=req.apellido_paterno.strip().upper(),
        apellido_materno=req.apellido_materno.strip().upper() if req.apellido_materno else None,
        direccion=req.direccion,
        telefono=req.telefono,
        activo=True
    )
    db.add(maestro)
    db.commit()
    db.refresh(maestro)

    AuditService.log_mutation(
        session=db,
        modulo="MAESTROS",
        accion="CREAR_MAESTRO",
        entidad="core.tb_maestros",
        registro_id=str(maestro.id),
        payload_posterior={"rut": maestro.rut, "nombre": maestro.nombre_completo},
        user_id=current_user.id if current_user else 1,
        username=current_user.username if current_user else "SISTEMA",
        user_rut=current_user.rut if current_user else "11111111-1",
        user_role=current_user.rol if current_user else "ADMINISTRADOR",
        commit=True
    )

    return maestro


@router.get("/ordenes", response_model=List[TrabajoMaestroResponse])
def list_ordenes_maestros(
    ubicacion_id: Optional[int] = Query(None),
    maestro_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """List mason work orders linked to property dossiers."""
    query = db.query(DerechosMaestros).join(DerechosMaestros.ubicacion)
    if ubicacion_id:
        query = query.filter(DerechosMaestros.ubicacion_id == ubicacion_id)
    if maestro_id:
        query = query.filter(DerechosMaestros.maestro_id == maestro_id)

    records = query.order_by(DerechosMaestros.fecha_orden.desc()).limit(limit).all()
    results = []
    for r in records:
        results.append(TrabajoMaestroResponse(
            id=r.id,
            orden_ingreso=r.orden_ingreso,
            maestro_id=r.maestro_id,
            maestro_nombre=r.maestro.nombre_completo if r.maestro else "No asignado",
            ubicacion_id=r.ubicacion_id,
            codigo_ubicacion=r.ubicacion.codigo_completo,
            fecha_orden=r.fecha_orden.isoformat(),
            tipo_trabajo=r.tipo_trabajo,
            observaciones=r.observaciones
        ))
    return results


@router.post("/ordenes", response_model=TrabajoMaestroResponse, status_code=status.HTTP_201_CREATED)
def create_orden_maestro(
    req: TrabajoMaestroCreate,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Registers a mason work order (tombstone placement, repair, maintenance).
    Links to income order number (orden_de_ingreso) and appends to property historical dossier.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == req.ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación de sepultura no encontrada.")

    maestro = db.query(Maestro).filter(Maestro.id == req.maestro_id).first()
    if not maestro:
        raise HTTPException(status_code=404, detail="Maestro de obras no encontrado.")

    trabajo = DerechosMaestros(
        orden_ingreso=req.orden_ingreso.strip().upper(),
        maestro_id=maestro.id,
        rut_maestro_legacy=maestro.rut,
        ubicacion_id=ubic.id,
        fecha_orden=req.fecha_orden,
        tipo_trabajo=req.tipo_trabajo,
        observaciones=req.observaciones
    )
    db.add(trabajo)
    db.commit()
    db.refresh(trabajo)

    AuditService.log_mutation(
        session=db,
        modulo="MAESTROS",
        accion="REGISTRAR_ORDEN_TRABAJO",
        entidad="core.tb_derechos_maestros",
        registro_id=str(trabajo.id),
        payload_posterior={
            "orden_ingreso": trabajo.orden_ingreso,
            "maestro": maestro.nombre_completo,
            "ubicacion": ubic.codigo_completo,
            "tipo_trabajo": trabajo.tipo_trabajo
        },
        user_id=current_user.id if current_user else 1,
        username=current_user.username if current_user else "SISTEMA",
        user_rut=current_user.rut if current_user else "11111111-1",
        user_role=current_user.rol if current_user else "ADMINISTRADOR",
        commit=True
    )

    return TrabajoMaestroResponse(
        id=trabajo.id,
        orden_ingreso=trabajo.orden_ingreso,
        maestro_id=maestro.id,
        maestro_nombre=maestro.nombre_completo,
        ubicacion_id=ubic.id,
        codigo_ubicacion=ubic.codigo_completo,
        fecha_orden=trabajo.fecha_orden.isoformat(),
        tipo_trabajo=trabajo.tipo_trabajo,
        observaciones=trabajo.observaciones
    )
