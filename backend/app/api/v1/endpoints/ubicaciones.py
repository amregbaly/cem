from datetime import date
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.infrastructure.db.session import get_db
from app.domain.models import Ubicacion, Cementerio, Inhumacion, Derecho, Exhumacion, DerechosMaestros, Usuario, RolUsuario, EstadoUbicacion, Reserva

from app.domain.schemas.ubicacion import UbicacionResponse, UbicacionCreate
from app.domain.schemas.spatial import SectorSummaryResponse, MapGridResponse, MapSlotResponse
from app.api.deps import require_role, get_current_user_optional, get_current_user
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()


@router.get("/mapa/sectores", response_model=List[SectorSummaryResponse])
def get_map_sectors(
    cementerio_id: Optional[int] = Query(None, description="Optional cemetery ID filter"),
    db: Session = Depends(get_db)
):
    """
    Returns spatial sectors summary with occupancy statistics for San Carlos and Cachapoal.
    Powers the GIS visualizer sector switcher.
    """
    query = db.query(Ubicacion.cementerio_id, Ubicacion.sector_codigo, Ubicacion.tipo_ubicacion).distinct()
    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)

    distinct_sectors = query.all()
    summaries = []

    # Human readable sector names
    SECTOR_NAMES = {
        "PAB-A": "Pabellón A (Nichos Central)",
        "PAB-B": "Pabellón B (Nichos Norte)",
        "PAB-C": "Pabellón C (Cachapoal)",
        "PAT-01": "Patio 1 (Sepulturas en Tierra)",
        "PAT-02": "Patio 2 (San Carlos Sur)",
        "PAT-R": "Patio Rural (Cachapoal)",
        "BOV-01": "Bóvedas Familiares",
        "SP4-01": "Mausoleos & Sepulturas en Altura",
        "PCO-01": "Patio Común"
    }

    cemetery_cache = {c.id: c.nombre for c in db.query(Cementerio).all()}

    for cem_id, sec_code, tipo_ub in distinct_sectors:
        locs = db.query(Ubicacion).filter(
            Ubicacion.cementerio_id == cem_id,
            Ubicacion.sector_codigo == sec_code
        ).all()

        total = len(locs)
        if total == 0:
            continue

        disponibles = 0
        ocupados = 0
        vencidos = 0
        reservados = 0
        bloqueados = 0
        max_x = 0
        max_y = 0

        for loc in locs:
            st = loc.color_status
            if st == "DISPONIBLE":
                disponibles += 1
            elif st == "OCUPADO":
                ocupados += 1
            elif st == "ARRIENDO_VENCIDO":
                vencidos += 1
            elif st == "RESERVADO":
                reservados += 1
            elif st == "BLOQUEADO":
                bloqueados += 1

            if loc.grid_x and loc.grid_x > max_x:
                max_x = loc.grid_x
            if loc.grid_y and loc.grid_y > max_y:
                max_y = loc.grid_y

        cols = max_x if max_x > 0 else max(8, int(total ** 0.5) + 2)
        rows = max_y if max_y > 0 else (total + cols - 1) // cols

        summaries.append(SectorSummaryResponse(
            cemetery_id=cem_id,
            cemetery_name=cemetery_cache.get(cem_id, f"Cementerio {cem_id}"),
            sector_codigo=sec_code,
            sector_nombre=SECTOR_NAMES.get(sec_code, f"Sector {sec_code}"),
            tipo_ubicacion=tipo_ub,
            total_slots=total,
            slots_disponibles=disponibles,
            slots_ocupados=ocupados,
            slots_arriendo_vencido=vencidos,
            slots_reservados=reservados,
            slots_bloqueados=bloqueados,
            grid_cols=cols,
            grid_rows=rows
        ))

    return sorted(summaries, key=lambda s: (s.cemetery_id, s.sector_codigo))


@router.get("/mapa/cuadricula", response_model=MapGridResponse)
def get_map_grid(
    cementerio_id: int = Query(..., description="Cemetery ID"),
    sector_codigo: Optional[str] = Query(None, description="Sector Code (e.g. PAB-A, PAT-01)"),
    estado_filtro: Optional[str] = Query(None, description="Optional status filter"),
    db: Session = Depends(get_db)
):
    """
    Returns visual grid slots for the CemeteryMap GIS canvas.
    Computes real-time color_status, occupant details, and lease countdowns.
    """
    cemetery = db.query(Cementerio).filter(Cementerio.id == cementerio_id).first()
    if not cemetery:
        raise HTTPException(status_code=404, detail="Cementerio no encontrado")

    if not sector_codigo:
        first_sec = db.query(Ubicacion.sector_codigo).filter(
            Ubicacion.cementerio_id == cementerio_id
        ).first()
        if not first_sec:
            raise HTTPException(status_code=404, detail="No se encontraron sectores para este cementerio")
        sector_codigo = first_sec[0]

    query = db.query(Ubicacion).filter(
        Ubicacion.cementerio_id == cementerio_id,
        Ubicacion.sector_codigo == sector_codigo.upper()
    )

    all_locs = query.order_by(Ubicacion.fila.asc(), Ubicacion.numero.asc()).all()
    if not all_locs:
        raise HTTPException(status_code=404, detail=f"No se encontraron sepulturas en el sector {sector_codigo}")

    slots: List[MapSlotResponse] = []
    max_x = 0
    max_y = 0

    idx = 0
    for loc in all_locs:
        c_status = loc.color_status
        if estado_filtro and c_status != estado_filtro.upper():
            continue

        # Grid coordinate fallback if not explicitly assigned
        col_calc = loc.grid_x if loc.grid_x is not None else ((idx % 12) + 1)
        row_calc = loc.grid_y if loc.grid_y is not None else ((idx // 12) + 1)
        idx += 1

        if col_calc > max_x:
            max_x = col_calc
        if row_calc > max_y:
            max_y = row_calc

        # Primary occupant details
        primary_occupant = None
        rut_occupant = None
        if loc.inhumaciones and len(loc.inhumaciones) > 0:
            active_inh = loc.inhumaciones[-1]
            primary_occupant = active_inh.fallecido.nombre_completo
            rut_occupant = active_inh.fallecido.rut

        # Primary titleholder and lease countdown
        titular = None
        rut_tit = None
        f_venc = None
        dias_venc = None
        if loc.derechos and len(loc.derechos) > 0:
            der = loc.derechos[-1]
            titular = der.titular.nombre_completo if der.titular else None
            rut_tit = der.titular.rut if der.titular else None
            if der.fecha_vencimiento:
                f_venc = der.fecha_vencimiento.isoformat()
                dias_venc = der.dias_para_vencer()

        slots.append(MapSlotResponse(
            id=loc.id,
            cementerio_id=loc.cementerio_id,
            codigo_completo=loc.codigo_completo,
            sector_codigo=loc.sector_codigo,
            fila=loc.fila,
            numero=loc.numero,
            tipo_ubicacion=loc.tipo_ubicacion,
            estado=loc.estado,
            color_status=c_status,
            grid_x=col_calc,
            grid_y=row_calc,
            capacidad_total=loc.capacidad_total,
            capacidad_ocupada=loc.capacidad_ocupada,
            ocupante_principal=primary_occupant,
            rut_ocupante=rut_occupant,
            titular_nombre=titular,
            rut_titular=rut_tit,
            fecha_vencimiento=f_venc,
            dias_para_vencer=dias_venc
        ))

    SECTOR_NAMES = {
        "PAB-A": "Pabellón A (Nichos Central)",
        "PAB-B": "Pabellón B (Nichos Norte)",
        "PAB-C": "Pabellón C (Cachapoal)",
        "PAT-01": "Patio 1 (Sepulturas en Tierra)",
        "PAT-02": "Patio 2 (San Carlos Sur)",
        "PAT-R": "Patio Rural (Cachapoal)",
        "BOV-01": "Bóvedas Familiares",
        "SP4-01": "Mausoleos & Sepulturas en Altura",
        "PCO-01": "Patio Común"
    }

    return MapGridResponse(
        cemetery_id=cemetery.id,
        cemetery_name=cemetery.nombre,
        sector_codigo=sector_codigo.upper(),
        sector_nombre=SECTOR_NAMES.get(sector_codigo.upper(), f"Sector {sector_codigo}"),
        grid_cols=max(max_x, 12),
        grid_rows=max(max_y, 4),
        total_slots=len(slots),
        slots=slots
    )


@router.get("", response_model=List[UbicacionResponse])
def list_ubicaciones(
    cementerio_id: Optional[int] = Query(None),
    tipo_ubicacion: Optional[str] = Query(None),
    sector_codigo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List cemetery locations with optional filters."""
    query = db.query(Ubicacion)
    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)
    if tipo_ubicacion:
        query = query.filter(Ubicacion.tipo_ubicacion == tipo_ubicacion.upper())
    if sector_codigo:
        query = query.filter(Ubicacion.sector_codigo == sector_codigo.upper())
    if estado:
        query = query.filter(Ubicacion.estado == estado.upper())

    return query.order_by(Ubicacion.id.asc()).offset(offset).limit(limit).all()


@router.get("/{ubicacion_id}")
def get_ubicacion_detalle(
    ubicacion_id: int,
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Returns full location record and property dossier (Ficha completa de propiedad - EETT P220)
    including inhumations, rights, and work orders.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")

    # Hide confidential cause of death if visitor / unauthenticated
    is_admin_or_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}

    inhumaciones_list = []
    for inh in ubic.inhumaciones:
        inhumaciones_list.append({
            "id": inh.id,
            "numero_ingreso": inh.numero_ingreso,
            "fallecido": inh.fallecido.nombre_completo,
            "rut": inh.fallecido.rut,
            "fecha_defuncion": inh.fecha_defuncion.isoformat() if inh.fecha_defuncion else None,
            "fecha_sepultacion": inh.fecha_sepultacion.isoformat() if inh.fecha_sepultacion else None,
            "causa_fallecimiento": inh.causa_fallecimiento if is_admin_or_staff else "[CONFIDENCIAL]"
        })

    derechos_list = []
    for der in ubic.derechos:
        derechos_list.append({
            "id": der.id,
            "tipo_derecho": der.tipo_derecho,
            "periodo_arriendo": der.periodo_arriendo,
            "titular": der.titular.nombre_completo,
            "rut_titular": der.titular.rut if is_admin_or_staff else "[CONFIDENCIAL LEY 21.719]",
            "telefono_titular": der.titular.telefono if is_admin_or_staff else "[CONFIDENCIAL]",
            "direccion_titular": der.titular.direccion if is_admin_or_staff else "[CONFIDENCIAL]",
            "fecha_inicio": der.fecha_inicio.isoformat() if der.fecha_inicio else None,
            "fecha_vencimiento": der.fecha_vencimiento.isoformat() if der.fecha_vencimiento else None,
            "estado": der.estado,
            "dias_para_vencer": der.dias_para_vencer()
        })

    maestros_list = []
    for m in ubic.trabajos_maestros:
        maestros_list.append({
            "id": m.id,
            "orden_ingreso": m.orden_ingreso,
            "fecha_orden": m.fecha_orden.isoformat() if m.fecha_orden else None,
            "tipo_trabajo": m.tipo_trabajo,
            "observaciones": m.observaciones
        })

    return {
        "id": ubic.id,
        "cementerio": ubic.cementerio.nombre,
        "tipo_ubicacion": ubic.tipo_ubicacion,
        "sector_codigo": ubic.sector_codigo,
        "fila": ubic.fila,
        "numero": ubic.numero,
        "codigo_completo": ubic.codigo_completo,
        "capacidad_total": ubic.capacidad_total,
        "capacidad_ocupada": ubic.capacidad_ocupada,
        "estado": ubic.estado,
        "color_status": ubic.color_status,
        "observaciones": ubic.observaciones,
        "inhumaciones": inhumaciones_list,
        "derechos": derechos_list,
        "trabajos_maestros": maestros_list
    }


@router.get("/{ubicacion_id}/historial")
def get_ubicacion_historial(
    ubicacion_id: int,
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Returns consolidated chronological timeline and complete dossier for the property slide-over drawer.
    Includes active & historical occupants, exhumations, rights/leases, and masonry orders.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")

    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    timeline = []

    # 1. Inhumations
    for inh in ubic.inhumaciones:
        timeline.append({
            "tipo_evento": "INHUMACION",
            "titulo": f"Inhumación: {inh.fallecido.nombre_completo}",
            "fecha": inh.fecha_sepultacion.isoformat() if inh.fecha_sepultacion else None,
            "folio_documento": inh.numero_ingreso,
            "detalles": {
                "fallecido": inh.fallecido.nombre_completo,
                "rut": inh.fallecido.rut,
                "fecha_defuncion": inh.fecha_defuncion.isoformat() if inh.fecha_defuncion else None,
                "causa_fallecimiento": inh.causa_fallecimiento if is_staff else "[CONFIDENCIAL LEY 20.584]",
                "reduccion": inh.reduccion,
                "folio_licencia": inh.pase_sepultacion_folio
            }
        })

    # 2. Exhumations (Origen)
    for exh in ubic.exhumaciones_origen:
        timeline.append({
            "tipo_evento": "EXHUMACION",
            "titulo": f"Exhumación/Traslado desde esta sepultura hacia {exh.ubicacion_destino.codigo_completo if exh.ubicacion_destino else (exh.destino_externo or 'Destino externo')}",
            "fecha": exh.fecha_exhumacion.isoformat() if exh.fecha_exhumacion else None,
            "folio_documento": exh.resolucion_numero,
            "detalles": {
                "fallecido": exh.inhumacion.fallecido.nombre_completo if exh.inhumacion and exh.inhumacion.fallecido else None,
                "motivo": exh.motivo,
                "decreto": exh.resolucion_numero,
                "destino": exh.ubicacion_destino.codigo_completo if exh.ubicacion_destino else exh.destino_externo,
                "observaciones": exh.observaciones
            }
        })

    # 2.1 Exhumations (Destino / Recepción por Traslado)
    for exh in ubic.exhumaciones_destino:
        timeline.append({
            "tipo_evento": "TRASLADO_RECEPCION",
            "titulo": f"Recepción por Traslado desde {exh.ubicacion_origen.codigo_completo}",
            "fecha": exh.fecha_exhumacion.isoformat() if exh.fecha_exhumacion else None,
            "folio_documento": exh.resolucion_numero,
            "detalles": {
                "fallecido": exh.inhumacion.fallecido.nombre_completo if exh.inhumacion and exh.inhumacion.fallecido else None,
                "motivo": exh.motivo,
                "decreto": exh.resolucion_numero,
                "ubicacion_origen": exh.ubicacion_origen.codigo_completo,
                "observaciones": exh.observaciones
            }
        })

    # 3. Rights / Leases
    for der in ubic.derechos:
        timeline.append({
            "tipo_evento": "DERECHO_CONCESION",
            "titulo": f"Concesión {der.tipo_derecho} ({der.periodo_arriendo})",
            "fecha": der.fecha_inicio.isoformat() if der.fecha_inicio else None,
            "folio_documento": der.folio_recibo or f"DER-{der.id}",
            "detalles": {
                "titular": der.titular.nombre_completo,
                "rut_titular": der.titular.rut if is_staff else "[CONFIDENCIAL LEY 21.719]",
                "telefono_titular": der.titular.telefono if is_staff else "[CONFIDENCIAL]",
                "direccion_titular": der.titular.direccion if is_staff else "[CONFIDENCIAL]",
                "estado": der.estado,
                "fecha_inicio": der.fecha_inicio.isoformat() if der.fecha_inicio else None,
                "fecha_vencimiento": der.fecha_vencimiento.isoformat() if der.fecha_vencimiento else None,
                "dias_para_vencer": der.dias_para_vencer(),
                "monto_pagado": float(der.monto_pagado) if der.monto_pagado else 0.0
            }
        })

        # 3.1 Ownership transfers
        for tr in der.transferencias:
            timeline.append({
                "tipo_evento": "TRANSFERENCIA_DOMINIO",
                "titulo": f"Traspaso de Dominio: {tr.titular_anterior.nombre_completo if tr.titular_anterior else 'Titular Anterior'} → {tr.titular_nuevo.nombre_completo if tr.titular_nuevo else 'Nuevo Titular'}",
                "fecha": tr.fecha_transferencia.isoformat() if tr.fecha_transferencia else None,
                "folio_documento": tr.numero_resolucion or tr.orden_ingreso or f"TRF-{tr.id}",
                "detalles": {
                    "titular_anterior": tr.titular_anterior.nombre_completo if tr.titular_anterior else None,
                    "rut_anterior": tr.titular_anterior.rut if (tr.titular_anterior and is_staff) else "[CONFIDENCIAL LEY 21.719]",
                    "titular_nuevo": tr.titular_nuevo.nombre_completo if tr.titular_nuevo else None,
                    "rut_nuevo": tr.titular_nuevo.rut if (tr.titular_nuevo and is_staff) else "[CONFIDENCIAL LEY 21.719]",
                    "numero_resolucion": tr.numero_resolucion,
                    "orden_ingreso": tr.orden_ingreso,
                    "documento_respaldo_url": tr.documento_respaldo_url,
                    "motivo": tr.motivo,
                    "observaciones": tr.observaciones
                }
            })

    # 4. Masonry works
    for m in ubic.trabajos_maestros:
        timeline.append({
            "tipo_evento": "TRABAJO_MAESTRO",
            "titulo": f"Obra de Albañilería: {m.tipo_trabajo}",
            "fecha": m.fecha_orden.isoformat() if m.fecha_orden else None,
            "folio_documento": m.orden_ingreso,
            "detalles": {
                "tipo_trabajo": m.tipo_trabajo,
                "maestro": m.maestro.nombre_completo if m.maestro else "No asignado",
                "observaciones": m.observaciones
            }
        })

    # 5. Reservations (EETT 3.11 & A2-13)
    reservas = db.query(Reserva).filter(Reserva.ubicacion_id == ubic.id).all()
    for res in reservas:
        timeline.append({
            "tipo_evento": "RESERVA",
            "titulo": f"Reserva de Ubicación: {res.solicitante_nombre} ({res.estado})",
            "fecha": res.fecha_reserva.isoformat() if res.fecha_reserva else None,
            "folio_documento": f"RES-{res.id}",
            "detalles": {
                "solicitante": res.solicitante_nombre,
                "rut_solicitante": res.solicitante_rut if is_staff else "[CONFIDENCIAL LEY 21.719]",
                "telefono_solicitante": res.solicitante_telefono if is_staff else "[CONFIDENCIAL]",
                "fecha_vencimiento": res.fecha_vencimiento.isoformat() if res.fecha_vencimiento else None,
                "estado": res.estado,
                "resolucion_liberacion": res.resolucion_liberacion,
                "motivo_liberacion": res.motivo_liberacion,
                "fecha_liberacion": res.fecha_liberacion.isoformat() if res.fecha_liberacion else None,
                "documento_respaldo_url": res.documento_respaldo_url,
                "observaciones": res.observaciones
            }
        })

    # Sort timeline in reverse chronological order
    timeline.sort(key=lambda x: x["fecha"] or "1900-01-01", reverse=True)

    # Active titleholder calculation
    titular_actual = None
    if ubic.derechos:
        latest_der = ubic.derechos[-1]
        titular_actual = {
            "nombre": latest_der.titular.nombre_completo,
            "rut": latest_der.titular.rut if is_staff else "[CONFIDENCIAL LEY 21.719]",
            "telefono": latest_der.titular.telefono if is_staff else "[CONFIDENCIAL]",
            "direccion": latest_der.titular.direccion if is_staff else "[CONFIDENCIAL]",
            "tipo": latest_der.tipo_derecho,
            "periodo": latest_der.periodo_arriendo,
            "fecha_vencimiento": latest_der.fecha_vencimiento.isoformat() if latest_der.fecha_vencimiento else None,
            "dias_restantes": latest_der.dias_para_vencer(),
            "estado": latest_der.estado
        }

    # Historical owners list across all rights and transfers
    titulares_historicos = []
    for der in ubic.derechos:
        for tr in der.transferencias:
            titulares_historicos.append({
                "titular_anterior_id": tr.titular_anterior_id,
                "titular_anterior_nombre": tr.titular_anterior.nombre_completo if tr.titular_anterior else None,
                "titular_anterior_rut": tr.titular_anterior.rut if (tr.titular_anterior and is_staff) else "[CONFIDENCIAL LEY 21.719]",
                "titular_nuevo_id": tr.titular_nuevo_id,
                "titular_nuevo_nombre": tr.titular_nuevo.nombre_completo if tr.titular_nuevo else None,
                "fecha_traspaso": tr.fecha_transferencia.isoformat(),
                "documento_respaldo_url": tr.documento_respaldo_url,
                "numero_resolucion": tr.numero_resolucion
            })

    return {
        "ubicacion": {
            "id": ubic.id,
            "cementerio": ubic.cementerio.nombre,
            "cementerio_id": ubic.cementerio_id,
            "codigo_completo": ubic.codigo_completo,
            "tipo_ubicacion": ubic.tipo_ubicacion,
            "sector_codigo": ubic.sector_codigo,
            "fila": ubic.fila,
            "numero": ubic.numero,
            "estado": ubic.estado,
            "color_status": ubic.color_status,
            "capacidad_total": ubic.capacidad_total,
            "capacidad_ocupada": ubic.capacidad_ocupada,
            "activo": ubic.activo,
            "motivo_deshabilitacion": ubic.motivo_deshabilitacion,
            "grid_x": ubic.grid_x,
            "grid_y": ubic.grid_y
        },
        "titular_actual": titular_actual,
        "titulares_historicos": titulares_historicos,
        "timeline": timeline,
        "total_eventos": len(timeline)
    }



@router.post("", response_model=UbicacionResponse, status_code=status.HTTP_201_CREATED)
def create_ubicacion(
    ubic_in: UbicacionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """Create a new location."""
    ubic = Ubicacion(
        cementerio_id=ubic_in.cementerio_id,
        tipo_ubicacion=ubic_in.tipo_ubicacion.upper(),
        sector_codigo=ubic_in.sector_codigo.upper(),
        fila=ubic_in.fila,
        numero=ubic_in.numero,
        capacidad_total=ubic_in.capacidad_total,
        capacidad_ocupada=0,
        estado="DISPONIBLE",
        observaciones=ubic_in.observaciones
    )
    db.add(ubic)
    db.commit()
    db.refresh(ubic)

    AuditService.log_mutation(
        session=db,
        modulo="UBICACIONES",
        accion="CREAR_UBICACION",
        entidad="core.tb_ubicacion",
        registro_id=str(ubic.id),
        payload_posterior=ubic.to_dict(),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return ubic


class DeshabilitarUbicacionRequest(BaseModel):
    motivo: str
    observaciones: Optional[str] = None


@router.patch("/{ubicacion_id}/deshabilitar")
def deshabilitar_ubicacion(
    ubicacion_id: int,
    req: DeshabilitarUbicacionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Logically disables a location (EETT 3.1 & A2-01).
    Does NOT physically delete rows. The entire history remains intact and visible.
    Requires a mandatory justification reason.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")

    ubic.activo = False
    ubic.estado = EstadoUbicacion.BLOQUEADO.value
    ubic.motivo_deshabilitacion = req.motivo
    if req.observaciones:
        ubic.observaciones = f"{ubic.observaciones or ''} | [DESHABILITADO {date.today()}]: {req.observaciones}".strip(" |")

    AuditService.log_mutation(
        session=db,
        modulo="UBICACIONES",
        accion="DESHABILITAR_UBICACION",
        entidad="core.tb_ubicacion",
        registro_id=str(ubic.id),
        payload_posterior={
            "id": ubic.id,
            "codigo_completo": ubic.codigo_completo,
            "activo": False,
            "estado": ubic.estado,
            "motivo": req.motivo,
            "observaciones": req.observaciones
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {
        "success": True,
        "message": f"Ubicación {ubic.codigo_completo} deshabilitada correctamente. El historial se conserva intacto.",
        "ubicacion": ubic.to_dict()
    }


@router.patch("/{ubicacion_id}/habilitar")
def habilitar_ubicacion(
    ubicacion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Re-enables a previously disabled location (EETT 3.1).
    Restores active status and recalculates state based on occupancy.
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")

    ubic.activo = True
    ubic.motivo_deshabilitacion = None
    if ubic.capacidad_ocupada >= ubic.capacidad_total:
        ubic.estado = EstadoUbicacion.OCUPADO.value
    else:
        ubic.estado = EstadoUbicacion.DISPONIBLE.value

    ubic.observaciones = f"{ubic.observaciones or ''} | [REHABILITADO {date.today()}]".strip(" |")

    AuditService.log_mutation(
        session=db,
        modulo="UBICACIONES",
        accion="HABILITAR_UBICACION",
        entidad="core.tb_ubicacion",
        registro_id=str(ubic.id),
        payload_posterior={
            "id": ubic.id,
            "codigo_completo": ubic.codigo_completo,
            "activo": True,
            "estado": ubic.estado
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {
        "success": True,
        "message": f"Ubicación {ubic.codigo_completo} rehabilitada exitosamente.",
        "ubicacion": ubic.to_dict()
    }


