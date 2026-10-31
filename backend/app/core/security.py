from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union
import bcrypt
import pyotp
from jose import jwt
from app.core.config import settings


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
