#!/usr/bin/env python3
"""
Migrates tables and data from local SQLite databases (cem_core.db, cem_audit.db, cem_migration.db)
to PostgreSQL database.
"""
import os
import sys
import sqlite3
from sqlalchemy import create_engine, text

def migrate_sqlite_to_postgres(postgres_url: str, base_dir: str = None):
    if not base_dir:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    core_db = os.path.join(base_dir, "cem_core.db")
    audit_db = os.path.join(base_dir, "cem_audit.db")
    migration_db = os.path.join(base_dir, "cem_migration.db")

    if not os.path.exists(core_db):
        print(f"[!] SQLite core database not found at {core_db}")
        return False

    print(f"[*] Connecting to PostgreSQL target: {postgres_url} ...")
    pg_engine = create_engine(postgres_url)

    # List of mappings: (sqlite_file, schema_name)
    databases = [
        (core_db, "core"),
        (audit_db, "audit"),
        (migration_db, "migration"),
    ]

    with pg_engine.begin() as pg_conn:
        # Ensure schemas exist
        pg_conn.execute(text("CREATE SCHEMA IF NOT EXISTS core;"))
        pg_conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit;"))
        pg_conn.execute(text("CREATE SCHEMA IF NOT EXISTS migration;"))
        pg_conn.execute(text("CREATE SCHEMA IF NOT EXISTS staging;"))

        # Disable triggers temporarily if needed
        for sqlite_path, schema in databases:
            if not os.path.exists(sqlite_path):
                continue
            sq_conn = sqlite3.connect(sqlite_path)
            sq_cur = sq_conn.cursor()
            tables = [r[0] for r in sq_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]

            for tbl in tables:
                rows = sq_cur.execute(f"SELECT * FROM {tbl}").fetchall()
                if not rows:
                    continue
                col_names = [d[0] for d in sq_cur.description]
                cols_str = ", ".join(f'"{c}"' for c in col_names)
                placeholders = ", ".join(f":{c}" for c in col_names)

                print(f"[*] Migrating {schema}.{tbl} ({len(rows)} records)...")
                
                # Check if target table exists in PG
                check = pg_conn.execute(text(
                    f"SELECT 1 FROM information_schema.tables WHERE table_schema = '{schema}' AND table_name = '{tbl}'"
                )).fetchone()
                
                if not check:
                    # Let SQLAlchemy models create it or skip if not in models
                    print(f"    Table {schema}.{tbl} does not exist in PostgreSQL yet, skipping data copy.")
                    continue

                # Delete existing seed data to prevent duplicate keys
                pg_conn.execute(text(f'TRUNCATE TABLE "{schema}"."{tbl}" CASCADE;'))

                insert_sql = text(f'INSERT INTO "{schema}"."{tbl}" ({cols_str}) VALUES ({placeholders})')
                dict_rows = [dict(zip(col_names, row)) for row in rows]
                pg_conn.execute(insert_sql, dict_rows)

            sq_conn.close()

    print("[OK] SQLite data successfully synced to PostgreSQL!")
    return True

if __name__ == "__main__":
    pg_url = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL", "postgresql+psycopg2://cem_admin:cem_secure_password_2026@localhost:5432/cem_db")
    migrate_sqlite_to_postgres(pg_url)
