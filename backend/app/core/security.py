from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union
import bcrypt
import pyotp
from jose import jwt
from app.core.config import settings


# Top common breached passwords list (ASVS L2 requirement: checked against breached password databases)
COMMON_BREACHED_PASSWORDS = {
    "password123456", "123456789012", "admin12345678", "qwertyuiopas",
    "iloveyou1234", "municipalidad123", "sancarlos2026", "cemetery2026",
    "contrasena123", "administrador1", "secretaria123", "password1234",
    "1234567890123", "welcome123456", "chile20261234"
}


def validate_password_policy(password: str) -> tuple[bool, str]:
    """
    Validates password complexity and checks against known breached password lists.
    OWASP ASVS Level 2 & Ley 21.719 requirements:
    - Minimum 12 characters
    - Must not be in common breached passwords list
    - Must contain uppercase, lowercase, and digit or symbol
    """
    if not password or len(password) < 12:
        return False, "La contraseña debe tener un mínimo de 12 caracteres."

    if password.lower() in COMMON_BREACHED_PASSWORDS:
        return False, "La contraseña ingresada figura en bases de datos de contraseñas vulneradas/comunes. Elija una más segura."

    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)

    if not (has_upper and has_lower and (has_digit or has_symbol)):
        return False, "La contraseña debe incluir mayúsculas, minúsculas y al menos un número o símbolo especial."

    return True, "OK"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")



def create_access_token(
    subject: Union[str, Any],
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# --- TOTP 2FA Helpers ---

def generate_totp_secret() -> str:
    """Generates a base32 TOTP secret for the user."""
    return pyotp.random_base32()


def get_totp_provisioning_uri(username: str, secret: str) -> str:
    """Returns the otpauth:// URI to render as a QR code for Google Authenticator / Authy."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=settings.TOTP_ISSUER)


def verify_totp_code(secret: str, code: str) -> bool:
    """Verifies a 6-digit TOTP code with a valid drift window."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)
