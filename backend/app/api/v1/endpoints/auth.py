from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Usuario, RolUsuario
from app.domain.schemas.auth import Token, LoginRequest, TOTPSetupResponse, TOTPVerifyRequest
from app.core.security import (
    verify_password,
    create_access_token,
    generate_totp_secret,
    get_totp_provisioning_uri,
    verify_totp_code
)
from app.api.deps import get_current_user
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user. Enforces TOTP 2FA for Administrator and Administrative accounts if enabled.
    """
    user = db.query(Usuario).filter(Usuario.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
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

    user.ultimo_acceso = datetime.now(timezone.utc)
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
        username=user.username,
        nombre_completo=user.nombre_completo,
        requires_2fa=False
    )


@router.get("/me")
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Get authenticated user profile."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "nombre_completo": current_user.nombre_completo,
        "rut": current_user.rut,
        "rol": current_user.rol,
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
