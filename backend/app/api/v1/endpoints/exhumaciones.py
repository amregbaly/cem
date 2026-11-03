from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Exhumacion, Inhumacion, Ubicacion, Persona, Usuario, RolUsuario, ModuloSistema
from app.domain.schemas.exhumacion import ExhumacionCreate, ExhumacionResponse
from app.api.deps import require_role, get_current_user_optional, get_current_user, require_module_access
from app.infrastructure.db.audit_listener import AuditService
from etl.rut_validator import validate_and_format_rut

router = APIRouter()


@router.get("", response_model=List[ExhumacionResponse])
def list_exhumaciones(
    cementerio_id: Optional[int] = Query(None),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    List exhumations and relocations.
    Ley 21.719: Mask contact phone of applicant for visitor profiles.
    """
    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    query = db.query(Exhumacion).join(Exhumacion.inhumacion).join(Inhumacion.fallecido)

    if cementerio_id:
        query = query.join(Exhumacion.ubicacion_origen).filter(Ubicacion.cementerio_id == cementerio_id)
    if desde:
        query = query.filter(Exhumacion.fecha_exhumacion >= desde)
    if hasta:
        query = query.filter(Exhumacion.fecha_exhumacion <= hasta)
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter(
            (Persona.nombre_completo.ilike(pat)) |
            (Persona.rut.ilike(pat)) |
            (Exhumacion.resolucion_numero.ilike(pat)) |
            (Exhumacion.motivo.ilike(pat))
        )

    results = query.order_by(Exhumacion.fecha_exhumacion.desc()).offset(offset).limit(limit).all()

    output = []
    for exh in results:
        fall = exh.inhumacion.fallecido
        orig = exh.ubicacion_origen
        dest = exh.ubicacion_destino
        sol = exh.familiar_solicitante

        output.append(ExhumacionResponse(
            id=exh.id,
            inhumacion_id=exh.inhumacion_id,
            fallecido_nombre=fall.nombre_completo,
            fallecido_rut=fall.rut,
            ubicacion_origen_id=orig.id,
            ubicacion_origen_codigo=orig.codigo_completo,
            ubicacion_destino_id=dest.id if dest else None,
            ubicacion_destino_codigo=dest.codigo_completo if dest else None,
            destino_externo=exh.destino_externo,
            fecha_exhumacion=exh.fecha_exhumacion,
            hora_exhumacion=exh.hora_exhumacion,
            resolucion_numero=exh.resolucion_numero,
            fecha_resolucion=exh.fecha_resolucion,
            solicitante_nombre=sol.nombre_completo if sol else None,
            solicitante_rut=sol.rut if sol else None,
            solicitante_telefono=(sol.telefono or sol.celular) if is_staff and sol else ("[PROTEGIDO LEY 21.719]" if sol else None),
            motivo=exh.motivo,
            libera_ubicacion_origen=exh.libera_ubicacion_origen,
            es_reduccion=exh.es_reduccion,
            observaciones=exh.observaciones
        ))
    return output


@router.post("", response_model=ExhumacionResponse, status_code=status.HTTP_201_CREATED)
def create_exhumacion(
    req: ExhumacionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.INHUMACIONES.value, "WRITE"))
):
    """
    Registers an exhumation and/or transfer (EETT 3.6 & Annex 2 Row 8 / A2-08).
    - Preserves complete chain linked to original burial.
    - Updates origin location capacity/status.
    - Updates destination location capacity/status (if internal transfer).
    - Exhumed person remains completely traceable and searchable with new status and location.
    """
    inh = db.query(Inhumacion).filter(Inhumacion.id == req.inhumacion_id).first()
    if not inh:
        raise HTTPException(status_code=404, detail="Inhumación original no encontrada.")

    ubic_origen = db.query(Ubicacion).filter(Ubicacion.id == inh.ubicacion_id).first()
    if not ubic_origen:
        raise HTTPException(status_code=404, detail="Ubicación de origen no encontrada.")

    ubic_destino = None
    if req.ubicacion_destino_id:
        ubic_destino = db.query(Ubicacion).filter(Ubicacion.id == req.ubicacion_destino_id).first()
    elif req.ubicacion_destino_codigo:
        clean_code = req.ubicacion_destino_codigo.strip().upper()
        c_query = db.query(Ubicacion)
        if req.cementerio_id:
            c_query = c_query.filter(Ubicacion.cementerio_id == req.cementerio_id)
        candidates = c_query.all()
        for c in candidates:
            if c.codigo_completo.upper() == clean_code:
                ubic_destino = c
                break

    if req.ubicacion_destino_id or req.ubicacion_destino_codigo:
        if not ubic_destino:
            raise HTTPException(
                status_code=404,
                detail=f"Ubicación de destino no encontrada (ID: {req.ubicacion_destino_id}, Código: '{req.ubicacion_destino_codigo}')."
            )
        if not req.es_reduccion and ubic_destino.capacidad_ocupada >= ubic_destino.capacidad_total:
            raise HTTPException(
                status_code=400,
                detail=f"Ubicación de destino sin capacidad ({ubic_destino.capacidad_ocupada}/{ubic_destino.capacidad_total})."
            )
    elif not req.destino_externo:
        raise HTTPException(
            status_code=400,
            detail="Debe indicar una ubicación de destino interna o especificar un destino externo (crematorio/otro cementerio)."
        )


    # Resolve or create applicant
    solicitante = None
    if req.solicitante_nombre:
        s_rut = None
        if req.solicitante_rut:
            is_v, fmt_rut, _, _ = validate_and_format_rut(req.solicitante_rut)
            s_rut = fmt_rut if is_v else req.solicitante_rut

        solicitante = Persona(
            nombre_completo=req.solicitante_nombre.strip().upper(),
            rut=s_rut,
            telefono=req.solicitante_telefono
        )
        db.add(solicitante)
        db.flush()

    # Create Exhumation record
    exh = Exhumacion(
        inhumacion_id=inh.id,
        ubicacion_origen_id=ubic_origen.id,
        ubicacion_destino_id=ubic_destino.id if ubic_destino else None,
        destino_externo=req.destino_externo,
        correlativo_memo=req.orden_ingreso_folio,
        fecha_exhumacion=req.fecha_exhumacion,
        hora_exhumacion=req.hora_exhumacion,
        resolucion_numero=req.resolucion_numero,
        fecha_resolucion=req.fecha_resolucion,
        familiar_solicitante_id=solicitante.id if solicitante else None,
        motivo=req.motivo,
        tipo_exhumacion_id=req.tipo_exhumacion_id,
        libera_ubicacion_origen=req.libera_ubicacion_origen,
        es_reduccion=req.es_reduccion,
        observaciones=req.observaciones
    )
    db.add(exh)

    # 1. Update Origin Location
    if req.libera_ubicacion_origen:
        ubic_origen.capacidad_ocupada = max(0, ubic_origen.capacidad_ocupada - 1)
        if ubic_origen.capacidad_ocupada == 0:
            ubic_origen.estado = "DISPONIBLE"

    # 2. Update Destination Location & Inhumation link
    if ubic_destino:
        ubic_destino.capacidad_ocupada += 1
        if ubic_destino.capacidad_ocupada >= ubic_destino.capacidad_total:
            ubic_destino.estado = "OCUPADO"
        # Update current active location on the original burial record
        inh.ubicacion_id = ubic_destino.id

    db.commit()
    db.refresh(exh)

    AuditService.log_mutation(
        session=db,
        modulo="EXHUMACIONES",
        accion="REGISTRAR_EXHUMACION_TRASLADO",
        entidad="core.tb_exhumacion",
        registro_id=str(exh.id),
        payload_posterior=exh.to_dict(),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    fall = inh.fallecido
    return ExhumacionResponse(
        id=exh.id,
        inhumacion_id=inh.id,
        fallecido_nombre=fall.nombre_completo,
        fallecido_rut=fall.rut,
        ubicacion_origen_id=ubic_origen.id,
        ubicacion_origen_codigo=ubic_origen.codigo_completo,
        ubicacion_destino_id=ubic_destino.id if ubic_destino else None,
        ubicacion_destino_codigo=ubic_destino.codigo_completo if ubic_destino else None,
        destino_externo=exh.destino_externo,
        fecha_exhumacion=exh.fecha_exhumacion,
        hora_exhumacion=exh.hora_exhumacion,
        resolucion_numero=exh.resolucion_numero,
        fecha_resolucion=exh.fecha_resolucion,
        solicitante_nombre=solicitante.nombre_completo if solicitante else None,
        solicitante_rut=solicitante.rut if solicitante else None,
        solicitante_telefono=solicitante.telefono if solicitante else None,
        motivo=exh.motivo,
        libera_ubicacion_origen=exh.libera_ubicacion_origen,
        es_reduccion=exh.es_reduccion,
        observaciones=exh.observaciones
    )
