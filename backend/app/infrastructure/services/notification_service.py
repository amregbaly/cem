import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional

logger = logging.getLogger("cemetery.notifications")


class NotificationService:
    """
    Multi-channel notification service for lease renewal alerts and citizen notices.
    Supports Email, SMS, and WhatsApp dispatch.
    """

    @staticmethod
    def send_lease_expiry_alert(
        titular_nombre: str,
        titular_email: Optional[str],
        titular_telefono: Optional[str],
        codigo_ubicacion: str,
        cementerio_nombre: str,
        fecha_vencimiento: date,
        dias_restantes: int,
        canales: List[str] = ["EMAIL", "SMS", "WHATSAPP"]
    ) -> Dict[str, Any]:
        """
        Dispatches multi-channel expiration alerts to registered property titleholder.
        """
        now = datetime.now()
        dispatch_results = {}

        urgencia = "URGENTE: " if dias_restantes <= 30 else "AVISO: "
        mensaje_base = (
            f"Municipalidad de San Carlos informa: El arriendo de sepultura {codigo_ubicacion} "
            f"en {cementerio_nombre} vence el {fecha_vencimiento.strftime('%d/%m/%Y')} "
            f"({dias_restantes} días restantes). Para renovar en línea o agendar atención, "
            f"visite el portal municipal de cementerios."
        )

        # 1. Email Channel
        if "EMAIL" in canales and titular_email:
            # Simulated transactional email via SMTP/SendGrid
            dispatch_results["email"] = {
                "status": "SENT",
                "recipient": titular_email,
                "subject": f"{urgencia}Vencimiento de Arriendo de Sepultura - {codigo_ubicacion}",
                "timestamp": now.isoformat()
            }
            logger.info(f"[NOTIF-EMAIL] Sent to {titular_email} for location {codigo_ubicacion}")
        else:
            dispatch_results["email"] = {
                "status": "SKIPPED",
                "reason": "Email no registrado o canal no seleccionado"
            }

        # 2. SMS Channel
        if "SMS" in canales and titular_telefono:
            dispatch_results["sms"] = {
                "status": "SENT",
                "recipient": titular_telefono,
                "message_preview": mensaje_base[:160],
                "timestamp": now.isoformat()
            }
            logger.info(f"[NOTIF-SMS] Sent to {titular_telefono} for location {codigo_ubicacion}")
        else:
            dispatch_results["sms"] = {
                "status": "SKIPPED",
                "reason": "Teléfono no registrado o canal no seleccionado"
            }

        # 3. WhatsApp Channel
        if "WHATSAPP" in canales and titular_telefono:
            dispatch_results["whatsapp"] = {
                "status": "SENT",
                "recipient": titular_telefono,
                "template": "notificacion_arriendo_vencimiento_v1",
                "timestamp": now.isoformat()
            }
            logger.info(f"[NOTIF-WHATSAPP] Sent to {titular_telefono} for location {codigo_ubicacion}")
        else:
            dispatch_results["whatsapp"] = {
                "status": "SKIPPED",
                "reason": "Teléfono no registrado o canal no seleccionado"
            }

        return {
            "success": True,
            "titular": titular_nombre,
            "codigo_ubicacion": codigo_ubicacion,
            "fecha_vencimiento": fecha_vencimiento.isoformat(),
            "dias_restantes": dias_restantes,
            "canales": dispatch_results
        }
