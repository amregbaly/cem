"""
AST-01 (Admin settings) + AST-07 (Chat endpoint)

Routes:
  GET  /asistente/config          → Admin: get current config (key masked)
  PUT  /asistente/config          → Admin: save/update config
  POST /asistente/chat            → Any authenticated user: send message
  POST /asistente/chat/reset      → Any authenticated user: reset session

Security:
  - Config read/write requires ADMINISTRADOR role.
  - Chat requires any active authenticated user.
  - API key is always masked in GET responses.
  - API key is never logged.
  - Session history is in-memory (not persisted, not returned).
  - Rate: chat limited to 30 req/min per user (sliding window, in-memory).

Audit:
  Config changes are logged to the audit trail.
  Chat calls are NOT logged (to avoid logging queries with embedded PII).
"""
from __future__ import annotations
import time
from collections import defaultdict
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.db.session import get_db
from app.api.deps import get_current_user, require_role
from app.domain.models.usuario import Usuario, RolUsuario
from app.domain.models.asistente import AsistenteConfig
from app.infrastructure.services.key_vault import encrypt_api_key, mask_api_key, decrypt_api_key
from app.infrastructure.services.asistente_chat import run_chat
from app.infrastructure.db.audit_listener import AuditService

router = APIRouter()

# ─── In-memory rate limiter ──────────────────────────────────────────────────
# Per-user sliding window: max 30 requests per 60 seconds
_rate_window: dict[int, list[float]] = defaultdict(list)
_RATE_MAX = 30
_RATE_WINDOW_SECS = 60

# ─── In-memory session storage ───────────────────────────────────────────────
# {user_id: [{"role": ..., "content": ...}, ...]}
# Never persisted to DB
_sessions: dict[int, list[dict]] = {}


def _check_rate(user_id: int) -> None:
    now = time.monotonic()
    window = _rate_window[user_id]
    # Remove timestamps older than window
    _rate_window[user_id] = [t for t in window if now - t < _RATE_WINDOW_SECS]
    if len(_rate_window[user_id]) >= _RATE_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Límite de {_RATE_MAX} mensajes por minuto alcanzado. Espera un momento.",
        )
    _rate_window[user_id].append(now)


# ─── Schemas ─────────────────────────────────────────────────────────────────

VALID_PROVIDERS = {"gemini", "openai", "openrouter", "anthropic"}


class AsistenteConfigRead(BaseModel):
    habilitado: bool
    proveedor: Optional[str]
    modelo: Optional[str]
    api_key_masked: Optional[str]
    max_tokens: int
    temperatura_x10: int

    model_config = {"from_attributes": True}


class AsistenteConfigUpdate(BaseModel):
    habilitado: bool = False
    proveedor: Optional[str] = None
    modelo: Optional[str] = None
    api_key: Optional[str] = Field(None, description="Plaintext API key — will be encrypted immediately")
    max_tokens: int = Field(512, ge=64, le=2048)
    temperatura_x10: int = Field(7, ge=0, le=20)

    @field_validator("proveedor")
    @classmethod
    def validate_provider(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PROVIDERS:
            raise ValueError(f"Proveedor inválido. Use: {', '.join(VALID_PROVIDERS)}")
        return v

    @field_validator("modelo")
    @classmethod
    def validate_model(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()[:80]
            if not v:
                return None
        return v


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=800)


class ChatResponse(BaseModel):
    reply: str
    provider: str
    model: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_or_create_config(db: Session) -> AsistenteConfig:
    cfg = db.query(AsistenteConfig).filter(AsistenteConfig.id == 1).first()
    if not cfg:
        cfg = AsistenteConfig(id=1, habilitado=False)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def _config_to_read(cfg: AsistenteConfig) -> AsistenteConfigRead:
    masked = None
    if cfg.api_key_enc:
        try:
            plain = decrypt_api_key(cfg.api_key_enc)
            masked = mask_api_key(plain)
        except Exception:
            masked = "••••••••(error de descifrado)"
    return AsistenteConfigRead(
        habilitado=cfg.habilitado,
        proveedor=cfg.proveedor,
        modelo=cfg.modelo,
        api_key_masked=masked,
        max_tokens=cfg.max_tokens,
        temperatura_x10=cfg.temperatura_x10,
    )


class AsistenteStatus(BaseModel):
    habilitado: bool
    proveedor: Optional[str] = None
    modelo: Optional[str] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/status", response_model=AsistenteStatus)
def get_asistente_status(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Any authenticated user: check if the assistant is enabled and configured."""
    cfg = _get_or_create_config(db)
    is_ready = bool(cfg.habilitado and cfg.proveedor and cfg.modelo and cfg.api_key_enc)
    return AsistenteStatus(
        habilitado=is_ready,
        proveedor=cfg.proveedor if is_ready else None,
        modelo=cfg.modelo if is_ready else None,
    )


@router.get("/config", response_model=AsistenteConfigRead)
def get_asistente_config(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR)),
):
    """Admin: get current AI assistant configuration. API key is always masked."""
    cfg = _get_or_create_config(db)
    return _config_to_read(cfg)


@router.put("/config", response_model=AsistenteConfigRead)
def update_asistente_config(
    payload: AsistenteConfigUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR)),
):
    """Admin: save AI assistant configuration."""
    cfg = _get_or_create_config(db)

    cfg.habilitado = payload.habilitado
    cfg.proveedor = payload.proveedor
    cfg.modelo = payload.modelo
    cfg.max_tokens = payload.max_tokens
    cfg.temperatura_x10 = payload.temperatura_x10

    # Encrypt the key if a new one was provided
    if payload.api_key:
        if len(payload.api_key) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La clave API debe tener al menos 8 caracteres.",
            )
        cfg.api_key_enc = encrypt_api_key(payload.api_key)

    db.commit()
    db.refresh(cfg)

    AuditService.log_mutation(
        session=db,
        modulo="ASISTENTE_IA",
        accion="CONFIGURACION_ACTUALIZADA",
        entidad="core.tb_asistente_config",
        registro_id="1",
        payload_posterior={
            "habilitado": cfg.habilitado,
            "proveedor": cfg.proveedor,
            "modelo": cfg.modelo,
            "key_updated": bool(payload.api_key),
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
    )

    return _config_to_read(cfg)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Send a message to the AI assistant.
    Requires: any active authenticated user.
    The assistant module must be enabled by an Administrator.
    """
    # Rate limiting
    _check_rate(current_user.id)

    # Load config
    cfg = _get_or_create_config(db)

    if not cfg.habilitado:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El Asistente de IA no está habilitado. Contacta al administrador.",
        )

    if not cfg.proveedor or not cfg.modelo or not cfg.api_key_enc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El Asistente de IA no está completamente configurado. Falta proveedor, modelo o clave API.",
        )

    # Get or initialize session history (in-memory only)
    history = _sessions.get(current_user.id, [])

    # Run chat
    reply, updated_history = await run_chat(
        db=db,
        user_message=req.message,
        history=history,
        proveedor=cfg.proveedor,
        modelo=cfg.modelo,
        api_key_enc=cfg.api_key_enc,
        max_tokens=cfg.max_tokens,
        temperatura_x10=cfg.temperatura_x10,
        user_role=current_user.rol,
        username=current_user.username,
    )

    # Store updated history
    _sessions[current_user.id] = updated_history

    return ChatResponse(
        reply=reply,
        provider=cfg.proveedor,
        model=cfg.modelo,
    )


@router.post("/chat/reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_chat_session(
    current_user: Usuario = Depends(get_current_user),
):
    """Clear the current user's in-memory chat session history."""
    _sessions.pop(current_user.id, None)
    _rate_window.pop(current_user.id, None)
