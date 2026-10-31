# Cementery Web Management Platform (San Carlos & Cachapoal)
## Enhanced Technical Specification & 45-Day Antigravity Agentic Development Plan

---

## 1. Executive Summary & Governance Reconciliation

This technical specification and development plan defines the execution roadmap for the **Municipal Cemetery Management Platform** (*Plataforma Web de Gestión Interna para los Cementerios Municipales de San Carlos y Cachapoal*).

### 1.1 Alignment of Development Timelines
The draft Software Requirements Specification (SRS v0.1) envisioned a 30-week traditional software cycle. However, the official tender specifications (**Especificaciones Técnicas EETT 2026**) mandate a binding execution timeline of **20 to 60 calendar days** from order acceptance to go-live, followed by a **30-day trial period** governed by **Anexo N° 2 (Protocolo de Pruebas de Aceptación)**.

To reconcile these constraints, this plan establishes a **45-day Accelerated Agentic Sprint Roadmap** designed specifically for execution within **Google Antigravity** (and compatible AI coding agent workflows). By leveraging automated code generation, test synthesis, and modular domain-driven architecture, the 6-sprint plan meets 100% of the functional, security, and migration requirements within the strict contractual window.

### 1.2 Financial & Operational Frame
- **Implementation (Traspaso de Datos & Puesta en Marcha)**: Fixed price (*Suma Alzada*) capped at **$4,453,545 CLP** (taxes included).
- **Monthly SaaS Operational Fee**: Capped at **$180,000 CLP/month** for 15 months (**$2,700,000 CLP** total).
- **Total Contract Budget**: Max **$7,153,545 CLP** (taxes included).
- **Contract Duration**: 15 months of active SaaS operation starting from the signed Acceptance Act (*Acta de Aceptación*).
- **Scope**: Internal web management for San Carlos Municipal Cemetery and Cachapoal Cemetery, supporting ~4,300 underground graves, ~260 elevated graves, ~180 vaults, ~60 mausoleums, common burial grounds (*patio común*), ~6,600 leased niches (2 months, 5, 20, 50 years), and ~3,220 perpetual niches.

---

## 2. System Architecture & Tech Stack

The platform mandates a **100% Web SaaS Architecture** hosted on ISO/IEC 27001 certified cloud infrastructure, accessible via modern web browsers (Chrome, Edge, Firefox, Safari) without desktop client installations or plugins.

| Architectural Layer | Technology Stack | Operational Specification |
| :--- | :--- | :--- |
| **Frontend SPA** | React 18 / Next.js / TypeScript | Responsive UI (Desktop & PWA for field staff), WCAG 2.1 AA accessibility, instant autocomplete search. |
| **Backend API** | Python 3.12 / FastAPI (Modular Monolith) | RESTful API (OpenAPI 3.0), OWASP ASVS Level 2 compliance, strict domain layer isolation. |
| **Database Engine** | PostgreSQL 16 (UTF-8 Encoding) | Isolated schemas (`core`, `staging`, `migration`, `audit`), `pg_trgm` full-text search indexing. |
| **Storage & Media** | S3-Compatible Object Storage (AES-256) | 50 GB encrypted storage capacity. Max 10 MB per attachment (PDF, JPG, PNG). Automated malware scanning. |
| **Security & Auth** | TLS 1.3 / OAuth2 + TOTP 2FA | Password length $\ge 12$ chars, TOTP 2FA mandatory for Admin/Administrative profiles, SSL Labs Grade A. |
| **Audit Subsystem** | Cryptographic Chained Log (HMAC SHA-256) | Immutable append-only transaction log storing user, RUT, IP, timestamp, module, and pre/post payload diffs. |

### Performance & Availability SLAs
- **Instant Search Response**: P95 $\le 1.0\text{ second}$ with complete 86,500+ record dataset under 30 concurrent active users.
- **Record Open / Save Operations**: P95 $\le 2.0\text{ seconds}$.
- **Availability**: $\ge 99.0\%$ monthly uptime (monitored externally every 5 minutes).

---

## 3. Core Domain Model & Business Rules

### 3.1 Key Subsystems & Rules
1. **Locations & Hierarchy (`tb_ubicacion`)**:
   - Hierarchy: Cemetery $\rightarrow$ Type (`PAB`, `PAT`, `PCO`, `BOV`, `SP4`) $\rightarrow$ Sector/Pabellón $\rightarrow$ Row (*Fila*) $\rightarrow$ Number (*Número*).
   - Lifecycle States: `Available`, `Reserved` (with expiration date and holder), `Occupied`, `Expired Lease`, `Blocked`.
   - Multi-capacity support: Tracks current vs. maximum capacity per location (supporting successive inhumations after reduction).
2. **Rights & Leases (`tb_derecho`)**:
   - Supports **Perpetual Grants** (no expiration date, legacy `PER_ID = 0` or `5`) and **Term Leases** (2 months, 3, 5, 20, 50 years).
   - Expiration alert engine at **30, 60, and 90-day** thresholds exportable to Excel.
   - Property transfer workflow (*transferencias de propiedad*) preserving historical ownership chain.
3. **Inhumations (`tb_inhumacion`)**:
   - Validates deceased RUT with **Modulo 11** (unvalidated legacy RUTs flagged with `migrado`).
   - Validates burial date $\ge$ death date. Stores mandatory burial permit (*pase de sepultación*) attachment.
   - Restricts visibility of cause of death (*causa de muerte*) to Administrator and Administrative profiles only (hidden from Visitor/Consultation profile).
4. **Exhumations & Relocations (`tb_exhumacion`)**:
   - Tracks origin location, destination location (or external/cremation destination), resolution number, requesting relative, and reason.
   - Transactionally updates occupancy status of both origin and destination locations.
5. **Mason Work Orders (`tb_derechos_maestros`)**:
   - Registers authorized masons (*maestros*). Categorized by job type (1 = Headstone Installation, 2 = Construction/Repair, 3 = Maintenance).
   - Associates every payment order to the specific property history log.

---

## 4. Legacy Data Migration Engine (ETL Specification)

The legacy database consists of **86,499 rows** across 18 sheets in `Base de datos CEMENTERIO.xlsx` (cut-off 31-03-2026), containing **40,134 primary records** (18,418 Inhumations and 21,716 Property Rights/Leases).

### 4.1 Cleansing Rules (R1–R12 / CL-01–CL-15)
- **R1 (RUT Validation)**: Format `12345678-K`. Validate Modulo 11 check digit. Invalid RUTs flagged as `rut_unvalidated` in exceptions log; never discarded.
- **R2 (Name Atomicity)**: Separate names into `first_names`, `paterno_surname`, and `materno_surname`, respecting Chilean compound particles (*de*, *del*, *de la*, *San*).
- **R3 (Date Cleansing)**: Convert Excel serial numbers/text to standard dates (`YYYY-MM-DD`). Convert sentinel date `1901-01-01` to `NULL` with `birth_date_unknown = True`.
- **R8 (Character Repair)**: UTF-8 encoding repair for 1,286+ instances where `Ñ` was corrupted into `?` (e.g. `MU?OZ` $\rightarrow$ `MUÑOZ`) using a municipal-validated surname dictionary.
- **R11 (Unidentified Persons)**: "NN" records imported under flag `is_unidentified = True`.
- **R7 & R9 (Full Lineage)**: Every migrated row retains source sheet name, row index, and tag `migrado = True`. Unmapped fields saved in `observations`.

### 4.2 Migration Reconciliation & Audit
- **Reconciliation Requirement**: $\text{Migrated Rows} + \text{Exceptions Queue Rows} + \text{Approved Discarded Rows} = 86,499\text{ Source Rows}$.
- **300-Record Physical Audit**: Municipal staff random sampling. Required accuracy: **0% error** in location, deceased name, and death date; $\le 1.0\%$ error in secondary fields.

---

## 5. QR Verification & Official Certificates Subsystem

Every official certificate (Inhumation, Location Ownership, Lease Rights, Exhumation) is generated as an uneditable PDF/A file containing:
1. **Sequential Folio**: Unique per type and year (`FOLIO-YYYY-NNNN`).
2. **Dynamic QR Code**: Embeds a 128-bit non-sequential random cryptographic token.
3. **Municipal Verification Webpage**: HTTPS page under municipal domain (`cementerio.munisancarlos.cl/verify/<token>`).
4. **Verification Metadata**: Displays folio, issuance date, status (`VIGENTE` / `ANULADO`), and **SHA-256 document hash**.
5. **Data Export**: API endpoints to download certificate metadata in JSON and CSV formats.

---

## 6. Antigravity 45-Day Agentic Development Roadmap

To fit the contractual 20–60 calendar day window, execution is structured into **6 Sprints** across 45 calendar days.

```
+-----------------------------------------------------------------------------------+
| Sprint 1 (Days 1-7)  : Foundation, Database Schemas & Migration Pipeline ETL       |
| Sprint 2 (Days 8-14) : Location Hierarchy, Rights & Master Catalogs               |
| Sprint 3 (Days 15-21): Inhumations, Exhumations & Mason Work Order Modules        |
| Sprint 4 (Days 22-28): Sub-second Instant Search Engine & QR PDF Certificates     |
| Sprint 5 (Days 29-35): Cryptographic Audit Trail, TOTP 2FA & Security Hardening    |
| Sprint 6 (Days 36-45): 300-Record Audit, Municipal Training & Production Go-Live   |
+-----------------------------------------------------------------------------------+
```

### Detailed Sprint Workflows for Antigravity Agents

#### **Sprint 1 (Days 1–7): Core Architecture & ETL Pipeline**
- Setup FastAPI + PostgreSQL project repository using domain-driven layout (`app/domain`, `app/infrastructure`, `app/api`).
- Create Alembic migrations for schemas: `core`, `staging`, `migration`, `audit`.
- Build Python ETL pipeline implementing rules R1–R12. Execute on `Base de datos CEMENTERIO.xlsx` sample.
- Output: Initial migrated dataset, exception log table, and automated reconciliation script.

#### **Sprint 2 (Days 8–14): Locations, Rights & Holder Management**
- Implement Location CRUD endpoints and bulk location range generator (Patios & Pabellones).
- Develop Rights management engine (Perpetual vs. Term Leases 2m/5y/20y/50y) with automated expiration logic.
- Implement Person Master (`tb_persona`) deduplication service (RUT & fuzzy name match).

#### **Sprint 3 (Days 15–21): Operations (Inhumations, Exhumations, Masons)**
- Build Inhumation creation wizard with Modulo 11 RUT validation, death certificate PDF attachment, and cause-of-death field masking.
- Implement Exhumation workflow with automatic transactional updating of origin and destination location occupancy.
- Implement Mason Work Order registry linked to property payment history.

#### **Sprint 4 (Days 22–28): Search Engine & QR Certificate Generator**
- Configure PostgreSQL trigram + full-text search indexes (`pg_trgm`) ensuring search response $< 1.0\text{s}$.
- Develop PDF/A certificate generator with embedded 128-bit random QR token.
- Build public HTTPS verification route `/verify/<token>` returning SHA-256 document fingerprint.

#### **Sprint 5 (Days 29–35): Cryptographic Audit & Security Hardening**
- Build HMAC SHA-256 append-only chained audit logger intercepting all database mutations.
- Integrate TOTP 2FA (`pyotp`) for Administrator and Administrative accounts.
- Run automated SAST/DAST security scanning ensuring zero High/Critical vulnerabilities.

#### **Sprint 6 (Days 36–45): Acceptance Testing (Anexo 2) & Go-Live**
- Run final production migration ETL on `Base de datos CEMENTERIO.xlsx`.
- Generate 300-record audit report for Municipal IT verification.
- Conduct mandatory 3-hour municipal training session in San Carlos.
- Sign Acceptance Act and launch 30-day trial period.

---

## 7. Exit Package Specification (Zero Lock-in)

The system includes a native 1-click **Exit Package** (*Paquete de Salida*) downloadable by the Administrator:
1. **Database Dump**: Standard SQL file compatible with PostgreSQL / MySQL.
2. **Tabular Data**: UTF-8 CSV files per table with headers and foreign key relationships.
3. **Attachments**: Zip archive of all legal deeds, permits, and documents with an index manifest.
4. **Certificates & Hashes**: All generated PDF certificates with `verification_table.csv` (Folio, Token, SHA-256 Hash).
5. **Audit Logs**: Complete immutable audit log export.
6. **Manifest**: `manifest.sha256` containing SHA-256 fingerprints for every file in the package.

---
*Specification complete. Ready for immediate prompt execution in Google Antigravity.*
