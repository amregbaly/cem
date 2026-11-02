from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import ConfigPortal, Usuario, RolUsuario
from app.domain.schemas.portal import PortalConfigResponse, PortalConfigUpdateRequest
from app.api.deps import require_role, get_current_user
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()


@router.get("/config", response_model=PortalConfigResponse)
def get_portal_config(db: Session = Depends(get_db)):
    """
    Public Citizen Portal configuration.
    Returns whether visitors can see only certificates or also the death list.
    """
    config = db.query(ConfigPortal).first()
    if not config:
        config = ConfigPortal(
            permitir_lista_fallecidos=False,
            permitir_busqueda_publica=False,
            titulo_portal="Portal Ciudadano de Certificados Municipales",
            mensaje_portal="Verificación digital y autenticidad de certificados para los Cementerios de San Carlos y Cachapoal (Ley 21.719)."
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    return PortalConfigResponse(
        id=config.id,
        permitir_lista_fallecidos=config.permitir_lista_fallecidos,
        permitir_busqueda_publica=config.permitir_busqueda_publica,
        titulo_portal=config.titulo_portal,
        mensaje_portal=config.mensaje_portal,
        actualizado_por=config.actualizado_por,
        updated_at=config.updated_at.isoformat() if hasattr(config, "updated_at") and config.updated_at else None
    )


@router.put("/config", response_model=PortalConfigResponse)
def update_portal_config(
    req: PortalConfigUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Update citizen portal settings.
    Allows administrators to enable/disable visitor access to the deceased list (inhumaciones).
    """
    config = db.query(ConfigPortal).first()
    if not config:
        config = ConfigPortal(
            permitir_lista_fallecidos=req.permitir_lista_fallecidos,
            permitir_busqueda_publica=req.permitir_busqueda_publica if req.permitir_busqueda_publica is not None else False,
            titulo_portal=req.titulo_portal or "Portal Ciudadano de Certificados Municipales",
            mensaje_portal=req.mensaje_portal or "Verificación digital y autenticidad de certificados para los Cementerios de San Carlos y Cachapoal (Ley 21.719)."
        )
        db.add(config)
    else:
        config.permitir_lista_fallecidos = req.permitir_lista_fallecidos
        if req.permitir_busqueda_publica is not None:
            config.permitir_busqueda_publica = req.permitir_busqueda_publica
        if req.titulo_portal:
            config.titulo_portal = req.titulo_portal
        if req.mensaje_portal:
            config.mensaje_portal = req.mensaje_portal
        config.actualizado_por = current_user.username

    db.commit()
    db.refresh(config)

    # Immutable audit logging
    AuditService.log_mutation(
        session=db,
        modulo="CONFIGURACION",
        accion="ACTUALIZAR_CONFIG_PORTAL_PUBLICO",
        entidad="core.tb_config_portal",
        registro_id=str(config.id),
        payload_posterior={
            "permitir_lista_fallecidos": config.permitir_lista_fallecidos,
            "permitir_busqueda_publica": config.permitir_busqueda_publica,
            "titulo_portal": config.titulo_portal
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return PortalConfigResponse(
        id=config.id,
        permitir_lista_fallecidos=config.permitir_lista_fallecidos,
        permitir_busqueda_publica=config.permitir_busqueda_publica,
        titulo_portal=config.titulo_portal,
        mensaje_portal=config.mensaje_portal,
        actualizado_por=config.actualizado_por,
        updated_at=config.updated_at.isoformat() if hasattr(config, "updated_at") and config.updated_at else None
    )
