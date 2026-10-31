"""Initial Sprint 1 multi-schema models

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-31 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure schemas exist
    op.execute("CREATE SCHEMA IF NOT EXISTS core;")
    op.execute("CREATE SCHEMA IF NOT EXISTS staging;")
    op.execute("CREATE SCHEMA IF NOT EXISTS migration;")
    op.execute("CREATE SCHEMA IF NOT EXISTS audit;")

    # 2. core.tb_cementerio
    op.create_table(
        "tb_cementerio",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codigo", sa.String(length=20), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("comuna", sa.String(length=50), nullable=False, server_default="San Carlos"),
        sa.Column("region", sa.String(length=50), nullable=False, server_default="Ñuble"),
        sa.Column("direccion", sa.String(length=255), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
        schema="core"
    )

    # 3. core.tb_ubicacion
    op.create_table(
        "tb_ubicacion",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("cementerio_id", sa.Integer(), nullable=False),
        sa.Column("tipo_ubicacion", sa.String(length=10), nullable=False),
        sa.Column("sector_codigo", sa.String(length=20), nullable=False),
        sa.Column("fila", sa.String(length=20), nullable=False, server_default="0"),
        sa.Column("numero", sa.String(length=20), nullable=False),
        sa.Column("capacidad_total", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("capacidad_ocupada", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="DISPONIBLE"),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("legacy_codigo_interno", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["cementerio_id"], ["core.tb_cementerio.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cementerio_id", "tipo_ubicacion", "sector_codigo", "fila", "numero", name="uq_ubicacion_coords"),
        schema="core"
    )

    # 4. core.tb_persona
    op.create_table(
        "tb_persona",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rut", sa.String(length=15), nullable=True),
        sa.Column("rut_cuerpo", sa.Integer(), nullable=True),
        sa.Column("rut_dv", sa.String(length=1), nullable=True),
        sa.Column("rut_validado", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("nombres", sa.String(length=100), nullable=True),
        sa.Column("apellido_paterno", sa.String(length=60), nullable=True),
        sa.Column("apellido_materno", sa.String(length=60), nullable=True),
        sa.Column("nombre_completo", sa.String(length=220), nullable=False),
        sa.Column("fecha_nacimiento", sa.Date(), nullable=True),
        sa.Column("fecha_nacimiento_desconocida", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("es_nn", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("telefono", sa.String(length=30), nullable=True),
        sa.Column("celular", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("comuna_id", sa.Integer(), nullable=True),
        sa.Column("comuna_nombre", sa.String(length=100), nullable=True),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="core"
    )

    # 5. core.tb_derecho
    op.create_table(
        "tb_derecho",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ubicacion_id", sa.Integer(), nullable=False),
        sa.Column("titular_persona_id", sa.Integer(), nullable=False),
        sa.Column("tipo_derecho", sa.String(length=20), nullable=False, server_default="ARRIENDO"),
        sa.Column("periodo_arriendo", sa.String(length=20), nullable=False, server_default="5_ANOS"),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_vencimiento", sa.Date(), nullable=True),
        sa.Column("monto_pagado", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
        sa.Column("folio_recibo", sa.String(length=50), nullable=True),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="VIGENTE"),
        sa.Column("titular_anterior_id", sa.Integer(), nullable=True),
        sa.Column("fecha_transferencia", sa.Date(), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("legacy_ven_id", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["titular_persona_id"], ["core.tb_persona.id"]),
        sa.ForeignKeyConstraint(["titular_anterior_id"], ["core.tb_persona.id"]),
        sa.ForeignKeyConstraint(["ubicacion_id"], ["core.tb_ubicacion.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="core"
    )

    # 6. core.tb_inhumacion
    op.create_table(
        "tb_inhumacion",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ubicacion_id", sa.Integer(), nullable=False),
        sa.Column("fallecido_persona_id", sa.Integer(), nullable=False),
        sa.Column("numero_ingreso", sa.String(length=30), nullable=False),
        sa.Column("fecha_defuncion", sa.Date(), nullable=True),
        sa.Column("fecha_sepultacion", sa.Date(), nullable=False),
        sa.Column("causa_fallecimiento", sa.Text(), nullable=True),
        sa.Column("comuna_defuncion_id", sa.Integer(), nullable=True),
        sa.Column("comuna_defuncion_nombre", sa.String(length=100), nullable=True),
        sa.Column("pase_sepultacion_doc_url", sa.String(length=255), nullable=True),
        sa.Column("pase_sepultacion_folio", sa.String(length=50), nullable=True),
        sa.Column("reduccion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("legacy_fall_id", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["fallecido_persona_id"], ["core.tb_persona.id"]),
        sa.ForeignKeyConstraint(["ubicacion_id"], ["core.tb_ubicacion.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="core"
    )

    # 7. core.tb_exhumacion
    op.create_table(
        "tb_exhumacion",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("inhumacion_id", sa.Integer(), nullable=False),
        sa.Column("ubicacion_origen_id", sa.Integer(), nullable=False),
        sa.Column("ubicacion_destino_id", sa.Integer(), nullable=True),
        sa.Column("destino_externo", sa.String(length=255), nullable=True),
        sa.Column("correlativo_memo", sa.String(length=50), nullable=True),
        sa.Column("fecha_exhumacion", sa.Date(), nullable=False),
        sa.Column("hora_exhumacion", sa.String(length=10), nullable=True),
        sa.Column("resolucion_numero", sa.String(length=50), nullable=True),
        sa.Column("fecha_resolucion", sa.Date(), nullable=True),
        sa.Column("familiar_solicitante_id", sa.Integer(), nullable=True),
        sa.Column("motivo", sa.Text(), nullable=False),
        sa.Column("tipo_exhumacion_id", sa.Integer(), nullable=True),
        sa.Column("libera_ubicacion_origen", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("es_reduccion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["familiar_solicitante_id"], ["core.tb_persona.id"]),
        sa.ForeignKeyConstraint(["inhumacion_id"], ["core.tb_inhumacion.id"]),
        sa.ForeignKeyConstraint(["ubicacion_destino_id"], ["core.tb_ubicacion.id"]),
        sa.ForeignKeyConstraint(["ubicacion_origen_id"], ["core.tb_ubicacion.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="core"
    )

    # 8. core.tb_maestros & core.tb_derechos_maestros
    op.create_table(
        "tb_maestros",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rut", sa.String(length=15), nullable=False),
        sa.Column("nombres", sa.String(length=100), nullable=False),
        sa.Column("apellido_paterno", sa.String(length=60), nullable=False),
        sa.Column("apellido_materno", sa.String(length=60), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("telefono", sa.String(length=30), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rut"),
        schema="core"
    )

    op.create_table(
        "tb_derechos_maestros",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("orden_ingreso", sa.String(length=30), nullable=False),
        sa.Column("maestro_id", sa.Integer(), nullable=True),
        sa.Column("rut_maestro_legacy", sa.String(length=15), nullable=True),
        sa.Column("ubicacion_id", sa.Integer(), nullable=False),
        sa.Column("fecha_orden", sa.Date(), nullable=False),
        sa.Column("tipo_trabajo", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("origen_migracion", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("source_sheet", sa.String(length=50), nullable=True),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["maestro_id"], ["core.tb_maestros.id"]),
        sa.ForeignKeyConstraint(["ubicacion_id"], ["core.tb_ubicacion.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="core"
    )

    # 9. core.tb_usuario & core.tb_config_tema
    op.create_table(
        "tb_usuario",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("rut", sa.String(length=15), nullable=True),
        sa.Column("nombre_completo", sa.String(length=150), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("rol", sa.String(length=30), nullable=False, server_default="ADMINISTRATIVO"),
        sa.Column("totp_secret", sa.String(length=64), nullable=True),
        sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("ultimo_acceso", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("email"),
        schema="core"
    )

    op.create_table(
        "tb_config_tema",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=50), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("es_activo", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("es_modo_oscuro", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("es_sistema", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("color_primario", sa.String(length=10), nullable=False),
        sa.Column("color_secundario", sa.String(length=10), nullable=False),
        sa.Column("color_acento", sa.String(length=10), nullable=False),
        sa.Column("color_fondo", sa.String(length=10), nullable=False),
        sa.Column("color_superficie", sa.String(length=10), nullable=False),
        sa.Column("color_texto", sa.String(length=10), nullable=False),
        sa.Column("color_borde", sa.String(length=10), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        schema="core"
    )

    # 10. audit.tb_log_auditoria
    op.create_table(
        "tb_log_auditoria",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("username", sa.String(length=50), nullable=False, server_default="SISTEMA"),
        sa.Column("user_rut", sa.String(length=15), nullable=True),
        sa.Column("user_role", sa.String(length=30), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True, server_default="127.0.0.1"),
        sa.Column("modulo", sa.String(length=50), nullable=False),
        sa.Column("accion", sa.String(length=20), nullable=False),
        sa.Column("entidad", sa.String(length=60), nullable=False),
        sa.Column("registro_id", sa.String(length=50), nullable=False),
        sa.Column("payload_anterior", sa.JSON(), nullable=True),
        sa.Column("payload_posterior", sa.JSON(), nullable=True),
        sa.Column("hash_anterior", sa.String(length=64), nullable=False),
        sa.Column("hash_registro", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="audit"
    )

    # 11. migration tables
    op.create_table(
        "tb_excepcion_migracion",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("hoja_origen", sa.String(length=50), nullable=False),
        sa.Column("fila_origen", sa.Integer(), nullable=False),
        sa.Column("regla_id", sa.String(length=20), nullable=False),
        sa.Column("campo", sa.String(length=50), nullable=False),
        sa.Column("valor_original", sa.Text(), nullable=True),
        sa.Column("motivo_excepcion", sa.Text(), nullable=False),
        sa.Column("resuelto", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolucion_nota", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="migration"
    )

    op.create_table(
        "tb_reconciliacion_migracion",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("hoja_origen", sa.String(length=50), nullable=False),
        sa.Column("total_filas_origen", sa.Integer(), nullable=False),
        sa.Column("registros_migrados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("registros_excepcion", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("registros_descartados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("justificacion_descarte", sa.Text(), nullable=True),
        sa.Column("conciliacion_cuadra", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hoja_origen"),
        schema="migration"
    )


def downgrade() -> None:
    op.drop_table("tb_reconciliacion_migracion", schema="migration")
    op.drop_table("tb_excepcion_migracion", schema="migration")
    op.drop_table("tb_log_auditoria", schema="audit")
    op.drop_table("tb_config_tema", schema="core")
    op.drop_table("tb_usuario", schema="core")
    op.drop_table("tb_derechos_maestros", schema="core")
    op.drop_table("tb_maestros", schema="core")
    op.drop_table("tb_exhumacion", schema="core")
    op.drop_table("tb_inhumacion", schema="core")
    op.drop_table("tb_derecho", schema="core")
    op.drop_table("tb_persona", schema="core")
    op.drop_table("tb_ubicacion", schema="core")
    op.drop_table("tb_cementerio", schema="core")
