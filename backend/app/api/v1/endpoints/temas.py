from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import ConfigTema, RolUsuario, Usuario
from app.domain.schemas.tema import TemaResponse, TemaCreate, TemaUpdate
from app.api.deps import require_role, get_current_user, get_current_user_optional
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()


@router.get("", response_model=List[TemaResponse])
def list_themes(db: Session = Depends(get_db)):
    """List all available system and custom themes."""
    return db.query(ConfigTema).order_by(ConfigTema.es_sistema.desc(), ConfigTema.nombre.asc()).all()


@router.get("/activo", response_model=TemaResponse)
def get_active_theme(db: Session = Depends(get_db)):
    """Get the currently active theme."""
    active = db.query(ConfigTema).filter(ConfigTema.es_activo == True).first()
    if not active:
        # Fallback to first available theme
        active = db.query(ConfigTema).first()
    if not active:
        raise HTTPException(status_code=404, detail="No active theme found.")
    return active


@router.post("/activar/{theme_id_or_slug}", response_model=TemaResponse)
def activate_theme(
    theme_id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Activate a theme globally across the platform."""
    if theme_id_or_slug.isdigit():
        theme = db.query(ConfigTema).filter(ConfigTema.id == int(theme_id_or_slug)).first()
    else:
        theme = db.query(ConfigTema).filter(ConfigTema.slug == theme_id_or_slug).first()

    if not theme:
        raise HTTPException(status_code=404, detail="Tema no encontrado.")

    # Deactivate all others
    db.query(ConfigTema).update({"es_activo": False})
    theme.es_activo = True
    db.commit()
    db.refresh(theme)

    AuditService.log_mutation(
        session=db,
        modulo="TEMAS",
        accion="ACTIVAR_TEMA",
        entidad="core.tb_config_tema",
        registro_id=str(theme.id),
        payload_posterior=theme.to_dict(),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return theme


@router.post("", response_model=TemaResponse, status_code=status.HTTP_201_CREATED)
def create_custom_theme(
    theme_in: TemaCreate,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Create a new custom theme from Admin Panel.
    """
    existing = db.query(ConfigTema).filter(ConfigTema.slug == theme_in.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un tema con ese identificador slug.")

    new_theme = ConfigTema(
        nombre=theme_in.nombre,
        slug=theme_in.slug,
        es_activo=False,
        es_modo_oscuro=theme_in.es_modo_oscuro,
        es_sistema=False,
        color_primario=theme_in.color_primario,
        color_secundario=theme_in.color_secundario,
        color_acento=theme_in.color_acento,
        color_fondo=theme_in.color_fondo,
        color_superficie=theme_in.color_superficie,
        color_texto=theme_in.color_texto,
        color_borde=theme_in.color_borde,
        descripcion=theme_in.descripcion
    )
    db.add(new_theme)
    db.commit()
    db.refresh(new_theme)

    user_id = current_user.id if current_user else 1
    username = current_user.username if current_user else "admin_local"
    user_rut = current_user.rut if current_user else "11111111-1"
    user_role = current_user.rol if current_user else "ADMINISTRADOR"

    AuditService.log_mutation(
        session=db,
        modulo="TEMAS",
        accion="CREAR_TEMA",
        entidad="core.tb_config_tema",
        registro_id=str(new_theme.id),
        payload_posterior=new_theme.to_dict(),
        user_id=user_id,
        username=username,
        user_rut=user_rut,
        user_role=user_role,
        commit=True
    )

    return new_theme


@router.put("/{theme_id}", response_model=TemaResponse)
def update_theme(
    theme_id: int,
    theme_in: TemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value))
):
    """
    Update theme colors and settings from Admin Panel.
    Restricted to Administrator role.
    """
    theme = db.query(ConfigTema).filter(ConfigTema.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Tema no encontrado.")

    prev_state = theme.to_dict()

    update_data = theme_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(theme, field, val)

    db.commit()
    db.refresh(theme)

    AuditService.log_mutation(
        session=db,
        modulo="TEMAS",
        accion="ACTUALIZAR_TEMA",
        entidad="core.tb_config_tema",
        registro_id=str(theme.id),
        payload_anterior=prev_state,
        payload_posterior=theme.to_dict(),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return theme


@router.delete("/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_theme(
    theme_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value))
):
    """
    Delete custom theme. System themes cannot be deleted.
    """
    theme = db.query(ConfigTema).filter(ConfigTema.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Tema no encontrado.")
    if theme.es_sistema:
        raise HTTPException(status_code=400, detail="Los temas de sistema predeterminados no pueden ser eliminados.")

    prev_state = theme.to_dict()
    db.delete(theme)
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="TEMAS",
        accion="ELIMINAR_TEMA",
        entidad="core.tb_config_tema",
        registro_id=str(theme_id),
        payload_anterior=prev_state,
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )
