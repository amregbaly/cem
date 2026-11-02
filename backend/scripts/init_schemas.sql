-- Database Initialization Script for San Carlos & Cachapoal Municipal Cemeteries
-- Schemas: core, staging, migration, audit

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS migration;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path for default sessions
ALTER DATABASE cem_db SET search_path TO core, audit, migration, staging, public;

-- Strict Immutability Trigger for Audit Log (OWASP ASVS Level 2 & EETT P54-P57)
CREATE OR REPLACE FUNCTION audit.prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'INMUTABILIDAD_ESTRICTA: La tabla de auditoría audit.tb_log_auditoria es append-only. Modificaciones (UPDATE) o eliminaciones (DELETE) están estrictamente prohibidas por normativa municipal y Ley 21.719.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit.tb_log_auditoria;
CREATE TRIGGER trg_prevent_audit_update
BEFORE UPDATE ON audit.tb_log_auditoria
FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON audit.tb_log_auditoria;
CREATE TRIGGER trg_prevent_audit_delete
BEFORE DELETE ON audit.tb_log_auditoria
FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_tampering();

