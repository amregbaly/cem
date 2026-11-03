from typing import Optional, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.infrastructure.db.session import get_db
from app.domain.models.usuario import Usuario, RolUsuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[Usuario]:
    """Returns the authenticated user or None if anonymous (visitor mode)."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None

    user = db.query(Usuario).filter(Usuario.username == username).first()
    return user


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Usuario:
    """Enforces authentication."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None or not user.activo:
        raise credentials_exception
    return user


def require_role(*roles):
    """Enforces that current user belongs to one of the specified roles."""
    allowed = set()
    for r in roles:
        if isinstance(r, (list, tuple, set)):
            allowed.update(r)
        else:
            allowed.add(r)

    def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operación restringida. Se requiere rol: {', '.join(allowed)}"
            )
        return current_user
    return role_checker


def require_module_access(modulo: str, min_level: str = "READ"):
    """
    Checks granular RBAC access against tb_grupo_permiso.
    Administrators (rol == RolUsuario.ADMINISTRADOR) always have full access.
    Other users must belong to a group with at least min_level access for the given module.
    """
    def permission_checker(
        current_user: Usuario = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> Usuario:
        # Administrators always have access
        if current_user.rol == RolUsuario.ADMINISTRADOR.value or current_user.rol == "ADMINISTRADOR":
            return current_user

        if not current_user.grupo_id:
            from app.domain.models.grupo import Grupo
            if current_user.rol == RolUsuario.ADMINISTRATIVO.value or current_user.rol == "ADMINISTRATIVO":
                grp = db.query(Grupo).filter_by(nombre="Operadores de Cementerio").first()
                if grp:
                    current_user.grupo_id = grp.id
                    db.commit()
            elif current_user.rol == RolUsuario.VISITA.value or current_user.rol == "VISITA":
                grp = db.query(Grupo).filter_by(nombre="Atención Ciudadana y Auditoría").first()
                if grp:
                    current_user.grupo_id = grp.id
                    db.commit()

        if not current_user.grupo_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: El usuario no tiene un grupo asignado para acceder al módulo {modulo}."
            )

        from app.domain.models.grupo import GrupoPermiso, NivelAcceso
        perm = db.query(GrupoPermiso).filter_by(grupo_id=current_user.grupo_id, modulo=modulo).first()
        if not perm or perm.acceso == NivelAcceso.NONE.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: Su grupo no tiene permisos asignados para el módulo {modulo}."
            )

        if min_level == "WRITE" and perm.acceso != NivelAcceso.WRITE.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: Se requieren permisos de escritura para el módulo {modulo}."
            )

        return current_user
    return permission_checker

