from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Inhumacion, Ubicacion, Persona, Usuario, RolUsuario, ConfigPortal
from app.domain.schemas.inhumacion import InhumacionResponse, InhumacionCreate
from app.api.deps import require_role, get_current_user_optional, get_current_user
from app.infrastructure.db.audit_listener import AuditService
from etl.rut_validator import validate_and_format_rut
from etl.name_parser import parse_chilean_name

router = APIRouter()


@router.get("", response_model=List[InhumacionResponse])
def list_inhumaciones(
    q: Optional[str] = Query(None, description="Search by deceased name or RUT"),
    cementerio_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    List burials. 
    If visitor (unauthenticated), access is governed by portal configuration (admin toggle).
    Cause of death is masked for visitor/public profiles.
    """
    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    if not is_staff:
        portal_cfg = db.query(ConfigPortal).first()
        permitir = portal_cfg.permitir_lista_fallecidos if portal_cfg else False
        if not permitir:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El acceso público a la lista de fallecidos está deshabilitado por administración municipal. Los visitantes tienen acceso exclusivo a la verificación de certificados."
            )

    query = db.query(Inhumacion).join(Inhumacion.fallecido).join(Inhumacion.ubicacion)

    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            (Persona.nombre_completo.ilike(search_pattern)) |
            (Persona.rut.ilike(search_pattern)) |
            (Inhumacion.numero_ingreso.ilike(search_pattern))
        )

    results = query.order_by(Inhumacion.fecha_sepultacion.desc()).offset(offset).limit(limit).all()

    response = []
    for inh in results:
        response.append(InhumacionResponse(
            id=inh.id,
            ubicacion_id=inh.ubicacion_id,
            numero_ingreso=inh.numero_ingreso,
            nombre_fallecido=inh.fallecido.nombre_completo,
            rut_fallecido=inh.fallecido.rut,
            fecha_defuncion=inh.fecha_defuncion,
            fecha_sepultacion=inh.fecha_sepultacion,
            causa_fallecimiento=inh.causa_fallecimiento if is_staff else "[CONFIDENCIAL]",
            ubicacion_codigo=inh.ubicacion.codigo_completo,
            pase_sepultacion_folio=inh.pase_sepultacion_folio
        ))
    return response


@router.post("", response_model=InhumacionResponse, status_code=status.HTTP_201_CREATED)
def create_inhumacion(
    inh_in: InhumacionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Register a new burial.
    Validates:
    - Location exists and has capacity.
    - Burial date >= Death date.
    - Deceased RUT with Modulo 11 validation.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == inh_in.ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")

    if ubic.capacidad_ocupada >= ubic.capacidad_total:
        raise HTTPException(
            status_code=400,
            detail=f"Ubicación sin capacidad disponible ({ubic.capacidad_ocupada}/{ubic.capacidad_total})."
        )

    # Date validation: Burial date >= Death date
    if inh_in.fecha_defuncion and inh_in.fecha_sepultacion < inh_in.fecha_defuncion:
        raise HTTPException(
            status_code=400,
            detail="La fecha de sepultación debe ser igual o posterior a la fecha de defunción."
        )

    # RUT validation
    is_valid_rut, formatted_rut, cuerpo_num, dv_str = validate_and_format_rut(inh_in.rut)
    if inh_in.rut and not is_valid_rut:
        raise HTTPException(
            status_code=400,
            detail=f"RUT ingresado '{inh_in.rut}' no cumple con el algoritmo Módulo 11 chileno."
        )

    # Person resolution or creation
    name_info = parse_chilean_name(inh_in.nombres, inh_in.apellido_paterno, inh_in.apellido_materno)
    fallecido = Persona(
        rut=formatted_rut,
        rut_cuerpo=cuerpo_num,
        rut_dv=dv_str,
        rut_validado=is_valid_rut,
        nombres=name_info["nombres"],
        apellido_paterno=name_info["apellido_paterno"],
        apellido_materno=name_info["apellido_materno"],
        nombre_completo=name_info["nombre_completo"],
        es_nn=name_info["es_nn"]
    )
    db.add(fallecido)
    db.flush()

    inh = Inhumacion(
        ubicacion_id=ubic.id,
        fallecido_persona_id=fallecido.id,
        numero_ingreso=inh_in.numero_ingreso,
        fecha_defuncion=inh_in.fecha_defuncion,
        fecha_sepultacion=inh_in.fecha_sepultacion,
        causa_fallecimiento=inh_in.causa_fallecimiento,
        pase_sepultacion_folio=inh_in.pase_sepultacion_folio,
        observaciones=inh_in.observaciones
    )
    db.add(inh)

    # Update location occupancy
    ubic.capacidad_ocupada += 1
    if ubic.capacidad_ocupada >= ubic.capacidad_total:
        ubic.estado = "OCUPADO"

    db.commit()
    db.refresh(inh)

    AuditService.log_mutation(
        session=db,
        modulo="INHUMACIONES",
        accion="REGISTRAR_SEPULTACION",
        entidad="core.tb_inhumacion",
        registro_id=str(inh.id),
        payload_posterior=inh.to_dict(),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return InhumacionResponse(
        id=inh.id,
        ubicacion_id=inh.ubicacion_id,
        numero_ingreso=inh.numero_ingreso,
        nombre_fallecido=fallecido.nombre_completo,
        rut_fallecido=fallecido.rut,
        fecha_defuncion=inh.fecha_defuncion,
        fecha_sepultacion=inh.fecha_sepultacion,
        causa_fallecimiento=inh.causa_fallecimiento,
        ubicacion_codigo=ubic.codigo_completo,
        pase_sepultacion_folio=inh.pase_sepultacion_folio
    )
