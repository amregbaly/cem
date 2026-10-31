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
