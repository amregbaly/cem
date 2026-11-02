from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Engine configuration
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args
)

# For SQLite test/dev support: attach schemas if testing in SQLite
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        def unaccent_py(val):
            if not val:
                return ""
            import unicodedata
            nfkd = unicodedata.normalize('NFKD', str(val))
            clean = "".join(c for c in nfkd if not unicodedata.combining(c))
            return clean.lower().replace("ñ", "n")

        dbapi_connection.create_function("unaccent_sql", 1, unaccent_py)

        # Resolve db paths relative to backend directory so working directory changes don't disconnect schemas
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        core_path = os.path.join(base_dir, "cem_core.db")
        staging_path = os.path.join(base_dir, "cem_staging.db")
        migration_path = os.path.join(base_dir, "cem_migration.db")
        audit_path = os.path.join(base_dir, "cem_audit.db")

        cursor = dbapi_connection.cursor()
        cursor.execute(f"ATTACH DATABASE '{core_path}' AS core")
        cursor.execute(f"ATTACH DATABASE '{staging_path}' AS staging")
        cursor.execute(f"ATTACH DATABASE '{migration_path}' AS migration")
        cursor.execute(f"ATTACH DATABASE '{audit_path}' AS audit")
        try:
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS audit.trg_prevent_audit_update
                BEFORE UPDATE ON tb_log_auditoria
                BEGIN
                    SELECT RAISE(ABORT, 'INMUTABILIDAD_ESTRICTA: La tabla de auditoría es append-only. Operación UPDATE prohibida.');
                END;
            """)
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS audit.trg_prevent_audit_delete
                BEFORE DELETE ON tb_log_auditoria
                BEGIN
                    SELECT RAISE(ABORT, 'INMUTABILIDAD_ESTRICTA: La tabla de auditoría es append-only. Operación DELETE prohibida.');
                END;
            """)
        except Exception:
            pass
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
