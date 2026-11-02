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

        cursor = dbapi_connection.cursor()
        cursor.execute("ATTACH DATABASE 'cem_core.db' AS core")
        cursor.execute("ATTACH DATABASE 'cem_staging.db' AS staging")
        cursor.execute("ATTACH DATABASE 'cem_migration.db' AS migration")
        cursor.execute("ATTACH DATABASE 'cem_audit.db' AS audit")
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
