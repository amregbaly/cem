"""
AST-01: AI Assistant configuration model.
Stores encrypted provider credentials and module settings.
Table: core.tb_asistente_config
"""
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base, TimestampMixin


class AsistenteConfig(Base, TimestampMixin):
    """
    Single-row settings table for the AI assistant module.
    Only ADMINISTRADOR role can read or write this table.
    The api_key_enc field stores an AES-GCM envelope-encrypted blob;
    plaintext is never written to the database.
    """
    __tablename__ = "tb_asistente_config"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)

    # Feature flag — module is off by default
    habilitado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Provider: gemini | openai | openrouter | anthropic
    proveedor: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Model name string e.g. "gemini-1.5-flash", "gpt-4o-mini"
    modelo: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    # AES-GCM encrypted blob: base64(nonce + ciphertext + tag)
    api_key_enc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Max tokens the assistant may return per response
    max_tokens: Mapped[int] = mapped_column(Integer, default=512, nullable=False)

    # Temperature 0-2, stored as integer × 10 (e.g. 7 → 0.7)
    temperatura_x10: Mapped[int] = mapped_column(Integer, default=7, nullable=False)

    def __repr__(self) -> str:
        return (
            f"<AsistenteConfig(habilitado={self.habilitado}, "
            f"proveedor='{self.proveedor}', modelo='{self.modelo}')>"
        )
