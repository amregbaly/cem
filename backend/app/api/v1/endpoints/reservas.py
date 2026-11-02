from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Ubicacion, Usuario, RolUsuario, Inhumacion, Derecho, EstadoDerecho
from app.domain.models.reserva import Reserva, EstadoReserva
from app.domain.schemas.reserva import ReservaCreate, ReservaLiberarRequest, ReservaResponse
from app.api.deps import require_role
from app.infrastructure.db.audit_listener import AuditService
from etl.rut_validator import validate_and_format_rut

router = APIRouter()


@router.get("", response_model=List[ReservaResponse])
def list_reservas(
    cementerio_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    List reservations with optional filters (EETT 3.11 & A2-13).
    Only authorized staff can inspect reservation records and applicant contact details.
    """
    query = db.query(Reserva).join(Reserva.ubicacion)

    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)
    if estado:
        query = query.filter(Reserva.estado == estado)
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter(
            (Reserva.solicitante_nombre.ilike(pat)) |
            (Reserva.solicitante_rut.ilike(pat))
        )

    reservas = query.order_by(Reserva.fecha_vencimiento.asc()).all()

    today = date.today()
    response = []
    for r in reservas:
        # Check if expired while in VIGENTE state
        dias = (r.fecha_vencimiento - today).days if r.fecha_vencimiento else None
        estado_disp = r.estado
        if r.estado == EstadoReserva.VIGENTE.value and r.fecha_vencimiento < today:
            estado_disp = EstadoReserva.VENCIDA.value

        response.append(ReservaResponse(
            id=r.id,
            ubicacion_id=r.ubicacion_id,
            ubicacion_codigo=r.ubicacion.codigo_completo if r.ubicacion else None,
            solicitante_nombre=r.solicitante_nombre,
            solicitante_rut=r.solicitante_rut,
            solicitante_telefono=r.solicitante_telefono,
            solicitante_direccion=r.solicitante_direccion,
            fecha_reserva=r.fecha_reserva,
            fecha_vencimiento=r.fecha_vencimiento,
            estado=estado_disp,
            dias_para_vencer=dias,
            documento_respaldo_url=r.documento_respaldo_url,
            observaciones=r.observaciones,
            resolucion_liberacion=r.resolucion_liberacion,
            motivo_liberacion=r.motivo_liberacion,
            fecha_liberacion=r.fecha_liberacion
        ))

    return response


@router.post("", response_model=ReservaResponse, status_code=status.HTTP_201_CREATED)
def create_reserva(
    req: ReservaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Create a new location reservation (EETT 3.11 & Annex 2 Row 13 / A2-13).
    Rules:
    - Location must exist.
    - Location must NOT have active burials or active leases.
    - Location must be in DISPONIBLE state and activo=True.
    - Expiry date must be >= reservation date.
    - Sets location state to RESERVADO.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == req.ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")

    if not ubic.activo:
        raise HTTPException(status_code=400, detail="No se puede reservar una ubicación deshabilitada.")

    # Rule: Never available while an active burial or lease exists
    active_burial = db.query(Inhumacion).filter(Inhumacion.ubicacion_id == ubic.id).first()
    if active_burial or ubic.capacidad_ocupada > 0:
        raise HTTPException(
            status_code=400,
            detail="Transición inválida: La ubicación posee sepultaciones activas y no puede ser reservada."
        )

    active_lease = db.query(Derecho).filter(
        Derecho.ubicacion_id == ubic.id,
        Derecho.estado == EstadoDerecho.VIGENTE.value
    ).first()
    if active_lease:
        raise HTTPException(
            status_code=400,
            detail="Transición inválida: La ubicación posee un derecho/arriendo vigente y no puede ser reservada."
        )

    # Check existing active reservation
    existing_res = db.query(Reserva).filter(
        Reserva.ubicacion_id == ubic.id,
        Reserva.estado.in_([EstadoReserva.VIGENTE.value, EstadoReserva.VENCIDA.value])
    ).first()
    if existing_res:
        raise HTTPException(
            status_code=400,
            detail=f"La ubicación ya cuenta con una reserva activa (Folio #{existing_res.id})."
        )

    f_reserva = req.fecha_reserva or date.today()
    if req.fecha_vencimiento < f_reserva:
        raise HTTPException(
            status_code=400,
            detail="La fecha de vencimiento de la reserva no puede ser anterior a la fecha de inicio."
        )

    # Normalize applicant RUT if provided
    formatted_rut = req.solicitante_rut
    if req.solicitante_rut:
        is_valid, clean_r, _, _ = validate_and_format_rut(req.solicitante_rut)
        if is_valid:
            formatted_rut = clean_r

    reserva = Reserva(
        ubicacion_id=ubic.id,
        solicitante_nombre=req.solicitante_nombre.strip(),
        solicitante_rut=formatted_rut,
        solicitante_telefono=req.solicitante_telefono,
        solicitante_direccion=req.solicitante_direccion,
        fecha_reserva=f_reserva,
        fecha_vencimiento=req.fecha_vencimiento,
        estado=EstadoReserva.VIGENTE.value,
        documento_respaldo_url=req.documento_respaldo_url,
        observaciones=req.observaciones
    )
    db.add(reserva)

    # Transition location state to RESERVADO
    ubic.estado = "RESERVADO"

    AuditService.log_mutation(
        session=db,
        modulo="RESERVAS",
        accion="CREAR_RESERVA",
        entidad="core.tb_reserva",
        registro_id=str(ubic.id),
        payload_posterior={
            "ubicacion_id": ubic.id,
            "ubicacion_codigo": ubic.codigo_completo,
            "solicitante": req.solicitante_nombre,
            "solicitante_rut": formatted_rut,
            "fecha_vencimiento": req.fecha_vencimiento.isoformat()
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    db.refresh(reserva)
    return ReservaResponse(
        id=reserva.id,
        ubicacion_id=reserva.ubicacion_id,
        ubicacion_codigo=ubic.codigo_completo,
        solicitante_nombre=reserva.solicitante_nombre,
        solicitante_rut=reserva.solicitante_rut,
        solicitante_telefono=reserva.solicitante_telefono,
        solicitante_direccion=reserva.solicitante_direccion,
        fecha_reserva=reserva.fecha_reserva,
        fecha_vencimiento=reserva.fecha_vencimiento,
        estado=reserva.estado,
        dias_para_vencer=(reserva.fecha_vencimiento - date.today()).days,
        documento_respaldo_url=reserva.documento_respaldo_url,
        observaciones=reserva.observaciones
    )


@router.post("/{reserva_id}/liberar", response_model=ReservaResponse)
def liberar_reserva_admin(
    reserva_id: int,
    req: ReservaLiberarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value))
):
    """
    Administrator Confirmation of Reservation Release (EETT 3.11 & A2-13).
    Requirement: On expiry (or administrative release), the location returns to 'DISPONIBLE'
    ONLY after Administrator confirmation with formal resolution and justification.
    """
    reserva = db.query(Reserva).filter(Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada.")

    if reserva.estado == EstadoReserva.LIBERADA.value:
        raise HTTPException(status_code=400, detail="La reserva ya se encuentra liberada.")

    if not req.resolucion_liberacion or not req.motivo_liberacion:
        raise HTTPException(
            status_code=400,
            detail="Debe proporcionar número de resolución/decreto alcaldicio y motivo para liberar la reserva."
        )

    ubic = db.query(Ubicacion).filter(Ubicacion.id == reserva.ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación vinculada no encontrada.")

    # 1. Update reservation state
    reserva.estado = EstadoReserva.LIBERADA.value
    reserva.resolucion_liberacion = req.resolucion_liberacion.strip()
    reserva.motivo_liberacion = req.motivo_liberacion.strip()
    reserva.fecha_liberacion = date.today()
    reserva.usuario_liberacion_id = current_user.id
    if req.observaciones:
        reserva.observaciones = f"{reserva.observaciones or ''} | [LIBERACIÓN]: {req.observaciones}".strip(" |")

    # 2. Return location to DISPONIBLE
    ubic.estado = "DISPONIBLE"

    AuditService.log_mutation(
        session=db,
        modulo="RESERVAS",
        accion="LIBERACION_CONFIRMADA_ADMIN",
        entidad="core.tb_reserva",
        registro_id=str(reserva.id),
        payload_posterior={
            "reserva_id": reserva.id,
            "ubicacion_id": ubic.id,
            "ubicacion_codigo": ubic.codigo_completo,
            "resolucion": req.resolucion_liberacion,
            "motivo": req.motivo_liberacion,
            "nuevo_estado_ubicacion": "DISPONIBLE"
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    db.refresh(reserva)
    return ReservaResponse(
        id=reserva.id,
        ubicacion_id=reserva.ubicacion_id,
        ubicacion_codigo=ubic.codigo_completo,
        solicitante_nombre=reserva.solicitante_nombre,
        solicitante_rut=reserva.solicitante_rut,
        solicitante_telefono=reserva.solicitante_telefono,
        solicitante_direccion=reserva.solicitante_direccion,
        fecha_reserva=reserva.fecha_reserva,
        fecha_vencimiento=reserva.fecha_vencimiento,
        estado=reserva.estado,
        dias_para_vencer=None,
        documento_respaldo_url=reserva.documento_respaldo_url,
        observaciones=reserva.observaciones,
        resolucion_liberacion=reserva.resolucion_liberacion,
        motivo_liberacion=reserva.motivo_liberacion,
        fecha_liberacion=reserva.fecha_liberacion
    )
