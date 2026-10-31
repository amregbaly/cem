from sqlalchemy import text
from sqlalchemy.orm import Session
from app.infrastructure.db.session import engine, SessionLocal
from app.domain.models import (
    Base,
    Cementerio,
    Usuario,
    RolUsuario,
    ConfigTema,
)
from app.core.security import get_password_hash


def init_db(db: Session) -> None:
    """
    Initializes PostgreSQL schemas, tables, and seeds initial data.
    """
    bind = db.get_bind()
    # 1. Create schemas if PostgreSQL
    if "postgresql" in str(bind.url):
        with bind.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"unaccent\";"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS core;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS staging;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS migration;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit;"))
            conn.commit()

    # 2. Create tables
    Base.metadata.create_all(bind=bind)

    # Ensure spatial columns exist on core.tb_ubicacion
    with bind.connect() as conn:
        for col, col_type in [("grid_x", "INTEGER"), ("grid_y", "INTEGER"), ("sector_code", "VARCHAR(20)"), ("geo_json", "TEXT")]:
            try:
                if "postgresql" in str(bind.url):
                    conn.execute(text(f"ALTER TABLE core.tb_ubicacion ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                else:
                    conn.execute(text(f"ALTER TABLE core.tb_ubicacion ADD COLUMN {col} {col_type};"))
                conn.commit()
            except Exception:
                pass

    # 3. Seed Cemeteries
    cem_sc = db.query(Cementerio).filter_by(codigo="SAN_CARLOS").first()
    if not cem_sc:
        cem_sc = Cementerio(
            codigo="SAN_CARLOS",
            nombre="Cementerio Municipal de San Carlos",
            comuna="San Carlos",
            region="Ñuble",
            direccion="Av. Baquedano s/n, San Carlos",
            activo=True
        )
        db.add(cem_sc)

    cem_cpt = db.query(Cementerio).filter_by(codigo="CACHAPOAL").first()
    if not cem_cpt:
        cem_cpt = Cementerio(
            codigo="CACHAPOAL",
            nombre="Cementerio Municipal de Cachapoal",
            comuna="San Carlos",
            region="Ñuble",
            direccion="Camino a Cachapoal s/n, San Carlos",
            activo=True
        )
        db.add(cem_cpt)

    # 4. Seed Default Users
    admin_user = db.query(Usuario).filter_by(username="admin").first()
    if not admin_user:
        admin_user = Usuario(
            username="admin",
            email="admin@munisancarlos.cl",
            rut="11111111-1",
            nombre_completo="Administrador General Municipal",
            hashed_password=get_password_hash("AdminCem2026!"),
            rol=RolUsuario.ADMINISTRADOR.value,
            activo=True
        )
        db.add(admin_user)

    admin_oper = db.query(Usuario).filter_by(username="operador").first()
    if not admin_oper:
        admin_oper = Usuario(
            username="operador",
            email="operador@munisancarlos.cl",
            rut="22222222-2",
            nombre_completo="Encargado de Cementerio",
            hashed_password=get_password_hash("OperadorCem2026!"),
            rol=RolUsuario.ADMINISTRATIVO.value,
            activo=True
        )
        db.add(admin_oper)

    visita_user = db.query(Usuario).filter_by(username="consulta").first()
    if not visita_user:
        visita_user = Usuario(
            username="consulta",
            email="consulta@munisancarlos.cl",
            rut="33333333-3",
            nombre_completo="Módulo de Consulta Ciudadana",
            hashed_password=get_password_hash("ConsultaCem2026!"),
            rol=RolUsuario.VISITA.value,
            activo=True
        )
        db.add(visita_user)

    # 5. Seed Themes (Day, Night, Custom Presets)
    default_themes = [
        ConfigTema(
            nombre="San Carlos Clásico (Día)",
            slug="sancarlos-classic",
            es_activo=True,
            es_modo_oscuro=False,
            es_sistema=True,
            color_primario="#1E3A8A",      # Deep Navy Blue
            color_secundario="#2563EB",    # Royal Blue
            color_acento="#0D9488",        # Teal / Emerald
            color_fondo="#F8FAFC",         # Slate 50
            color_superficie="#FFFFFF",    # Pure White
            color_texto="#0F172A",         # Slate 900
            color_borde="#E2E8F0",         # Slate 200
            descripcion="Tema oficial diurno institucional Ilustre Municipalidad de San Carlos"
        ),
        ConfigTema(
            nombre="San Carlos Nocturno (Noche)",
            slug="sancarlos-night",
            es_activo=False,
            es_modo_oscuro=True,
            es_sistema=True,
            color_primario="#3B82F6",      # Vivid Blue
            color_secundario="#60A5FA",    # Light Blue
            color_acento="#14B8A6",        # Teal Glow
            color_fondo="#0B0F19",         # Deep Obsidian Night
            color_superficie="#111827",    # Dark Charcoal Card
            color_texto="#F9FAFB",         # Crisp Off-White
            color_borde="#1F2937",         # Dark Slate Border
            descripcion="Modo noche de alto contraste y descanso visual"
        ),
        ConfigTema(
            nombre="Cachapoal Esmeralda",
            slug="cachapoal-emerald",
            es_activo=False,
            es_modo_oscuro=False,
            es_sistema=True,
            color_primario="#065F46",      # Deep Emerald Green
            color_secundario="#059669",    # Green 600
            color_acento="#D97706",        # Amber Gold
            color_fondo="#F0FDF4",         # Green 50 Tint
            color_superficie="#FFFFFF",    # Crisp White
            color_texto="#064E3B",         # Deep Forest
            color_borde="#D1FAE5",         # Emerald Border
            descripcion="Paleta natural inspirada en el entorno rural y pacífico de Cachapoal"
        ),
        ConfigTema(
            nombre="Memoria Cálida (Sepia)",
            slug="warm-sepia",
            es_activo=False,
            es_modo_oscuro=False,
            es_sistema=True,
            color_primario="#78350F",      # Warm Amber Brown
            color_secundario="#B45309",    # Warm Amber
            color_acento="#92400E",        # Terracotta
            color_fondo="#FFFBEB",         # Warm Ivory
            color_superficie="#FFFFFF",    # Card
            color_texto="#451A03",         # Warm Dark Espresso
            color_borde="#FDE68A",         # Soft Amber Border
            descripcion="Tonalidad solemne y cálida con contrastes suaves"
        ),
    ]

    for theme in default_themes:
        existing = db.query(ConfigTema).filter_by(slug=theme.slug).first()
        if not existing:
            db.add(theme)

    db.commit()

    # 6. Seed Spatial Grid Slots, Occupants, Leases & Agenda if empty
    seed_spatial_sample_data(db)


def seed_spatial_sample_data(db: Session) -> None:
    """
    Seeds rich GIS spatial slots for San Carlos and Cachapoal with all 5 color states:
    🟢 DISPONIBLE, 🔴 OCUPADO, 🟡 RESERVADO, 🟠 ARRIENDO_VENCIDO (30/60/90d), ⚪ BLOQUEADO.
    Also seeds sample field tasks, certificates, and historical occupant chains.
    """
    from datetime import date, timedelta
    from app.domain.models import (
        Ubicacion, Persona, Inhumacion, Derecho, Certificado, TareaTerreno, Maestro, DerechosMaestros
    )
    from app.infrastructure.services.pdf_generator import generate_certificate_pdf

    cem_sc = db.query(Cementerio).filter_by(codigo="SAN_CARLOS").first()
    cem_cpt = db.query(Cementerio).filter_by(codigo="CACHAPOAL").first()
    if not cem_sc or not cem_cpt:
        return

    today = date.today()

    # Seed Spatial Grid Slots if PAB-A not present
    if db.query(Ubicacion).filter(Ubicacion.sector_codigo == "PAB-A").count() == 0:
        # Create Masons if needed
        maestro_juan = db.query(Maestro).filter_by(rut="12345678-5").first()
        if not maestro_juan:
            maestro_juan = Maestro(
                rut="12345678-5",
                nombres="JUAN BAUTISTA",
                apellido_paterno="MORALES",
                apellido_materno="SOTO",
                telefono="+56991234567",
                activo=True
            )
            db.add(maestro_juan)
            db.flush()

        # Seed Persons (Deceased & Titleholders)
        personas_data = [
            ("7842119-4", "MANUEL JESUS MUÑOZ SEPULVEDA", "MANUEL JESUS", "MUÑOZ", "SEPULVEDA"),
            ("11239812-K", "MARIA DEL CARMEN YAÑEZ VENEGAS", "MARIA DEL CARMEN", "YAÑEZ", "VENEGAS"),
            ("8319445-1", "HECTOR OSVALDO RETAMAL ACUÑA", "HECTOR OSVALDO", "RETAMAL", "ACUÑA"),
            ("15678912-3", "CARLOS ALBERTO DE LA FUENTE RIVAS", "CARLOS ALBERTO", "DE LA FUENTE", "RIVAS"),
            ("9876543-2", "GLADYS ELENA SAN MARTIN VALENZUELA", "GLADYS ELENA", "SAN MARTIN", "VALENZUELA"),
            ("12987654-8", "ROBERTO ANDRES SEPULVEDA PARRA", "ROBERTO ANDRES", "SEPULVEDA", "PARRA"),
            ("14567890-1", "TERESA DE JESUS GONZALEZ BUSTOS", "TERESA DE JESUS", "GONZALEZ", "BUSTOS"),
            ("17890123-4", "FRANCISCO JAVIER PINOCHET CONTRERAS", "FRANCISCO JAVIER", "PINOCHET", "CONTRERAS"),
        ]

        persons = {}
        for rut, nom_comp, nom, ap_p, ap_m in personas_data:
            p = db.query(Persona).filter_by(rut=rut).first()
            if not p:
                p = Persona(
                    rut=rut,
                    nombre_completo=nom_comp,
                    nombres=nom,
                    apellido_paterno=ap_p,
                    apellido_materno=ap_m,
                    rut_validado=True,
                    celular="+569" + rut.replace("-", "")[:8],
                    email=f"{nom.lower().split()[0]}.{ap_p.lower()}@gmail.com"
                )
                db.add(p)
                db.flush()
            persons[rut] = p

        # Grid Definitions for Sectors
        # Sector 1: PAB-A (San Carlos - Pabellón A: 4 rows x 8 cols = 32 slots)
        for row in range(1, 5):
            for col in range(1, 9):
                num = f"{(row - 1) * 8 + col:03d}"
                # Distribution of states:
                # col 1, 2, 3 -> Occupied
                # col 4 -> Expired / Expiring
                # col 5 -> Reserved
                # col 6 -> Blocked (Maintenance)
                # col 7, 8 -> Available
                if col in (1, 2, 3):
                    estado = "OCUPADO"
                    cap_oc = 1
                elif col == 4:
                    estado = "ARRIENDO_VENCIDO"
                    cap_oc = 1
                elif col == 5:
                    estado = "RESERVADO"
                    cap_oc = 0
                elif col == 6:
                    estado = "BLOQUEADO"
                    cap_oc = 0
                else:
                    estado = "DISPONIBLE"
                    cap_oc = 0

                ub = Ubicacion(
                    cementerio_id=cem_sc.id,
                    tipo_ubicacion="PAB",
                    sector_codigo="PAB-A",
                    sector_code="PAB-A",
                    fila=f"F-{row:02d}",
                    numero=num,
                    capacidad_total=1,
                    capacidad_ocupada=cap_oc,
                    estado=estado,
                    grid_x=col,
                    grid_y=row,
                    observaciones=f"Nicho Pabellón A Fila {row} Número {num}"
                )
                db.add(ub)
                db.flush()

                # Attach Inhumations & Rights for realistic dossier
                if estado in ("OCUPADO", "ARRIENDO_VENCIDO"):
                    pers = persons.get("7842119-4") if col == 1 else (persons.get("11239812-K") if col == 2 else persons.get("8319445-1"))
                    if pers:
                        inh = Inhumacion(
                            ubicacion_id=ub.id,
                            fallecido_persona_id=pers.id,
                            numero_ingreso=f"ING-2024-{ub.id:04d}",
                            fecha_defuncion=today - timedelta(days=200),
                            fecha_sepultacion=today - timedelta(days=198),
                            causa_fallecimiento="Paro cardiorrespiratorio",
                            pase_sepultacion_folio=f"LIC-2024-{ub.id:04d}"
                        )
                        db.add(inh)

                    # Lease
                    titular = persons.get("15678912-3")
                    if titular:
                        if col == 4:
                            # Expiring in 18 days (Orange 30d alert) or expired
                            venc = today + timedelta(days=18) if row % 2 == 0 else today - timedelta(days=35)
                        else:
                            venc = today + timedelta(days=700)

                        der = Derecho(
                            ubicacion_id=ub.id,
                            titular_persona_id=titular.id,
                            tipo_derecho="ARRIENDO",
                            periodo_arriendo="5_ANOS",
                            fecha_inicio=today - timedelta(days=1100),
                            fecha_vencimiento=venc,
                            monto_pagado=185000.0,
                            folio_recibo=f"REC-2021-{ub.id:04d}",
                            estado="VENCIDO" if venc < today else "VIGENTE"
                        )
                        db.add(der)

        # Sector 2: PAT-01 (San Carlos - Patio 1 Tierra: 3 rows x 8 cols = 24 slots)
        for row in range(1, 4):
            for col in range(1, 9):
                num = f"{(row - 1) * 8 + col:03d}"
                estado = "OCUPADO" if col <= 4 else ("ARRIENDO_VENCIDO" if col == 5 else "DISPONIBLE")
                ub = Ubicacion(
                    cementerio_id=cem_sc.id,
                    tipo_ubicacion="PAT",
                    sector_codigo="PAT-01",
                    sector_code="PAT-01",
                    fila=f"F-{row:02d}",
                    numero=num,
                    capacidad_total=2,
                    capacidad_ocupada=1 if estado != "DISPONIBLE" else 0,
                    estado=estado,
                    grid_x=col,
                    grid_y=row
                )
                db.add(ub)
                db.flush()

                if estado == "ARRIENDO_VENCIDO":
                    der = Derecho(
                        ubicacion_id=ub.id,
                        titular_persona_id=persons["9876543-2"].id,
                        tipo_derecho="ARRIENDO",
                        periodo_arriendo="20_ANOS",
                        fecha_inicio=today - timedelta(days=7300),
                        fecha_vencimiento=today + timedelta(days=45),  # 60d threshold alert!
                        monto_pagado=450000.0,
                        folio_recibo=f"REC-2006-{ub.id:04d}",
                        estado="VIGENTE"
                    )
                    db.add(der)

        # Sector 3: PAT-R (Cachapoal - Patio Rural: 3 rows x 6 cols = 18 slots)
        for row in range(1, 4):
            for col in range(1, 7):
                num = f"R-{(row - 1) * 6 + col:03d}"
                estado = "OCUPADO" if col <= 3 else "DISPONIBLE"
                ub = Ubicacion(
                    cementerio_id=cem_cpt.id,
                    tipo_ubicacion="PAT",
                    sector_codigo="PAT-R",
                    sector_code="PAT-R",
                    fila=f"F-{row:02d}",
                    numero=num,
                    capacidad_total=1,
                    capacidad_ocupada=1 if estado == "OCUPADO" else 0,
                    estado=estado,
                    grid_x=col,
                    grid_y=row
                )
                db.add(ub)

    # Seed Sample Municipal Certificate with QR if not present
    if db.query(Certificado).count() == 0:
        pdf_b, sha_hash, qr_b64 = generate_certificate_pdf(
            folio="CERT-2026-0089",
            token_verificacion="e78f3c42918b45a0d3198e72fa0124cc",
            tipo_certificado="INHUMACION",
            cementerio_nombre="Cementerio Municipal de San Carlos",
            codigo_ubicacion="PAB-A-F01-N001",
            fallecido_nombre="MANUEL JESUS MUÑOZ SEPULVEDA",
            rut_fallecido="7.842.119-4",
            titular_nombre="CARLOS ALBERTO DE LA FUENTE RIVAS",
            rut_titular="15.678.912-3",
            fecha_emision=today
        )
        cert_sample = Certificado(
            folio="CERT-2026-0089",
            token_verificacion="e78f3c42918b45a0d3198e72fa0124cc",
            tipo_certificado="INHUMACION",
            estado="VIGENTE",
            cementerio_id=cem_sc.id,
            fallecido_nombre="MANUEL JESUS MUÑOZ SEPULVEDA",
            rut_fallecido="7.842.119-4",
            titular_nombre="CARLOS ALBERTO DE LA FUENTE RIVAS",
            rut_titular="15.678.912-3",
            codigo_ubicacion="PAB-A-F01-N001",
            fecha_emision=today,
            sha256_hash=sha_hash,
            codigo_qr_base64=qr_b64,
            observaciones="Certificado oficial de sepultación con firma digital y validación QR Ley 19.799"
        )
        db.add(cert_sample)

    # Seed Field Crew Tasks for Today (Sepultureros agenda)
    if db.query(TareaTerreno).count() == 0:
        tasks_seed = [
            TareaTerreno(
                folio_orden=f"ORD-{today.year}-0101",
                cementerio_id=cem_sc.id,
                tipo_tarea="INHUMACION",
                estado="PENDIENTE",
                fallecido_nombre="TERESA DE JESUS GONZALEZ BUSTOS",
                rut_fallecido="14.567.890-1",
                solicitante_nombre="ROBERTO SEPULVEDA",
                fecha_programada=today,
                hora_programada="11:30",
                sepulturero_asignado="Cuadrilla 1 (Héctor & Manuel)",
                observaciones="Sepultación en Nicho Pabellón A. Verificar recepción de pase médico."
            ),
        TareaTerreno(
            folio_orden=f"ORD-{today.year}-0102",
            cementerio_id=cem_sc.id,
            tipo_tarea="MANTENCION",
            estado="EN_PROCESO",
            solicitante_nombre="Administración Municipal",
            fecha_programada=today,
            hora_programada="14:00",
            sepulturero_asignado="Cuadrilla 2",
            observaciones="Reparación de solera y encalado en vereda norte Patio 1."
        ),
        TareaTerreno(
            folio_orden=f"ORD-{today.year}-0103",
            cementerio_id=cem_cpt.id,
            tipo_tarea="EXHUMACION",
            estado="PENDIENTE",
            fallecido_nombre="FRANCISCO JAVIER PINOCHET CONTRERAS",
            rut_fallecido="17.890.123-4",
            solicitante_nombre="Familia Pinochet",
            fecha_programada=today,
            hora_programada="16:00",
            sepulturero_asignado="Cuadrilla Cachapoal",
            observaciones="Traslado interno con autorización de Seremi de Salud N° 4421."
            )
        ]
        for t in tasks_seed:
            db.add(t)

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
        print("Database initialized successfully with schemas and seed data.")
    finally:
        db.close()
