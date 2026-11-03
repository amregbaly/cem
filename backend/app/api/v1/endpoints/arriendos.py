import csv
import io
import calendar
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import (
    Derecho,
    Ubicacion,
    Cementerio,
    Persona,
    Usuario,
    RolUsuario,
    TipoDerecho,
    PeriodoArriendo,
    EstadoDerecho,
    TransferenciaDerecho,
)
from app.domain.schemas.transferencia import TransferenciaCreate
from app.infrastructure.services.notification_service import NotificationService
from app.infrastructure.db.audit_listener import AuditService
from app.domain.models.grupo import ModuloSistema
from app.api.deps import require_role, get_current_user_optional, get_current_user, require_module_access

router = APIRouter()


def add_years_to_date(base_date: date, years: int) -> date:
    try:
        return base_date.replace(year=base_date.year + years)
    except ValueError:
        return base_date.replace(year=base_date.year + years, day=28)


def add_months_to_date(base_date: date, months: int) -> date:
    new_month = base_date.month + months
    year_offset = (new_month - 1) // 12
    final_month = ((new_month - 1) % 12) + 1
    max_days = calendar.monthrange(base_date.year + year_offset, final_month)[1]
    final_day = min(base_date.day, max_days)
    return date(base_date.year + year_offset, final_month, final_day)


class NotificarRequest(BaseModel):
    derecho_id: int
    canales: List[str] = ["EMAIL", "SMS", "WHATSAPP"]


class RenovacionRequest(BaseModel):
    periodo: str = "5_ANOS"  # "2_MESES", "5_ANOS", "20_ANOS", "50_ANOS", "PERPETUO"
    nuevo_folio_recibo: str
    monto_pagado: float = 0.0
    documento_respaldo_url: Optional[str] = None
    observaciones: Optional[str] = None


class CompraPerpetuaRequest(BaseModel):
    ubicacion_id: int
    comprador_persona_id: int
    fecha_compra: date
    folio_orden_ingreso: str
    monto_pagado: float
    documento_respaldo_url: Optional[str] = None
    observaciones: Optional[str] = None


@router.get("/vencimientos")
def get_vencimientos_radar(
    cementerio_id: Optional[int] = Query(None),
    dias_filtro: Optional[int] = Query(None, description="Filter: 30, 60, 90, or -1 (all expired)"),
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Automated Lease Engine: Computes lease expiration thresholds (Expired, 30d, 60d, 90d).
    Powers the administrative renewal dashboard and multi-channel alerts.
    Enforces Ley 21.719 privacy redactions on contact data for Visita profile.
    """
    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    query = db.query(Derecho)
    if cementerio_id:
        ubic_sub = db.query(Ubicacion.id).filter(Ubicacion.cementerio_id == cementerio_id)
        query = query.filter(Derecho.ubicacion_id.in_(ubic_sub))

    # Exclude perpetual rights
    query = query.filter(Derecho.fecha_vencimiento.isnot(None))

    derechos = query.order_by(Derecho.fecha_vencimiento.asc()).all()
    today = date.today()

    vencidos = []
    dias_30 = []
    dias_60 = []
    dias_90 = []

    for d in derechos:
        diff = (d.fecha_vencimiento - today).days
        item = {
            "id": d.id,
            "ubicacion_id": d.ubicacion_id,
            "codigo_ubicacion": d.ubicacion.codigo_completo if d.ubicacion else f"UBIC-{d.ubicacion_id}",
            "cementerio": d.ubicacion.cementerio.nombre if d.ubicacion and d.ubicacion.cementerio else "San Carlos",
            "titular": d.titular.nombre_completo if d.titular else "Sin titular",
            "rut_titular": (d.titular.rut if d.titular else "N/A") if is_staff else "[CONFIDENCIAL LEY 21.719]",
            "telefono": ((d.titular.celular or d.titular.telefono) if d.titular else None) if is_staff else "[PROTEGIDO]",
            "email": (d.titular.email if d.titular else None) if is_staff else "[PROTEGIDO]",
            "fecha_inicio": d.fecha_inicio.isoformat() if d.fecha_inicio else "",
            "fecha_vencimiento": d.fecha_vencimiento.isoformat() if d.fecha_vencimiento else "",
            "dias_restantes": diff,
            "periodo": d.periodo_arriendo or "TEMPORAL",
            "periodo_arriendo": d.periodo_arriendo or "TEMPORAL",
            "tipo_derecho": d.tipo_derecho or "ARRIENDO",
            "monto_pagado": float(d.monto_pagado) if d.monto_pagado is not None else 0.0,
            "estado": d.estado,
            "alerta_nivel": "CRITICO_VENCIDO" if diff < 0 else ("ALERTA_30D" if diff <= 30 else ("AVISO_60D" if diff <= 60 else "INFO_90D"))
        }

        if diff < 0:
            vencidos.append(item)
        elif diff <= 30:
            dias_30.append(item)
        elif diff <= 60:
            dias_60.append(item)
        elif diff <= 90:
            dias_90.append(item)

    if dias_filtro == -1:
        detalles = vencidos
    elif dias_filtro == 30:
        detalles = dias_30
    elif dias_filtro == 60:
        detalles = dias_60
    elif dias_filtro == 90:
        detalles = dias_90
    else:
        detalles = vencidos + dias_30 + dias_60 + dias_90

    return {
        "resumen": {
            "total_vencidos": len(vencidos),
            "total_30_dias": len(dias_30),
            "total_60_dias": len(dias_60),
            "total_90_dias": len(dias_90),
            "total_atencion_requerida": len(vencidos) + len(dias_30) + len(dias_60) + len(dias_90),
            "total_alertas_activas": len(vencidos) + len(dias_30) + len(dias_60) + len(dias_90)
        },
        "detalles": detalles
    }


@router.post("/notificar")
def notificar_titular_vencimiento(
    req: NotificarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.ARRIENDOS.value, "WRITE"))
):
    """
    Triggers multi-channel expiration alert (SMS, WhatsApp, Email).
    Strictly restricted to users with ARRIENDOS WRITE permissions.
    Audit logged to append-only chain.
    """
    der = db.query(Derecho).filter(Derecho.id == req.derecho_id).first()
    if not der or not der.fecha_vencimiento:
        raise HTTPException(status_code=404, detail="Arriendo no encontrado o es perpetuo.")

    dias_restantes = (der.fecha_vencimiento - date.today()).days
    result = NotificationService.send_lease_expiry_alert(
        titular_nombre=der.titular.nombre_completo,
        titular_email=der.titular.email or f"titular_{der.titular.id}@notificaciones.sancarlos.cl",
        titular_telefono=der.titular.celular or "+56987654321",
        codigo_ubicacion=der.ubicacion.codigo_completo,
        cementerio_nombre=der.ubicacion.cementerio.nombre,
        fecha_vencimiento=der.fecha_vencimiento,
        dias_restantes=dias_restantes,
        canales=req.canales
    )

    # Append-only audit record
    AuditService.log_mutation(
        session=db,
        modulo="ARRIENDOS",
        accion="NOTIFICAR_VENCIMIENTO",
        entidad="core.tb_derecho",
        registro_id=str(der.id),
        payload_posterior={
            "titular": der.titular.nombre_completo,
            "dias_restantes": dias_restantes,
            "canales": req.canales,
            "resultado": result
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return result


@router.post("/{derecho_id}/transferir")
def transferir_derecho_propiedad(
    derecho_id: int,
    req: TransferenciaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.ARRIENDOS.value, "WRITE"))
):
    """
    Transfer property rights from current holder to a new person (EETT 3.8 & A2-16).
    Preserves complete historical chain: all previous holders remain visible.
    """
    der = db.query(Derecho).filter(Derecho.id == derecho_id).first()
    if not der:
        raise HTTPException(status_code=404, detail="Derecho no encontrado.")

    nuevo_id = req.nuevo_titular_persona_id or req.nuevo_titular_id
    if not nuevo_id:
        raise HTTPException(status_code=400, detail="Debe especificar nuevo_titular_persona_id.")
    fecha_transf = req.fecha_transferencia or date.today()

    nuevo_titular = db.query(Persona).filter(Persona.id == nuevo_id).first()
    if not nuevo_titular:
        raise HTTPException(status_code=404, detail="Nuevo titular no encontrado.")

    titular_anterior_id = der.titular_persona_id
    titular_anterior = der.titular

    # 1. Record immutable transfer history entry
    transf = TransferenciaDerecho(
        derecho_id=der.id,
        titular_anterior_id=titular_anterior_id,
        titular_nuevo_id=nuevo_id,
        fecha_transferencia=fecha_transf,
        numero_resolucion=req.numero_resolucion,
        orden_ingreso=req.orden_ingreso,
        documento_respaldo_url=req.documento_respaldo_url,
        motivo=req.motivo,
        observaciones=req.observaciones,
        usuario_registro_id=current_user.id
    )
    db.add(transf)

    # 2. Update current right holder
    der.titular_anterior_id = titular_anterior_id
    der.titular_persona_id = nuevo_id
    der.fecha_transferencia = fecha_transf
    der.estado = EstadoDerecho.VIGENTE.value
    if req.observaciones:
        der.observaciones = f"{der.observaciones or ''} | [TRASPASO {fecha_transf}]: {req.observaciones}".strip(" |")

    AuditService.log_mutation(
        session=db,
        modulo="DERECHOS",
        accion="TRANSFERENCIA_PROPIEDAD",
        entidad="core.tb_derecho",
        registro_id=str(der.id),
        payload_posterior={
            "derecho_id": der.id,
            "titular_anterior": titular_anterior.nombre_completo if titular_anterior else str(titular_anterior_id),
            "titular_nuevo": nuevo_titular.nombre_completo,
            "fecha_transferencia": fecha_transf.isoformat(),
            "resolucion": req.numero_resolucion,
            "orden_ingreso": req.orden_ingreso,
            "documento": req.documento_respaldo_url
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {
        "success": True,
        "message": f"Dominio traspasado exitosamente a {nuevo_titular.nombre_completo}.",
        "derecho_id": der.id,
        "titular_actual": nuevo_titular.nombre_completo,
        "titular_anterior": titular_anterior.nombre_completo if titular_anterior else None,
        "transferencia": transf.to_dict()
    }


@router.post("/{derecho_id}/renovar")
def renovar_arriendo(
    derecho_id: int,
    req: RenovacionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.ARRIENDOS.value, "WRITE"))
):
    """
    Extends or renews a cemetery niche/patio lease (EETT 3.3, A2-03, A2-14).
    Supports periods: 2_MESES, 5_ANOS, 20_ANOS, 50_ANOS, and PERPETUO.
    """
    der = db.query(Derecho).filter(Derecho.id == derecho_id).first()
    if not der:
        raise HTTPException(status_code=404, detail="Derecho no encontrado.")

    base_date = der.fecha_vencimiento if (der.fecha_vencimiento and der.fecha_vencimiento > date.today()) else date.today()

    if req.periodo == "2_MESES":
        nueva_fecha = add_months_to_date(base_date, 2)
        nuevo_periodo = PeriodoArriendo.DOS_MESES.value
    elif req.periodo == "5_ANOS":
        nueva_fecha = add_years_to_date(base_date, 5)
        nuevo_periodo = PeriodoArriendo.CINCO_ANOS.value
    elif req.periodo == "20_ANOS":
        nueva_fecha = add_years_to_date(base_date, 20)
        nuevo_periodo = PeriodoArriendo.VEINTE_ANOS.value
    elif req.periodo == "50_ANOS":
        nueva_fecha = add_years_to_date(base_date, 50)
        nuevo_periodo = PeriodoArriendo.CINCUENTA_ANOS.value
    elif req.periodo == "PERPETUO":
        nueva_fecha = None
        nuevo_periodo = PeriodoArriendo.PERPETUO.value
        der.tipo_derecho = TipoDerecho.PERPETUO.value
    else:
        nueva_fecha = add_years_to_date(base_date, 5)
        nuevo_periodo = PeriodoArriendo.CINCO_ANOS.value

    fecha_vencimiento_ant = der.fecha_vencimiento
    der.fecha_vencimiento = nueva_fecha
    der.periodo_arriendo = nuevo_periodo
    der.estado = EstadoDerecho.VIGENTE.value
    der.folio_recibo = req.nuevo_folio_recibo
    der.monto_pagado = req.monto_pagado

    obs = f"Renovación por {req.periodo}. Folio Recibo: {req.nuevo_folio_recibo}. Vencimiento anterior: {fecha_vencimiento_ant}."
    der.observaciones = f"{der.observaciones or ''} | {obs}".strip(" |")

    AuditService.log_mutation(
        session=db,
        modulo="ARRIENDOS",
        accion="RENOVAR_ARRIENDO",
        entidad="core.tb_derecho",
        registro_id=str(der.id),
        payload_posterior={
            "derecho_id": der.id,
            "periodo": req.periodo,
            "folio_recibo": req.nuevo_folio_recibo,
            "vencimiento_anterior": fecha_vencimiento_ant.isoformat() if fecha_vencimiento_ant else None,
            "nuevo_vencimiento": nueva_fecha.isoformat() if nueva_fecha else "PERPETUO",
            "monto_pagado": req.monto_pagado
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {
        "success": True,
        "message": f"Arriendo {der.id} renovado exitosamente hasta {nueva_fecha or 'PERPETUO'}.",
        "derecho_id": der.id,
        "nuevo_vencimiento": nueva_fecha.isoformat() if nueva_fecha else None,
        "periodo": nuevo_periodo,
        "estado": der.estado
    }


@router.post("/compra-perpetua")
def comprar_nicho_perpetuo(
    req: CompraPerpetuaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_module_access(ModuloSistema.ARRIENDOS.value, "WRITE"))
):
    """
    Registers the perpetual purchase of a niche/grave (EETT 3.4 & A2-05).
    """
    ubic = db.query(Ubicacion).filter(Ubicacion.id == req.ubicacion_id).first()
    if not ubic:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    comprador = db.query(Persona).filter(Persona.id == req.comprador_persona_id).first()
    if not comprador:
        raise HTTPException(status_code=404, detail="Persona compradora no encontrada.")

    nuevo_der = Derecho(
        ubicacion_id=ubic.id,
        titular_persona_id=comprador.id,
        tipo_derecho=TipoDerecho.PERPETUO.value,
        periodo_arriendo=PeriodoArriendo.PERPETUO.value,
        fecha_inicio=req.fecha_compra,
        fecha_vencimiento=None,
        monto_pagado=req.monto_pagado,
        folio_recibo=req.folio_orden_ingreso,
        estado=EstadoDerecho.VIGENTE.value,
        observaciones=req.observaciones
    )
    db.add(nuevo_der)
    ubic.estado = "OCUPADO" if ubic.capacidad_ocupada > 0 else "RESERVADO"

    AuditService.log_mutation(
        session=db,
        modulo="DERECHOS",
        accion="COMPRA_PERPETUA_NICHO",
        entidad="core.tb_derecho",
        registro_id="NUEVO",
        payload_posterior={
            "ubicacion": ubic.codigo_completo,
            "comprador": comprador.nombre_completo,
            "rut": comprador.rut,
            "folio_recibo": req.folio_orden_ingreso,
            "monto": req.monto_pagado
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {
        "success": True,
        "message": f"Compra perpetua registrada exitosamente para {comprador.nombre_completo}.",
        "derecho_id": nuevo_der.id,
        "codigo_ubicacion": ubic.codigo_completo,
        "comprador": comprador.nombre_completo
    }


@router.get("/exportar")
def exportar_arriendos_csv(
    cementerio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Exports full lease and rights register to CSV with UTF-8 BOM encoding for Excel compatibility.
    Enforces Ley 21.719 data privacy: contacts and RUTs are protected for Visita/unauthenticated.
    Audit logged to append-only chain.
    """
    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    query = db.query(Derecho)
    if cementerio_id:
        ubic_sub = db.query(Ubicacion.id).filter(Ubicacion.cementerio_id == cementerio_id)
        query = query.filter(Derecho.ubicacion_id.in_(ubic_sub))

    derechos = query.order_by(Derecho.id.asc()).all()
    today = date.today()

    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";")

    writer.writerow([
        "ID Derecho",
        "Folio Recibo",
        "Cementerio",
        "Ubicación",
        "Tipo Sepultura",
        "Tipo Derecho",
        "Periodo Arriendo",
        "Titular",
        "RUT Titular",
        "Teléfono",
        "Email",
        "Fecha Inicio",
        "Fecha Vencimiento",
        "Días para Vencer",
        "Estado",
        "Monto Pagado (CLP)"
    ])

    for d in derechos:
        dias = d.dias_para_vencer(today)
        writer.writerow([
            d.id,
            d.folio_recibo or f"REC-{d.id}",
            d.ubicacion.cementerio.nombre,
            d.ubicacion.codigo_completo,
            d.ubicacion.tipo_ubicacion,
            d.tipo_derecho,
            d.periodo_arriendo,
            d.titular.nombre_completo,
            d.titular.rut if is_staff else "[CONFIDENCIAL LEY 21.719]",
            (d.titular.celular or d.titular.telefono or "S/FONO") if is_staff else "[PROTEGIDO LEY 21.719]",
            (d.titular.email or "S/EMAIL") if is_staff else "[PROTEGIDO LEY 21.719]",
            d.fecha_inicio.strftime("%d/%m/%Y") if d.fecha_inicio else "",
            d.fecha_vencimiento.strftime("%d/%m/%Y") if d.fecha_vencimiento else "PERPETUO",
            dias if dias is not None else "N/A",
            d.estado,
            f"${int(d.monto_pagado):,}".replace(",", ".") if d.monto_pagado else "$0"
        ])

    AuditService.log_mutation(
        session=db,
        modulo="ARRIENDOS",
        accion="EXPORTAR_CSV",
        entidad="core.tb_derecho",
        registro_id="TODOS",
        user_id=user.id if user else None,
        username=user.username if user else "VISITA_ANONIMA",
        user_role=user.rol if user else "VISITA",
        commit=True
    )

    csv_data = output.getvalue().encode("utf-8-sig")
    filename = f"reporte_arriendos_{today.strftime('%Y%m%d')}.csv"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(content=csv_data, media_type="text/csv", headers=headers)
