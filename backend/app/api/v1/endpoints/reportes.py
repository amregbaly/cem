import csv
import io
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, case

from app.infrastructure.db.session import get_db
from app.domain.models import (
    Usuario, Inhumacion, Persona, Derecho, Ubicacion, Cementerio,
    Exhumacion, Maestro, DerechosMaestros, Certificado, Reserva, EstadoDerecho, EstadoUbicacion
)
from app.domain.models.grupo import ModuloSistema
from app.api.deps import require_module_access

router = APIRouter()


@router.get("/resumen")
def get_reportes_resumen(
    cementerio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    """
    Retorna indicadores clave (KPIs) consolidados para el dashboard de reportes municipales.
    """
    today = date.today()
    first_day_month = today.replace(day=1)
    first_day_year = today.replace(month=1, day=1)

    # 1. Inhumaciones
    inh_query = db.query(Inhumacion).join(Inhumacion.ubicacion)
    if cementerio_id:
        inh_query = inh_query.filter(Ubicacion.cementerio_id == cementerio_id)

    total_inhumaciones = inh_query.count()
    inh_mes = inh_query.filter(Inhumacion.fecha_sepultacion >= first_day_month).count()
    inh_ano = inh_query.filter(Inhumacion.fecha_sepultacion >= first_day_year).count()

    # 2. Capacidad y Ubicaciones
    ubi_query = db.query(Ubicacion)
    if cementerio_id:
        ubi_query = ubi_query.filter(Ubicacion.cementerio_id == cementerio_id)

    total_espacios = ubi_query.count()
    ocupados = ubi_query.filter(Ubicacion.estado == EstadoUbicacion.OCUPADO.value).count()
    disponibles = ubi_query.filter(Ubicacion.estado == EstadoUbicacion.DISPONIBLE.value).count()
    reservados = ubi_query.filter(Ubicacion.estado == EstadoUbicacion.RESERVADO.value).count()
    inactivos = ubi_query.filter(or_(Ubicacion.estado == EstadoUbicacion.BLOQUEADO.value, Ubicacion.activo == False)).count()
    tasa_ocupacion = round((ocupados / total_espacios * 100), 1) if total_espacios > 0 else 0.0

    # 3. Arriendos y Vencimientos
    der_query = db.query(Derecho).join(Derecho.ubicacion)
    if cementerio_id:
        der_query = der_query.filter(Ubicacion.cementerio_id == cementerio_id)

    vencidos = der_query.filter(
        Derecho.fecha_vencimiento != None,
        Derecho.fecha_vencimiento < today
    ).count()

    dias_30 = today + timedelta(days=30)
    dias_60 = today + timedelta(days=60)
    dias_90 = today + timedelta(days=90)

    por_vencer_30 = der_query.filter(
        Derecho.fecha_vencimiento != None,
        Derecho.fecha_vencimiento >= today,
        Derecho.fecha_vencimiento <= dias_30
    ).count()

    por_vencer_60 = der_query.filter(
        Derecho.fecha_vencimiento != None,
        Derecho.fecha_vencimiento > dias_30,
        Derecho.fecha_vencimiento <= dias_60
    ).count()

    por_vencer_90 = der_query.filter(
        Derecho.fecha_vencimiento != None,
        Derecho.fecha_vencimiento > dias_60,
        Derecho.fecha_vencimiento <= dias_90
    ).count()

    total_vigentes = der_query.filter(
        or_(
            Derecho.fecha_vencimiento == None,
            Derecho.fecha_vencimiento >= today
        )
    ).count()

    # 4. Exhumaciones
    exh_query = db.query(Exhumacion)
    if cementerio_id:
        exh_query = exh_query.join(Exhumacion.ubicacion_origen).filter(Ubicacion.cementerio_id == cementerio_id)
    total_exhumaciones = exh_query.count()

    # 5. Maestros de Obras
    maestros_activos = db.query(Maestro).filter(Maestro.activo == True).count()
    obras_mes = db.query(DerechosMaestros).filter(DerechosMaestros.fecha_orden >= first_day_month).count()

    # 6. Certificados Emitidos
    cert_query = db.query(Certificado)
    if cementerio_id:
        cert_query = cert_query.filter(Certificado.cementerio_id == cementerio_id)
    total_certificados = cert_query.count()

    return {
        "inhumaciones": {
            "total": total_inhumaciones,
            "este_mes": inh_mes,
            "este_ano": inh_ano
        },
        "capacidad": {
            "total_espacios": total_espacios,
            "ocupados": ocupados,
            "disponibles": disponibles,
            "reservados": reservados,
            "inactivos": inactivos,
            "tasa_ocupacion_pct": tasa_ocupacion
        },
        "vencimientos": {
            "vencidos": vencidos,
            "por_vencer_30d": por_vencer_30,
            "por_vencer_60d": por_vencer_60,
            "por_vencer_90d": por_vencer_90,
            "total_vigentes": total_vigentes
        },
        "exhumaciones_total": total_exhumaciones,
        "maestros": {
            "activos": maestros_activos,
            "obras_este_mes": obras_mes
        },
        "certificados_emitidos": total_certificados,
        "fecha_generacion": today.isoformat()
    }


@router.get("/defunciones")
def get_reporte_defunciones(
    cementerio_id: Optional[int] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    tipo_sepultura: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    """
    Reporte y libro oficial de sepultaciones e inhumaciones con filtros sanitarios y legales.
    """
    # Normalizar parámetros en caso de llamadas directas desde Python
    q_str = q.strip() if isinstance(q, str) and q.strip() else None
    fecha_desde = fecha_desde if isinstance(fecha_desde, str) and fecha_desde.strip() else None
    fecha_hasta = fecha_hasta if isinstance(fecha_hasta, str) and fecha_hasta.strip() else None
    tipo_sepultura = tipo_sepultura if isinstance(tipo_sepultura, str) and tipo_sepultura.strip() else None
    cementerio_id = cementerio_id if isinstance(cementerio_id, int) else None

    query = db.query(Inhumacion).join(Inhumacion.ubicacion).join(Ubicacion.cementerio)

    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)

    if fecha_desde:
        try:
            d_from = datetime.strptime(fecha_desde, "%Y-%m-%d").date()
            query = query.filter(Inhumacion.fecha_sepultacion >= d_from)
        except ValueError:
            pass

    if fecha_hasta:
        try:
            d_to = datetime.strptime(fecha_hasta, "%Y-%m-%d").date()
            query = query.filter(Inhumacion.fecha_sepultacion <= d_to)
        except ValueError:
            pass

    if tipo_sepultura:
        query = query.filter(Ubicacion.tipo_ubicacion.ilike(f"%{tipo_sepultura}%"))

    if q_str:
        pat = f"%{q_str}%"
        query = query.outerjoin(Inhumacion.fallecido).filter(
            or_(
                Persona.nombres.ilike(pat),
                Persona.apellido_paterno.ilike(pat),
                Persona.rut.ilike(pat),
                Inhumacion.numero_ingreso.ilike(pat),
                Inhumacion.pase_sepultacion_folio.ilike(pat),
                Inhumacion.responsable_nombre.ilike(pat)
            )
        )

    records = query.order_by(Inhumacion.fecha_sepultacion.desc().nullslast()).limit(limit).all()

    items = []
    for inh in records:
        fallecido = inh.fallecido
        nombre_completo = fallecido.nombre_completo if fallecido else (inh.responsable_nombre or "N/A")
        rut_fallecido = fallecido.rut if fallecido else (inh.responsable_rut or "N/A")

        items.append({
            "id": inh.id,
            "numero_ingreso": inh.numero_ingreso or f"ING-{inh.id}",
            "fecha_defuncion": inh.fecha_defuncion.isoformat() if inh.fecha_defuncion else None,
            "fecha_sepultacion": inh.fecha_sepultacion.isoformat() if inh.fecha_sepultacion else None,
            "fallecido_nombre": nombre_completo,
            "fallecido_rut": rut_fallecido,
            "cementerio": inh.ubicacion.cementerio.nombre if (inh.ubicacion and inh.ubicacion.cementerio) else "San Carlos",
            "codigo_ubicacion": inh.ubicacion.codigo_completo if inh.ubicacion else "N/A",
            "tipo_ubicacion": inh.ubicacion.tipo_ubicacion if inh.ubicacion else "N/A",
            "sector": inh.ubicacion.sector_codigo if inh.ubicacion else None,
            "fila": inh.ubicacion.fila if inh.ubicacion else None,
            "numero": inh.ubicacion.numero if inh.ubicacion else None,
            "pase_folio": inh.pase_sepultacion_folio or "REG-OFICIAL",
            "causa_fallecimiento": inh.causa_fallecimiento if current_user.rol == "ADMINISTRADOR" else "[Confidencial • Ley 21.719]",
            "responsable_nombre": inh.responsable_nombre or "Familiar Directo",
            "responsable_rut": inh.responsable_rut or "N/A",
            "responsable_telefono": inh.responsable_telefono or "N/A",
            "es_reduccion": bool(inh.reduccion)
        })

    return {
        "total": len(items),
        "items": items
    }


@router.get("/vencimientos")
def get_reporte_vencimientos(
    categoria: str = Query("TODOS", description="TODOS, VENCIDOS, 30_DIAS, 60_DIAS, 90_DIAS, VIGENTES"),
    cementerio_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    """
    Reporte financiero y de control de vencimiento de arriendos y concesiones.
    Permite notificaciones preventivas y cobro de derechos municipales.
    """
    today = date.today()
    dias_30 = today + timedelta(days=30)
    dias_60 = today + timedelta(days=60)
    dias_90 = today + timedelta(days=90)

    # Normalizar parámetros
    q_str = q.strip() if isinstance(q, str) and q.strip() else None
    categoria = categoria if isinstance(categoria, str) and categoria.strip() else "TODOS"
    cementerio_id = cementerio_id if isinstance(cementerio_id, int) else None

    query = db.query(Derecho).join(Derecho.ubicacion).join(Ubicacion.cementerio).outerjoin(Derecho.titular)

    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)

    if categoria == "VENCIDOS":
        query = query.filter(Derecho.fecha_vencimiento != None, Derecho.fecha_vencimiento < today)
    elif categoria == "30_DIAS":
        query = query.filter(Derecho.fecha_vencimiento != None, Derecho.fecha_vencimiento >= today, Derecho.fecha_vencimiento <= dias_30)
    elif categoria == "60_DIAS":
        query = query.filter(Derecho.fecha_vencimiento != None, Derecho.fecha_vencimiento > dias_30, Derecho.fecha_vencimiento <= dias_60)
    elif categoria == "90_DIAS":
        query = query.filter(Derecho.fecha_vencimiento != None, Derecho.fecha_vencimiento > dias_60, Derecho.fecha_vencimiento <= dias_90)
    elif categoria == "VIGENTES":
        query = query.filter(or_(Derecho.fecha_vencimiento == None, Derecho.fecha_vencimiento >= today))

    if q_str:
        pat = f"%{q_str}%"
        query = query.filter(
            or_(
                Persona.nombres.ilike(pat),
                Persona.apellido_paterno.ilike(pat),
                Persona.rut.ilike(pat),
                Derecho.folio_recibo.ilike(pat),
                Ubicacion.sector_codigo.ilike(pat)
            )
        )

    derechos = query.order_by(Derecho.fecha_vencimiento.asc().nullslast()).limit(limit).all()

    items = []
    for d in derechos:
        titular = d.titular
        tit_nombre = titular.nombre_completo if titular else "Titular Sin Registrar"
        tit_rut = titular.rut if titular else "N/A"
        tit_tel = titular.telefono if titular else "N/A"
        tit_dir = titular.direccion if titular else "N/A"

        dias = (d.fecha_vencimiento - today).days if d.fecha_vencimiento else None

        if d.fecha_vencimiento is None:
            estado_calc = "PERPETUO / INDEFINIDO"
            badge_color = "slate"
        elif dias < 0:
            estado_calc = f"VENCIDO (hace {abs(dias)} días)"
            badge_color = "red"
        elif dias <= 30:
            estado_calc = f"CRÍTICO ({dias} días)"
            badge_color = "rose"
        elif dias <= 60:
            estado_calc = f"URGENTE ({dias} días)"
            badge_color = "amber"
        elif dias <= 90:
            estado_calc = f"AVISO ({dias} días)"
            badge_color = "yellow"
        else:
            estado_calc = f"VIGENTE ({dias} días)"
            badge_color = "emerald"

        items.append({
            "id": d.id,
            "titular_nombre": tit_nombre,
            "titular_rut": tit_rut,
            "titular_telefono": tit_tel,
            "titular_direccion": tit_dir,
            "cementerio": d.ubicacion.cementerio.nombre if (d.ubicacion and d.ubicacion.cementerio) else "San Carlos",
            "codigo_ubicacion": d.ubicacion.codigo_completo if d.ubicacion else "N/A",
            "tipo_derecho": d.tipo_derecho or "ARRIENDO_TEMPORAL",
            "periodo_arriendo": d.periodo_arriendo or "5 AÑOS",
            "fecha_inicio": d.fecha_inicio.isoformat() if d.fecha_inicio else None,
            "fecha_vencimiento": d.fecha_vencimiento.isoformat() if d.fecha_vencimiento else None,
            "dias_restantes": dias,
            "estado_calculado": estado_calc,
            "badge_color": badge_color,
            "monto_pagado": d.monto_pagado or 0,
            "folio_recibo": d.folio_recibo or "S/F"
        })

    return {
        "categoria": categoria,
        "total": len(items),
        "items": items
    }


@router.get("/capacidad")
def get_reporte_capacidad(
    cementerio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    """
    Reporte territorial de ocupación y disponibilidad por sectores, patios y pabellones.
    """
    query = db.query(
        Ubicacion.cementerio_id,
        Cementerio.nombre.label("cementerio_nombre"),
        Ubicacion.sector_codigo,
        Ubicacion.tipo_ubicacion,
        func.count(Ubicacion.id).label("total"),
        func.sum(case((Ubicacion.estado == EstadoUbicacion.OCUPADO.value, 1), else_=0)).label("ocupados"),
        func.sum(case((Ubicacion.estado == EstadoUbicacion.DISPONIBLE.value, 1), else_=0)).label("disponibles"),
        func.sum(case((Ubicacion.estado == EstadoUbicacion.RESERVADO.value, 1), else_=0)).label("reservados"),
        func.sum(case((or_(Ubicacion.estado == EstadoUbicacion.BLOQUEADO.value, Ubicacion.activo == False), 1), else_=0)).label("inactivos")
    ).join(Cementerio, Ubicacion.cementerio_id == Cementerio.id)

    cementerio_id = cementerio_id if isinstance(cementerio_id, int) else None
    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)

    rows = query.group_by(
        Ubicacion.cementerio_id,
        Cementerio.nombre,
        Ubicacion.sector_codigo,
        Ubicacion.tipo_ubicacion
    ).order_by(Cementerio.nombre.asc(), Ubicacion.sector_codigo.asc()).all()

    sectores = []
    tot_general = 0
    tot_ocup = 0
    tot_disp = 0
    tot_res = 0
    tot_inac = 0

    for r in rows:
        total = r.total or 0
        ocup = r.ocupados or 0
        disp = r.disponibles or 0
        res = r.reservados or 0
        inac = r.inactivos or 0
        pct = round((ocup / total * 100), 1) if total > 0 else 0.0

        tot_general += total
        tot_ocup += ocup
        tot_disp += disp
        tot_res += res
        tot_inac += inac

        sectores.append({
            "cementerio": r.cementerio_nombre,
            "sector": r.sector_codigo or "GENERAL",
            "tipo_ubicacion": r.tipo_ubicacion or "Nicho Pabellón",
            "total": total,
            "ocupados": ocup,
            "disponibles": disp,
            "reservados": res,
            "inactivos": inac,
            "porcentaje_ocupacion": pct
        })

    return {
        "resumen_general": {
            "total": tot_general,
            "ocupados": tot_ocup,
            "disponibles": tot_disp,
            "reservados": tot_res,
            "inactivos": tot_inac,
            "porcentaje_ocupacion_global": round((tot_ocup / tot_general * 100), 1) if tot_general > 0 else 0.0
        },
        "sectores": sectores
    }


@router.get("/exhumaciones")
def get_reporte_exhumaciones(
    cementerio_id: Optional[int] = Query(None),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    """
    Reporte sanitario de exhumaciones, reducciones y traslados (DS 357).
    """
    # Normalizar
    fecha_desde = fecha_desde if isinstance(fecha_desde, str) and fecha_desde.strip() else None
    fecha_hasta = fecha_hasta if isinstance(fecha_hasta, str) and fecha_hasta.strip() else None
    cementerio_id = cementerio_id if isinstance(cementerio_id, int) else None

    query = db.query(Exhumacion).join(Exhumacion.ubicacion_origen).join(Ubicacion.cementerio)

    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)

    if fecha_desde:
        try:
            d_from = datetime.strptime(fecha_desde, "%Y-%m-%d").date()
            query = query.filter(Exhumacion.fecha_exhumacion >= d_from)
        except ValueError:
            pass

    if fecha_hasta:
        try:
            d_to = datetime.strptime(fecha_hasta, "%Y-%m-%d").date()
            query = query.filter(Exhumacion.fecha_exhumacion <= d_to)
        except ValueError:
            pass

    records = query.order_by(Exhumacion.fecha_exhumacion.desc().nullslast()).limit(limit).all()

    items = []
    for exh in records:
        fallecido_nom = "Fallecido Registrado"
        if exh.inhumacion and exh.inhumacion.fallecido:
            fallecido_nom = exh.inhumacion.fallecido.nombre_completo

        items.append({
            "id": exh.id,
            "correlativo_memo": exh.correlativo_memo or f"EXH-{exh.id:04d}",
            "fecha_exhumacion": exh.fecha_exhumacion.isoformat() if exh.fecha_exhumacion else None,
            "hora_exhumacion": exh.hora_exhumacion or "09:00",
            "fallecido_nombre": fallecido_nom,
            "resolucion_numero": exh.resolucion_numero or "RES-SEREMI-OFICIAL",
            "fecha_resolucion": exh.fecha_resolucion.isoformat() if exh.fecha_resolucion else None,
            "motivo": exh.motivo or "Traslado Familiar / Reducción",
            "origen_codigo": exh.ubicacion_origen.codigo_completo if exh.ubicacion_origen else "N/A",
            "destino": exh.destino_externo or (exh.ubicacion_destino.codigo_completo if exh.ubicacion_destino else "Reducción a Osario"),
            "es_reduccion": bool(exh.es_reduccion),
            "libero_origen": bool(exh.libera_ubicacion_origen),
            "observaciones": exh.observaciones
        })

    return {
        "total": len(items),
        "items": items
    }


@router.get("/maestros")
def get_reporte_maestros(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    # Normalizar
    fecha_desde = fecha_desde if isinstance(fecha_desde, str) and fecha_desde.strip() else None
    fecha_hasta = fecha_hasta if isinstance(fecha_hasta, str) and fecha_hasta.strip() else None

    query = db.query(DerechosMaestros).outerjoin(DerechosMaestros.maestro).outerjoin(DerechosMaestros.ubicacion)

    if fecha_desde:
        try:
            d_from = datetime.strptime(fecha_desde, "%Y-%m-%d").date()
            query = query.filter(DerechosMaestros.fecha_orden >= d_from)
        except ValueError:
            pass

    if fecha_hasta:
        try:
            d_to = datetime.strptime(fecha_hasta, "%Y-%m-%d").date()
            query = query.filter(DerechosMaestros.fecha_orden <= d_to)
        except ValueError:
            pass

    records = query.order_by(DerechosMaestros.fecha_orden.desc().nullslast()).limit(limit).all()

    items = []
    for dm in records:
        m = dm.maestro
        m_nombre = m.nombre if m else "Maestro Particular"
        m_rut = m.rut if m else (dm.rut_maestro_legacy or "N/A")

        items.append({
            "id": dm.id,
            "orden_ingreso": dm.orden_ingreso or f"ORD-{dm.id}",
            "fecha_orden": dm.fecha_orden.isoformat() if dm.fecha_orden else None,
            "maestro_nombre": m_nombre,
            "maestro_rut": m_rut,
            "tipo_trabajo": dm.tipo_trabajo or "Colocación de Lápida / Bóveda",
            "ubicacion_codigo": dm.ubicacion.codigo_completo if dm.ubicacion else "N/A",
            "observaciones": dm.observaciones
        })

    return {
        "total": len(items),
        "items": items
    }


@router.get("/exportar/csv")
def exportar_reporte_csv(
    tipo: str = Query(..., description="defunciones, vencimientos, capacidad, exhumaciones, maestros"),
    cementerio_id: Optional[int] = Query(None),
    categoria_venc: Optional[str] = Query("TODOS"),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.REPORTES.value, "READ"))
):
    """
    Exporta datos en formato CSV con cabeceras formateadas y codificación UTF-8 con BOM
    para compatibilidad nativa con Microsoft Excel y software de tesorería municipal.
    """
    output = io.StringIO()
    # Escribir BOM UTF-8 para que Excel lo abra con acentos directamente
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    filename_prefix = f"reporte_{tipo}_{date.today().strftime('%Y%m%d')}"

    if tipo == "defunciones":
        writer.writerow([
            "N° Ingreso", "Fecha Sepultación", "Fecha Defunción", "Nombre Fallecido",
            "RUT Fallecido", "Cementerio", "Código Sepultura", "Tipo", "Sector",
            "Fila", "N°", "N° Pase Defunción", "Familiar Responsable", "RUT Familiar", "Teléfono"
        ])
        rep = get_reporte_defunciones(cementerio_id=cementerio_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, limit=2000, db=db, current_user=current_user)
        for it in rep["items"]:
            writer.writerow([
                it["numero_ingreso"], it["fecha_sepultacion"] or "", it["fecha_defuncion"] or "",
                it["fallecido_nombre"], it["fallecido_rut"], it["cementerio"], it["codigo_ubicacion"],
                it["tipo_ubicacion"], it["sector"] or "", it["fila"] or "", it["numero"] or "",
                it["pase_folio"], it["responsable_nombre"], it["responsable_rut"], it["responsable_telefono"]
            ])

    elif tipo == "vencimientos":
        writer.writerow([
            "Titular", "RUT Titular", "Teléfono", "Dirección", "Cementerio",
            "Código Sepultura", "Tipo Contrato", "Plazo", "Fecha Inicio",
            "Fecha Vencimiento", "Días Restantes / Vencidos", "Estado Arriendo",
            "Monto Pagado ($)", "Folio Recibo"
        ])
        rep = get_reporte_vencimientos(categoria=categoria_venc, cementerio_id=cementerio_id, limit=2000, db=db, current_user=current_user)
        for it in rep["items"]:
            writer.writerow([
                it["titular_nombre"], it["titular_rut"], it["titular_telefono"], it["titular_direccion"],
                it["cementerio"], it["codigo_ubicacion"], it["tipo_derecho"], it["periodo_arriendo"],
                it["fecha_inicio"] or "", it["fecha_vencimiento"] or "", it["dias_restantes"] or 0,
                it["estado_calculado"], it["monto_pagado"], it["folio_recibo"]
            ])

    elif tipo == "capacidad":
        writer.writerow([
            "Cementerio", "Sector / Cuartel", "Tipo Sepultura",
            "Total Espacios", "Ocupados", "Disponibles", "Reservados", "Inactivos / Dañados", "% Ocupación"
        ])
        rep = get_reporte_capacidad(cementerio_id=cementerio_id, db=db, current_user=current_user)
        for it in rep["sectores"]:
            writer.writerow([
                it["cementerio"], it["sector"], it["tipo_ubicacion"],
                it["total"], it["ocupados"], it["disponibles"], it["reservados"], it["inactivos"],
                f"{it['porcentaje_ocupacion']}%"
            ])

    elif tipo == "exhumaciones":
        writer.writerow([
            "Correlativo", "Fecha Exhumación", "Hora", "Fallecido",
            "N° Resolución Sanitaria", "Fecha Resolución", "Motivo", "Sepultura Origen",
            "Destino", "Es Reducción", "Liberó Origen", "Observaciones"
        ])
        rep = get_reporte_exhumaciones(cementerio_id=cementerio_id, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, limit=2000, db=db, current_user=current_user)
        for it in rep["items"]:
            writer.writerow([
                it["correlativo_memo"], it["fecha_exhumacion"] or "", it["hora_exhumacion"],
                it["fallecido_nombre"], it["resolucion_numero"], it["fecha_resolucion"] or "",
                it["motivo"], it["origen_codigo"], it["destino"],
                "SÍ" if it["es_reduccion"] else "NO",
                "SÍ" if it["libero_origen"] else "NO",
                it["observaciones"] or ""
            ])

    elif tipo == "maestros":
        writer.writerow([
            "N° Orden Ingreso", "Fecha Orden", "Maestro Constructor",
            "RUT Maestro", "Tipo Faena / Obra", "Código Sepultura", "Observaciones"
        ])
        rep = get_reporte_maestros(fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, limit=2000, db=db, current_user=current_user)
        for it in rep["items"]:
            writer.writerow([
                it["orden_ingreso"], it["fecha_orden"] or "", it["maestro_nombre"],
                it["maestro_rut"], it["tipo_trabajo"], it["ubicacion_codigo"], it["observaciones"] or ""
            ])
    else:
        writer.writerow(["Error", "Tipo de reporte no reconocido"])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename_prefix}.csv",
            "Content-Type": "text/csv; charset=utf-8"
        }
    )
