import csv
import io
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Derecho, Ubicacion, Cementerio, Persona, Usuario, RolUsuario
from app.infrastructure.services.notification_service import NotificationService
from app.infrastructure.db.audit_listener import AuditService
from app.api.deps import require_role, get_current_user_optional, get_current_user

router = APIRouter()


class NotificarRequest(BaseModel):
    derecho_id: int
    canales: List[str] = ["EMAIL", "SMS", "WHATSAPP"]


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
            "codigo_ubicacion": d.ubicacion.codigo_completo,
            "cementerio": d.ubicacion.cementerio.nombre,
            "titular": d.titular.nombre_completo,
            "rut_titular": d.titular.rut if is_staff else "[CONFIDENCIAL LEY 21.719]",
            "telefono": (d.titular.celular or d.titular.telefono) if is_staff else "[CONFIDENCIAL]",
            "email": d.titular.email if is_staff else "[CONFIDENCIAL]",
            "tipo_derecho": d.tipo_derecho,
            "periodo_arriendo": d.periodo_arriendo,
            "fecha_inicio": d.fecha_inicio.isoformat() if d.fecha_inicio else None,
            "fecha_vencimiento": d.fecha_vencimiento.isoformat() if d.fecha_vencimiento else None,
            "dias_restantes": diff,
            "monto_pagado": float(d.monto_pagado) if d.monto_pagado else 0.0,
            "estado": "VENCIDO" if diff < 0 else "POR_VENCER"
        }

        if diff < 0:
            vencidos.append(item)
        elif 0 <= diff <= 30:
            dias_30.append(item)
        elif 31 <= diff <= 60:
            dias_60.append(item)
        elif 61 <= diff <= 90:
            dias_90.append(item)

    # Apply optional filter
    filtered_list = []
    if dias_filtro == -1:
        filtered_list = vencidos
    elif dias_filtro == 30:
        filtered_list = dias_30
    elif dias_filtro == 60:
        filtered_list = dias_60
    elif dias_filtro == 90:
        filtered_list = dias_90
    else:
        filtered_list = vencidos + dias_30 + dias_60 + dias_90

    return {
        "resumen": {
            "total_vencidos": len(vencidos),
            "total_30_dias": len(dias_30),
            "total_60_dias": len(dias_60),
            "total_90_dias": len(dias_90),
            "total_alertas_activas": len(vencidos) + len(dias_30) + len(dias_60) + len(dias_90)
        },
        "detalles": filtered_list
    }


@router.post("/notificar")
def enviar_notificacion_arriendo(
    req: NotificarRequest,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Triggers mock/live multi-channel notification (Email, SMS, WhatsApp)
    to registered property titleholder and logs action in append-only audit trail.
    """
    der = db.query(Derecho).filter(Derecho.id == req.derecho_id).first()
    if not der or not der.fecha_vencimiento:
        raise HTTPException(status_code=404, detail="Derecho no encontrado o es a perpetuidad")

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
        user_id=current_user.id if current_user else 1,
        username=current_user.username if current_user else "SISTEMA",
        user_rut=current_user.rut if current_user else "11111111-1",
        user_role=current_user.rol if current_user else "ADMINISTRADOR",
        commit=True
    )

    return result


@router.get("/exportar")
def exportar_arriendos_csv(
    cementerio_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Exports full lease and rights register to CSV with UTF-8 BOM encoding for Excel compatibility.
    """
    query = db.query(Derecho)
    if cementerio_id:
        ubic_sub = db.query(Ubicacion.id).filter(Ubicacion.cementerio_id == cementerio_id)
        query = query.filter(Derecho.ubicacion_id.in_(ubic_sub))

    derechos = query.order_by(Derecho.id.asc()).all()
    today = date.today()

    output = io.StringIO()
    # Write UTF-8 BOM so Excel opens it with proper accents/Ñ
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
            d.titular.rut or "S/RUT",
            d.titular.celular or d.titular.telefono or "S/FONO",
            d.titular.email or "S/EMAIL",
            d.fecha_inicio.strftime("%d/%m/%Y") if d.fecha_inicio else "",
            d.fecha_vencimiento.strftime("%d/%m/%Y") if d.fecha_vencimiento else "PERPETUO",
            dias if dias is not None else "N/A",
            d.estado,
            f"${int(d.monto_pagado):,}".replace(",", ".") if d.monto_pagado else "$0"
        ])

    csv_data = output.getvalue().encode("utf-8-sig")
    filename = f"reporte_arriendos_{today.strftime('%Y%m%d')}.csv"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(content=csv_data, media_type="text/csv", headers=headers)
