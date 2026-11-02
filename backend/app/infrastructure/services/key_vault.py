"""
AST-02: Envelope encryption service for AI provider API keys.

Strategy: AES-256-GCM with a per-operation random 96-bit nonce.
The master encryption key (MEK) is derived from SECRET_KEY using HKDF-SHA256
with a fixed info label, so it is never the raw JWT signing key.

Stored blob format (URL-safe base64):
    base64url( nonce[12] || ciphertext[n] || tag[16] )

The plaintext API key is never logged, returned in full, or stored in plaintext.
"""
import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from app.core.config import settings

# Fixed derivation info label — change → all stored keys become unreadable
_INFO = b"cem-asistente-key-encryption-v1"
_KEY_LEN = 32  # AES-256


def _derive_mek() -> bytes:
    """Derive master encryption key from app SECRET_KEY via HKDF-SHA256."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=_KEY_LEN,
        salt=None,
        info=_INFO,
    )
    return hkdf.derive(settings.SECRET_KEY.encode())


def encrypt_api_key(plaintext: str) -> str:
    """
    Encrypt a plaintext API key.
    Returns URL-safe base64 encoded blob (nonce + ciphertext + tag).
    """
    if not plaintext:
        raise ValueError("API key cannot be empty")
    mek = _derive_mek()
    nonce = os.urandom(12)  # 96-bit random nonce
    aesgcm = AESGCM(mek)
    ct_with_tag = aesgcm.encrypt(nonce, plaintext.encode(), None)
    blob = nonce + ct_with_tag
    return base64.urlsafe_b64encode(blob).decode()


def decrypt_api_key(blob: str) -> str:
    """
    Decrypt an AES-GCM encrypted API key blob.
    Raises ValueError on authentication failure (tampered data).
    """
    if not blob:
        raise ValueError("No encrypted key blob provided")
    mek = _derive_mek()
    raw = base64.urlsafe_b64decode(blob.encode())
    nonce = raw[:12]
    ct_with_tag = raw[12:]
    aesgcm = AESGCM(mek)
    try:
        plaintext = aesgcm.decrypt(nonce, ct_with_tag, None)
        return plaintext.decode()
    except Exception:
        raise ValueError("API key decryption failed — data may be corrupt or key rotated")


def mask_api_key(plaintext: str) -> str:
    """Return a safely masked display of an API key (first 4 + dots + last 4)."""
    if not plaintext or len(plaintext) < 12:
        return "••••••••"
    return plaintext[:4] + "••••••••" + plaintext[-4:]
