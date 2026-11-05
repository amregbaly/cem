from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_role, get_current_user
from app.domain.models import Usuario, RolUsuario, Grupo, GrupoPermiso, ModuloSistema, NivelAcceso
from app.domain.schemas.grupo import (
    GrupoResponse,
    GrupoCreateRequest,
    GrupoUpdateRequest,
    PermisoItem,
    AsignarGrupoRequest
)
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()

DEFAULT_MODULES = [
    ModuloSistema.INHUMACIONES.value,
    ModuloSistema.UBICACIONES.value,
    ModuloSistema.ARRIENDOS.value,
    ModuloSistema.CERTIFICADOS.value,
    ModuloSistema.CAMPO.value,
    ModuloSistema.AUDITORIA.value,
    ModuloSistema.CONFIGURACION.value,
    ModuloSistema.USUARIOS.value,
    ModuloSistema.REPORTES.value,
]


def _format_grupo_response(g: Grupo, db: Session) -> GrupoResponse:
    permisos_map = {p.modulo: p.acceso for p in g.permisos}
    formatted_permisos = []
    for mod in DEFAULT_MODULES:
        formatted_permisos.append(
            PermisoItem(
                modulo=mod,
                acceso=permisos_map.get(mod, NivelAcceso.NONE.value)
            )
        )
    user_count = db.query(Usuario).filter(Usuario.grupo_id == g.id).count()
    return GrupoResponse(
        id=g.id,
        nombre=g.nombre,
        descripcion=g.descripcion,
        es_sistema=g.es_sistema,
        permisos=formatted_permisos,
        total_usuarios=user_count
    )


@router.get("", response_model=List[GrupoResponse])
def listar_grupos(
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    List all functional municipal groups and their granular permission matrix.
    Restricted to ADMINISTRADOR according to Ley 21.719 RBAC rules.
    """
    grupos = db.query(Grupo).order_by(Grupo.es_sistema.desc(), Grupo.nombre.asc()).all()
    return [_format_grupo_response(g, db) for g in grupos]


@router.post("", response_model=GrupoResponse, status_code=status.HTTP_201_CREATED)
def crear_grupo(
    req: GrupoCreateRequest,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Create a new customized municipal role group with granular permissions:
    NONE, READ, or WRITE for each functional module.
    """
    nombre_clean = req.nombre.strip()
    existing = db.query(Grupo).filter(Grupo.nombre == nombre_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un grupo con el nombre '{nombre_clean}'.")

    nuevo_grupo = Grupo(
        nombre=nombre_clean,
        descripcion=req.descripcion.strip() if req.descripcion else None,
        es_sistema=False
    )
    db.add(nuevo_grupo)
    db.flush()

    # Create permissions
    provided_permisos = {p.modulo.upper(): p.acceso.upper() for p in req.permisos}
    for mod in DEFAULT_MODULES:
        acc = provided_permisos.get(mod, NivelAcceso.NONE.value)
        if acc not in [NivelAcceso.NONE.value, NivelAcceso.READ.value, NivelAcceso.WRITE.value]:
            acc = NivelAcceso.NONE.value
        db.add(GrupoPermiso(grupo_id=nuevo_grupo.id, modulo=mod, acceso=acc))

    db.commit()
    db.refresh(nuevo_grupo)

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="CREAR_GRUPO",
        entidad="core.tb_grupo",
        registro_id=str(nuevo_grupo.id),
        payload_posterior={
            "id": nuevo_grupo.id,
            "nombre": nuevo_grupo.nombre,
            "descripcion": nuevo_grupo.descripcion,
            "permisos": provided_permisos
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return _format_grupo_response(nuevo_grupo, db)


@router.get("/{grupo_id}", response_model=GrupoResponse)
def obtener_grupo(
    grupo_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group details and full permission matrix."""
    if current_user.rol != RolUsuario.ADMINISTRADOR.value and current_user.grupo_id != grupo_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación restringida. No autorizado para consultar este grupo."
        )
    g = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")
    return _format_grupo_response(g, db)


@router.put("/{grupo_id}", response_model=GrupoResponse)
def actualizar_grupo(
    grupo_id: int,
    req: GrupoUpdateRequest,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Update group name, description, and permission matrix (NONE, READ, WRITE).
    """
    g = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    if req.nombre:
        nombre_clean = req.nombre.strip()
        dupe = db.query(Grupo).filter(Grupo.nombre == nombre_clean, Grupo.id != grupo_id).first()
        if dupe:
            raise HTTPException(status_code=400, detail=f"Ya existe otro grupo con el nombre '{nombre_clean}'.")
        g.nombre = nombre_clean

    if req.descripcion is not None:
        g.descripcion = req.descripcion.strip() if req.descripcion else None

    # Update permissions if specified
    if req.permisos is not None:
        perm_dict = {p.modulo.upper(): p.acceso.upper() for p in req.permisos}
        for gp in g.permisos:
            if gp.modulo in perm_dict:
                acc = perm_dict[gp.modulo]
                if acc in [NivelAcceso.NONE.value, NivelAcceso.READ.value, NivelAcceso.WRITE.value]:
                    gp.acceso = acc
        # Add any missing modules
        existing_mods = {gp.modulo for gp in g.permisos}
        for mod in DEFAULT_MODULES:
            if mod not in existing_mods:
                acc = perm_dict.get(mod, NivelAcceso.NONE.value)
                db.add(GrupoPermiso(grupo_id=g.id, modulo=mod, acceso=acc))

    db.commit()
    db.refresh(g)

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="MODIFICAR_GRUPO",
        entidad="core.tb_grupo",
        registro_id=str(g.id),
        payload_posterior={
            "id": g.id,
            "nombre": g.nombre,
            "descripcion": g.descripcion,
            "permisos": {p.modulo: p.acceso for p in g.permisos}
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return _format_grupo_response(g, db)


@router.delete("/{grupo_id}")
def eliminar_grupo(
    grupo_id: int,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Delete a custom municipal group.
    System protected groups (Administradores Generales, etc.) cannot be deleted.
    """
    g = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    if g.es_sistema:
        raise HTTPException(status_code=400, detail="Los grupos base del sistema no pueden ser eliminados.")

    # Unlink users
    db.query(Usuario).filter(Usuario.grupo_id == grupo_id).update({Usuario.grupo_id: None})

    db.delete(g)
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="ELIMINAR_GRUPO",
        entidad="core.tb_grupo",
        registro_id=str(grupo_id),
        payload_posterior={"grupo_eliminado": g.nombre},
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {"message": f"Grupo '{g.nombre}' eliminado exitosamente."}


@router.post("/{grupo_id}/usuarios/{usuario_id}")
def asignar_usuario_a_grupo(
    grupo_id: int,
    usuario_id: int,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """Assign an individual user account to a specific municipal group."""
    g = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado.")

    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    u.grupo_id = g.id
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="ASIGNAR_GRUPO_USUARIO",
        entidad="core.tb_usuario",
        registro_id=str(u.id),
        payload_posterior={"usuario": u.username, "grupo_asignado": g.nombre},
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {"message": f"Usuario {u.username} asignado al grupo '{g.nombre}' exitosamente."}
