from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Usuario, RolUsuario
from app.domain.schemas.auth import (
    Token, LoginRequest, TOTPSetupResponse, TOTPVerifyRequest,
    UsuarioCreateRequest, UsuarioResponse, UsuarioUpdateRequest,
    AdminChangePasswordRequest
)
from etl.rut_validator import validate_and_format_rut
from app.core.security import (
    verify_password,
    get_password_hash,
    validate_password_policy,
    create_access_token,
    generate_totp_secret,
    get_totp_provisioning_uri,
    verify_totp_code
)
from app.api.deps import get_current_user, require_role
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=12)


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user.
    Enforces:
    - Account lockout after 5 consecutive failed login attempts (Ley 21.719 / ASVS L2).
    - TOTP 2FA for Administrator and Administrative accounts if enabled.
    """
    user = db.query(Usuario).filter(Usuario.username == login_data.username).first()
    now_utc = datetime.now(timezone.utc)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos."
        )

    # Check if account is locked out
    if user.bloqueado_hasta:
        # Normalize timezone if needed
        locked_time = user.bloqueado_hasta if user.bloqueado_hasta.tzinfo else user.bloqueado_hasta.replace(tzinfo=timezone.utc)
        if locked_time > now_utc:
            remaining_mins = max(1, int((locked_time - now_utc).total_seconds() / 60))
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Cuenta bloqueada por 5 intentos fallidos consecutivos. Desbloqueo automático en ~{remaining_mins} minutos o contacte al Administrador."
            )
        else:
            # Lockout expired, reset
            user.bloqueado_hasta = None
            user.intentos_fallidos = 0
            db.commit()

    if not verify_password(login_data.password, user.hashed_password):
        # Increment failed attempts
        user.intentos_fallidos = (user.intentos_fallidos or 0) + 1
        if user.intentos_fallidos >= 5:
            user.bloqueado_hasta = now_utc + timedelta(minutes=15)
            AuditService.log_mutation(
                session=db,
                modulo="SEGURIDAD",
                accion="BLOQUEO_CUENTA",
                entidad="core.tb_usuario",
                registro_id=str(user.id),
                payload_posterior={"motivo": "5 intentos fallidos consecutivos", "bloqueado_hasta": user.bloqueado_hasta.isoformat()},
                user_id=user.id,
                username=user.username,
                user_rut=user.rut,
                user_role=user.rol,
                commit=False
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos."
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario inactiva. Contacte al Administrador."
        )

    # Check TOTP 2FA
    if user.totp_enabled:
        if not login_data.totp_code:
            return Token(
                access_token="",
                token_type="bearer",
                role=user.rol,
                username=user.username,
                nombre_completo=user.nombre_completo,
                requires_2fa=True
            )
        if not verify_totp_code(user.totp_secret, login_data.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Código de autenticación 2FA (TOTP) inválido."
            )

    # Successful login: reset failed attempts
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    user.ultimo_acceso = now_utc
    db.commit()

    access_token = create_access_token(subject=user.username, role=user.rol)

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="LOGIN",
        entidad="core.tb_usuario",
        registro_id=str(user.id),
        user_id=user.id,
        username=user.username,
        user_rut=user.rut,
        user_role=user.rol,
        commit=True
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.rol,
        rol=user.rol,
        grupo_id=user.grupo_id,
        username=user.username,
        nombre_completo=user.nombre_completo,
        requires_2fa=False
    )


@router.get("/me")
def get_me(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get authenticated user profile."""
    permisos = {}
    if current_user.rol == RolUsuario.ADMINISTRADOR.value:
        # Full access for administrators
        from app.domain.models.grupo import ModuloSistema
        for mod in ModuloSistema:
            permisos[mod.value] = "WRITE"
    elif current_user.grupo:
        for p in current_user.grupo.permisos:
            permisos[p.modulo] = p.acceso

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "nombre_completo": current_user.nombre_completo,
        "rut": current_user.rut,
        "rol": current_user.rol,
        "role": current_user.rol,
        "grupo_id": current_user.grupo_id,
        "grupo_nombre": current_user.grupo.nombre if current_user.grupo else None,
        "permisos": permisos,
        "totp_enabled": current_user.totp_enabled
    }


@router.post("/totp/setup", response_model=TOTPSetupResponse)
def setup_totp(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate TOTP secret and provisioning URI for authenticator apps."""
    secret = generate_totp_secret()
    current_user.totp_secret = secret
    db.commit()

    uri = get_totp_provisioning_uri(current_user.username, secret)
    return TOTPSetupResponse(secret=secret, provisioning_uri=uri)


@router.post("/totp/verify")
def verify_and_enable_totp(
    req: TOTPVerifyRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify code and activate 2FA for current user."""
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Primero debe generar una clave TOTP con /totp/setup.")

    if not verify_totp_code(current_user.totp_secret, req.code):
        raise HTTPException(status_code=400, detail="Código TOTP inválido.")

    current_user.totp_enabled = True
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="ACTIVAR_2FA",
        entidad="core.tb_usuario",
        registro_id=str(current_user.id),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {"message": "Doble factor de autenticación (TOTP 2FA) activado exitosamente."}


@router.post("/cambiar-password")
def cambiar_password(
    req: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password with strict validation:
    - Verifies current password.
    - Validates minimum 12 chars and checks against breached databases.
    - Logs audit trail.
    """
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")

    is_valid, msg = validate_password_policy(req.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.ultimo_cambio_clave = datetime.now(timezone.utc)
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="CAMBIO_PASSWORD",
        entidad="core.tb_usuario",
        registro_id=str(current_user.id),
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {"message": "Contraseña actualizada exitosamente en cumplimiento con Ley 21.719 y ASVS L2."}


@router.post("/usuarios/{usuario_id}/desbloquear")
def desbloquear_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Administrative unlock for locked accounts (after 5 failed attempts).
    """
    target = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    target.intentos_fallidos = 0
    target.bloqueado_hasta = None
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="DESBLOQUEO_CUENTA",
        entidad="core.tb_usuario",
        registro_id=str(target.id),
        payload_posterior={"usuario_desbloqueado": target.username},
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {"message": f"Usuario {target.username} desbloqueado exitosamente."}


@router.get("/usuarios")
def listar_usuarios(
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """List all user accounts with their status, lockout state, and assigned group."""
    users = db.query(Usuario).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "nombre_completo": u.nombre_completo,
            "rut": u.rut,
            "rol": u.rol,
            "grupo_id": u.grupo_id,
            "grupo_nombre": u.grupo.nombre if u.grupo else None,
            "activo": u.activo,
            "totp_enabled": u.totp_enabled,
            "intentos_fallidos": u.intentos_fallidos,
            "bloqueado_hasta": u.bloqueado_hasta.isoformat() if u.bloqueado_hasta else None,
            "ultimo_acceso": u.ultimo_acceso.isoformat() if u.ultimo_acceso else None
        }
        for u in users
    ]


@router.post("/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    req: UsuarioCreateRequest,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Create a new user account with strict municipal validation:
    - RUT validation (Módulo 11 format).
    - Password policy enforcement (min 12 chars).
    - Role assignment (ADMINISTRADOR, ADMINISTRATIVO, VISITA).
    - Optional Group assignment (RBAC).
    - Append-only cryptographic audit logging (HMAC SHA-256).
    """
    # Check username uniqueness
    existing_username = db.query(Usuario).filter(Usuario.username == req.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail=f"El nombre de usuario '{req.username}' ya se encuentra registrado.")

    # Check email uniqueness if provided
    if req.email:
        existing_email = db.query(Usuario).filter(Usuario.email == req.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail=f"El correo electrónico '{req.email}' ya está registrado.")

    # Validate RUT if provided
    clean_rut = None
    if req.rut:
        is_valid_rut, formatted_rut, _, _ = validate_and_format_rut(req.rut)
        if not is_valid_rut:
            raise HTTPException(status_code=400, detail="RUT inválido. Debe cumplir con el algoritmo chileno Módulo 11 (ej: 12345678-5).")
        clean_rut = formatted_rut

    # Validate password policy
    is_valid_pw, pw_msg = validate_password_policy(req.password)
    if not is_valid_pw:
        raise HTTPException(status_code=400, detail=pw_msg)

    # Validate role
    role_val = req.rol.upper()
    valid_roles = [r.value for r in RolUsuario]
    if role_val not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rol inválido. Roles válidos: {', '.join(valid_roles)}")

    # Validate grupo if specified
    grupo_nombre = None
    if req.grupo_id:
        from app.domain.models.grupo import Grupo
        grupo = db.query(Grupo).filter(Grupo.id == req.grupo_id).first()
        if not grupo:
            raise HTTPException(status_code=404, detail="El grupo seleccionado no existe.")
        grupo_nombre = grupo.nombre

    new_user = Usuario(
        username=req.username.strip(),
        email=req.email.strip() if req.email else None,
        rut=clean_rut,
        nombre_completo=req.nombre_completo.strip(),
        hashed_password=get_password_hash(req.password),
        rol=role_val,
        grupo_id=req.grupo_id,
        activo=True,
        ultimo_cambio_clave=datetime.now(timezone.utc)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Cryptographic audit logging
    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="CREAR_USUARIO",
        entidad="core.tb_usuario",
        registro_id=str(new_user.id),
        payload_posterior={
            "id": new_user.id,
            "username": new_user.username,
            "nombre_completo": new_user.nombre_completo,
            "rut": new_user.rut,
            "rol": new_user.rol,
            "grupo_id": new_user.grupo_id
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return UsuarioResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        rut=new_user.rut,
        nombre_completo=new_user.nombre_completo,
        rol=new_user.rol,
        grupo_id=new_user.grupo_id,
        grupo_nombre=grupo_nombre,
        activo=new_user.activo,
        totp_enabled=new_user.totp_enabled,
        intentos_fallidos=new_user.intentos_fallidos,
        bloqueado_hasta=new_user.bloqueado_hasta.isoformat() if new_user.bloqueado_hasta else None,
        ultimo_acceso=new_user.ultimo_acceso.isoformat() if new_user.ultimo_acceso else None
    )


@router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
@router.patch("/usuarios/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    req: UsuarioUpdateRequest,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Update an existing user account:
    - Allows updating full name, email, RUT (with Modulo 11 validation), role, group, and active status.
    - Prevents duplicate email if email is modified.
    - Generates immutable cryptographic audit log (HMAC SHA-256).
    """
    target = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    payload_anterior = {
        "id": target.id,
        "username": target.username,
        "nombre_completo": target.nombre_completo,
        "email": target.email,
        "rut": target.rut,
        "rol": target.rol,
        "grupo_id": target.grupo_id,
        "activo": target.activo,
    }

    if req.nombre_completo is not None:
        target.nombre_completo = req.nombre_completo.strip()

    if req.email is not None:
        clean_email = req.email.strip() if req.email else None
        if clean_email and clean_email != target.email:
            existing_email = db.query(Usuario).filter(Usuario.email == clean_email, Usuario.id != usuario_id).first()
            if existing_email:
                raise HTTPException(status_code=400, detail=f"El correo electrónico '{clean_email}' ya está registrado.")
        target.email = clean_email

    if req.rut is not None:
        if req.rut.strip():
            is_valid_rut, formatted_rut, _, _ = validate_and_format_rut(req.rut)
            if not is_valid_rut:
                raise HTTPException(status_code=400, detail="RUT inválido. Debe cumplir con el algoritmo chileno Módulo 11 (ej: 12345678-5).")
            target.rut = formatted_rut
        else:
            target.rut = None

    if req.rol is not None:
        role_val = req.rol.upper()
        valid_roles = [r.value for r in RolUsuario]
        if role_val not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Rol inválido. Roles válidos: {', '.join(valid_roles)}")
        target.rol = role_val

    if req.grupo_id is not None:
        if req.grupo_id == 0 or req.grupo_id == -1:
            target.grupo_id = None
        else:
            from app.domain.models.grupo import Grupo
            grupo = db.query(Grupo).filter(Grupo.id == req.grupo_id).first()
            if not grupo:
                raise HTTPException(status_code=404, detail="El grupo seleccionado no existe.")
            target.grupo_id = req.grupo_id

    if req.activo is not None:
        target.activo = req.activo

    db.commit()
    db.refresh(target)

    grupo_nombre = target.grupo.nombre if target.grupo else None

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="EDITAR_USUARIO",
        entidad="core.tb_usuario",
        registro_id=str(target.id),
        payload_anterior=payload_anterior,
        payload_posterior={
            "id": target.id,
            "username": target.username,
            "nombre_completo": target.nombre_completo,
            "email": target.email,
            "rut": target.rut,
            "rol": target.rol,
            "grupo_id": target.grupo_id,
            "activo": target.activo,
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return UsuarioResponse(
        id=target.id,
        username=target.username,
        email=target.email,
        rut=target.rut,
        nombre_completo=target.nombre_completo,
        rol=target.rol,
        grupo_id=target.grupo_id,
        grupo_nombre=grupo_nombre,
        activo=target.activo,
        totp_enabled=target.totp_enabled,
        intentos_fallidos=target.intentos_fallidos,
        bloqueado_hasta=target.bloqueado_hasta.isoformat() if target.bloqueado_hasta else None,
        ultimo_acceso=target.ultimo_acceso.isoformat() if target.ultimo_acceso else None
    )


@router.post("/usuarios/{usuario_id}/password")
def cambiar_password_usuario(
    usuario_id: int,
    req: AdminChangePasswordRequest,
    current_user: Usuario = Depends(require_role([RolUsuario.ADMINISTRADOR.value])),
    db: Session = Depends(get_db)
):
    """
    Administrative password reset or change for any user:
    - Enforces password policy (min 12 chars, complexity, breach checks).
    - Clears failed login attempts and unlocks account if locked.
    - Updates hash and logs cryptographic audit record.
    """
    target = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    is_valid_pw, pw_msg = validate_password_policy(req.new_password)
    if not is_valid_pw:
        raise HTTPException(status_code=400, detail=pw_msg)

    target.hashed_password = get_password_hash(req.new_password)
    target.intentos_fallidos = 0
    target.bloqueado_hasta = None
    target.ultimo_cambio_clave = datetime.now(timezone.utc)
    db.commit()

    AuditService.log_mutation(
        session=db,
        modulo="SEGURIDAD",
        accion="CAMBIO_PASSWORD_ADMIN",
        entidad="core.tb_usuario",
        registro_id=str(target.id),
        payload_posterior={
            "usuario_afectado": target.username,
            "cambiado_por": current_user.username,
            "motivo": "Reseteo administrativo de credenciales"
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {"message": f"Contraseña actualizada exitosamente para el usuario {target.username}."}




