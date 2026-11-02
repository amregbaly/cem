from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    nombre_completo: str
    requires_2fa: bool = False


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPVerifyRequest(BaseModel):
    code: str


class UsuarioCreateRequest(BaseModel):
    username: str
    email: Optional[str] = None
    rut: Optional[str] = None
    nombre_completo: str
    password: str
    rol: str = "ADMINISTRATIVO"
    grupo_id: Optional[int] = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    rut: Optional[str] = None
    nombre_completo: str
    rol: str
    grupo_id: Optional[int] = None
    grupo_nombre: Optional[str] = None
    activo: bool
    totp_enabled: bool = False
    intentos_fallidos: int = 0
    bloqueado_hasta: Optional[str] = None
    ultimo_acceso: Optional[str] = None


