from typing import Optional
from sqlalchemy import String, Integer, BigInteger, Boolean, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base, TimestampMixin


class ExcepcionMigracion(Base, TimestampMixin):
    """
    Migration Exception Log (Rules R1-R12).
    Table: migration.tb_excepcion_migracion
    Tracks any non-conformant data (invalid RUTs, ambiguous names, malformed dates, corrupted chars)
    for Municipal review and sign-off without ever discarding data.
    """
    __tablename__ = "tb_excepcion_migracion"
    __table_args__ = (
        Index("idx_excepcion_hoja_fila", "hoja_origen", "fila_origen"),
        Index("idx_excepcion_regla", "regla_id"),
        Index("idx_excepcion_resuelto", "resuelto"),
        {"schema": "migration"}
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True
    )
    hoja_origen: Mapped[str] = mapped_column(String(50), nullable=False)
    fila_origen: Mapped[int] = mapped_column(Integer, nullable=False)
    regla_id: Mapped[str] = mapped_column(String(20), nullable=False)  # R1_RUT, R2_NOMBRES, R3_FECHAS, etc.
    campo: Mapped[str] = mapped_column(String(50), nullable=False)
    valor_original: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motivo_excepcion: Mapped[str] = mapped_column(Text, nullable=False)
    
    resuelto: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolucion_nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<ExcepcionMigracion(hoja='{self.hoja_origen}', fila={self.fila_origen}, regla='{self.regla_id}')>"


class ReconciliacionMigracion(Base, TimestampMixin):
    """
    Reconciliation Balance Record.
    Table: migration.tb_reconciliacion_migracion
    Enforces the formula: Migrated + Exceptions + Discarded = Total Source Rows.
    """
    __tablename__ = "tb_reconciliacion_migracion"
    __table_args__ = (
        Index("idx_reconciliacion_hoja", "hoja_origen"),
        {"schema": "migration"}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hoja_origen: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    total_filas_origen: Mapped[int] = mapped_column(Integer, nullable=False)
    registros_migrados: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    registros_excepcion: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    registros_descartados: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    justificacion_descarte: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    conciliacion_cuadra: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<ReconciliacionMigracion(hoja='{self.hoja_origen}', total={self.total_filas_origen}, cuadra={self.conciliacion_cuadra})>"
