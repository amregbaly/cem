# Municipal Cemetery Web Management Platform (San Carlos & Cachapoal) — Antigravity Refactoring & Enhancement Specification

---

## 1. Executive Architecture Blueprint & System Scope

This specification establishes the architectural enhancement and refactoring plan for the **Municipal Cemetery Web Management Platform** serving the **San Carlos** and **Cachapoal** municipal cemeteries. The platform operates under a **100% Web SaaS Architecture** designed for multi-tenant site management, robust historical traceability, and compliance with Chilean cybersecurity and data protection standards (Ley 21.719, Ley 19.628, OWASP ASVS Level 2).

### Core Domain Architecture
* **Multi-Cemetery Hierarchy:** Independent and configurable site scoping for San Carlos and Cachapoal.
* **Property & Location Management:**
  * Subterranean Graves (Sencilla / Impermeabilizada) (~4,300)
  * Above-Ground Graves / Sepulturas en Altura (~260)
  * Vaults / Bóvedas (~180)
  * Mausoleums / Mausoleos (~60)
  * Common Plot / Patio Común
  * Leased Niches (~6,600) with configurable lease regimes: 2 months, 5 years, 20 years, 50 years.
  * Perpetual Niches (~3,220 historical records prior to 1970).
  * Unique spatial identifiers: Sector, Row (Fila), Number (Número), and Pavilion Name (Pabellón).
* **Life-Cycle Operations:**
  * **Inhumations (Burials):** Deceased details, mandatory RUT validation (Modulo 11 check with legacy exemption flags), death certificate, burial permit image/PDF attachments, responsible person details, cause of death (restricted access), and link to location registry.
  * **Exhumations & Internal Transfers:** Origin/destination tracking, resolution numbers, reason catalog (internal transfer, external transfer, judicial order, cremation), and occupancy auto-updates.
  * **Masonry Work Orders (Derechos Maestros):** Registries for authorized masons (`tb_maestros`), fee tracking, headstone installation, repairs, and structural builds tied to location registry numbers.
  * **Rights Transfers:** Property ownership assignment, inheritance records, and historical titleholder chain.
* **Security, Privacy & Audit Log:**
  * **Append-Only Audit Log:** Cryptographically chained log tracking user ID, RUT, IP address, Chilean official time, module, record ID, operation type, and exact field deltas (before/after). Physical deletion is strictly prohibited; logical voiding requires mandatory justification.
  * **Role-Based Access Control (RBAC):** 3 core user tiers — Administrator (2 accounts), Administrative (8 users), and Query/Visita (20 municipal users). Field-level privacy masking hides cause of death and personal contact info from Query users.
  * **QR Certificate Validation:** PDF/A certificates with unique non-sequential 128-bit verification codes, SHA-256 fingerprints, and public HTTPS verification routes under municipal subdomains.

---

## 2. Next-Generation Core Enhancement Pillars

To elevate the software from a basic administrative CRUD system to a modern, civic-grade platform, the following key enhancement pillars must be integrated:

```
+-----------------------------------------------------------------------------------+
|                           ENHANCEMENT PILLARS ARCHITECTURE                        |
+-----------------------------------------------------------------------------------+
|  1. Interactive 2D/3D GIS Spatial Map & Visual Grid System                        |
|     - Sector/Pabellón visual canvas with color-coded status tiles                 |
|     - Real-time occupancy, lease expiration alerts, and mobile wayfinding         |
+-----------------------------------------------------------------------------------+
|  2. Bidirectional Instant Autocomplete Search Engine                              |
|     - Sub-second search (<1s at p95 with 30 concurrent users across 100k+ records)|
|     - Accent-insensitive, Ñ/? artifact auto-repair, single-click map targeting    |
+-----------------------------------------------------------------------------------+
|  3. Automated Lease Engine & Multi-Channel Expiry Alerts                          |
|     - Configurable 90 / 60 / 30 day threshold tracking & automated notifications  |
|     - Citizen self-service lookup and payment gateway integration (Webpay/Servipag)|
+-----------------------------------------------------------------------------------+
|  4. Field Crew Mobile PWA (Offline-First for Sepultureros)                        |
|     - Daily burial/exhumation agenda, mobile permit scanner, execution logging    |
+-----------------------------------------------------------------------------------+
|  5. AI-Powered Data Cleansing & Migration Workbench                               |
|     - Automated normalization rules (CL-01 to CL-15) for 86,499 legacy rows        |
|     - Resolution queue for orphan locations, sentinel dates, and RUT errors       |
+-----------------------------------------------------------------------------------+
```

### Pillar Breakdown

#### 1. Interactive Visual GIS Map & Visual Grid System
* **Canvas Component (`CemeteryMap.tsx` / `CemeteryMap.vue`):** Interactive spatial map powered by Leaflet.js / OpenLayers or SVG vector grids representing cemetery layouts for both San Carlos and Cachapoal.
* **Color-Coded Location States:**
  * 🟢 **Available:** Free slot ready for assignment or lease.
  * 🔴 **Occupied:** Active inhumation recorded.
  * 🟡 **Reserved:** Temporary administrative reservation active.
  * 🟠 **Lease Expired / Pending Renewal:** Expiry thresholds (30/60/90 days) breached.
  * ⚪ **Blocked / Maintenance:** Structural repair or legal hold.
* **Slide-Over Property Drawer:** Clicking any slot slides out a comprehensive drawer displaying property history, deceased list, active titleholder, attached permits, and quick actions ("Register Burial", "Renew Lease", "Issue Certificate").
* **Mobile Wayfinding:** Field staff and visitors searching for a grave receive visual highlighted paths and walking directions on mobile devices.

#### 2. High-Performance Instant Autocomplete Search Engine
* **Bidirectional Search Workflows:**
  1. *Search by Deceased:* Name, paternal/maternal surname, RUT (with/without dots & dash), or death date range.
  2. *Search by Location:* Cemetery, Sector, Patio, Pabellón, Row, or Number.
* **Fault-Tolerant Matching:** Insensitive to accents, tildes, uppercase/lowercase, and encoding corruptions (handling legacy `MU?OZ` vs `MUÑOZ`).
* **Sub-Second Performance SLA:** Delivers <20 predictive suggestions from the 3rd character for text and 1st digit for numbers/RUT, responding in ≤1 second at 95th percentile with 30 concurrent users.

#### 3. Public Certificate Verification & Digital Memorials
* **Verification Route (`/verify/certificate/[folio]`):** Public HTTPS route verifying certificate validity (Vigente / Anulado), issuing timestamp, issuing officer, and SHA-256 PDF hash.
* **Privacy Compliance (Ley 21.719):** Strictly excludes personal contact info and cause of death from public views.
* **Digital Memorial Pages (Optional):** Public grave locator page ("Find a Loved One") presenting respectful locator details and visual map pin.

#### 4. Automated Lease & Notification Engine
* **Expiry Dashboard Widget:** Lists expiring leases categorized by 30, 60, and 90 days.
* **Automated Multi-Channel Notifications:** Background Celery/Cron jobs triggering Email, SMS, and WhatsApp alerts to registered titleholders.
* **Online Renewal Integration:** Enables titleholders to look up lease status online and make renewal payments via integrated Chilean payment gateways (Webpay / Servipag) with automated electronic receipts.

#### 5. Offline-First Field Crew Mobile PWA
* **Daily Work Agenda:** Tailored mobile UI for sepultureros showing scheduled burials, exhumations, and masonry works.
* **Mobile Document Upload:** Direct camera photo capture for burial permits, death certificates, and headstone photos with malware scanning and 10MB limits.

---

## 3. Step-by-Step Implementation Roadmap for Antigravity

This 7-phase roadmap guides Antigravity through auditing, refactoring, building, and hardening the codebase.

### Phase 1: Code Audit & Data Schema Refactoring
1. **Audit Existing Code:** Inspect database schemas, REST controllers, UI components, and state management.
2. **Schema Extension (`migrations/`):**
   * Update location models to include grid spatial coordinates (`grid_x`, `grid_y`, `sector_code`, `geo_json`).
   * Add lifecycle status enum (`FREE`, `OCCUPIED`, `RESERVED`, `EXPIRED`, `BLOCKED`).
   * Enforce relational integrity across `locations`, `rights`, `burials`, `exhumations`, and `work_orders`.
   * Implement an append-only audit log table with SHA-256 cryptographic hash chaining.

### Phase 2: REST API & Spatial Endpoint Layer
1. **Spatial Data Endpoints:**
   * `GET /api/v1/map/sectors?cemetery_id={id}` — Returns sector geometries and summary statistics.
   * `GET /api/v1/map/locations?sector_id={id}&status={status}` — Returns grid slot coordinates and color status.
2. **Instant Search API:**
   * `GET /api/v1/search?q={query}&cemetery_id={id}` — Fast indexed trigram search across deceased and location numbers (<1s execution).
3. **Property History API:**
   * `GET /api/v1/properties/{id}/history` — Consolidated payload of titleholders, burial history, exhumations, mason works, and attached documents.

### Phase 3: Interactive Visual Map & UI Component Development
1. **Build `CemeteryMap` Canvas:** Implement responsive SVG/Leaflet visual grid map supporting zoom, pan, and sector filtering.
2. **Color State Binding:** Bind dynamic database status to location tiles.
3. **Slide-Over Detail Drawer:** Build side drawer displaying complete property files, historical occupant lists, and quick-action buttons.
4. **Search Map Integration:** Link global search autocomplete directly to the map canvas—selecting a search result automatically pans/zooms the map to the target slot.

### Phase 4: Public Verification Portal & QR Code Generator
1. **PDF/A Certificate Engine:** Build template generator embedding single-page PDF/A documents with unique correlative folios and digital signature blocks.
2. **QR Code & Hashing:** Generate non-sequential 128-bit random verification tokens and SHA-256 PDF hashes.
3. **Public Route `/verify/certificate/[folio]`:** Implement public page verifying certificate authenticity without exposing restricted citizen data.

### Phase 5: Lease Renewal Engine & Background Alert System
1. **Expiry Monitoring Job:** Create scheduled background task calculating lease expiration thresholds (30, 60, 90 days).
2. **Alert Triggers:** Mock/integrate multi-channel notification service (Email, SMS, WhatsApp).
3. **Reporting & Excel Export:** Build administrative exporter generating XLSX reports for lease renewals and financial receipts.

### Phase 6: Field Crew PWA & Document Management
1. **Responsive Mobile Layout:** Build mobile PWA view tailored for cemetery field personnel.
2. **Daily Execution Checklist:** Direct interface to view today's burials and mark executions complete.
3. **Camera Attachment Upload:** Implement drag-and-drop / camera capture for burial permits and receipts (PDF, JPG, PNG up to 10MB) with secure signed URL access.

### Phase 7: Data Migration Workbench & System Hardening
1. **ETL Migration Scripts:** Implement rules CL-01 through CL-15 for historical data cleansing (86,499 rows across 18 sheets).
2. **Exception Review Queue:** Build admin interface for resolving orphan locations, unverified RUTs, and corrupt characters (`MU?OZ` → `MUÑOZ`).
3. **Verification Sampling:** Implement automated validation check matching 300 random sample records against legacy sources with zero error tolerance on location, deceased name, and death date.

---

## 4. Antigravity Master Prompt

Copy and paste the markdown block below directly into **Antigravity** to execute the refactoring and enhancement:

```markdown
# TASK: Enhance Municipal Cemetery Management System with Interactive GIS Spatial Mapping, Instant Search, & Modern SaaS Architecture

## 1. Context & Operational Objectives
We are enhancing the 100% Web SaaS Municipal Cemetery Management Platform for the cemeteries of **San Carlos** and **Cachapoal**. The backend manages multi-cemetery property types (Patios, Pabellones, Bóvedas, Mausoleos, Nichos), lease regimes (2 months, 5 years, 20 years, 50 years, and perpetual), burials (inhumaciones), exhumations/transfers, mason work orders, QR-verified PDF certificates, and strict append-only audit logs.

We need to refactor and expand the current repository to incorporate an interactive spatial visual map, sub-second instant search, public certificate verification, automated lease notifications, and a field crew mobile workflow.

---

## 2. Technical Specifications & Architectural Mandates

### A. Interactive Spatial Map Component (GIS Visualizer)
- Create or update the frontend spatial map component (`CemeteryMap.tsx` / `CemeteryMap.vue`) using Leaflet.js / OpenLayers or a custom vector SVG Grid Canvas.
- Render cemetery physical layouts partitioned by Cemetery ID, Sector, Patio, and Pabellón.
- Apply dynamic visual color-coding to location slots:
  - 🟢 **Green (Available):** Free slot ready for lease/assignment.
  - 🔴 **Red (Occupied):** Inhumation registered.
  - 🟡 **Yellow (Reserved):** Administrative reservation active.
  - 🟠 **Orange (Lease Expired / Pending Renewal):** Expiry threshold (30/60/90 days) breached.
  - ⚪ **Gray (Blocked / Maintenance):** Hold or active work order.
- Implement a slide-over drawer panel when a location slot is clicked:
  - Displays property code (Sector, Row, Number).
  - Complete history of occupants (including exhumed individuals).
  - Current titleholder & lease expiry countdown.
  - Action buttons: "Register Burial", "Renew Lease", "Issue Certificate", "View Property File".

### B. High-Speed Instant Search Engine (<1s Response SLA)
- Implement predictive autocomplete search starting from 3 characters for text and 1 digit for RUT / location numbers.
- Support bidirectional search logic:
  1. **By Deceased:** Name, paternal/maternal surname, RUT (with/without dots and dash), death date.
  2. **By Location:** Cemetery, Patio/Pabellón, Row, Number.
- Fault-tolerant matching: Accent-insensitive, case-insensitive, and resilient to legacy encoding corruptions (e.g. `MU?OZ` matching `MUÑOZ`).
- Clicking a search result item immediately highlights and zooms/pans to the corresponding slot on the interactive map canvas.

### C. Public Certificate Verification Portal (`/verify/certificate/[folio]`)
- Build PDF/A certificate generator for Burials, Property Titles, Lease Renewals, and Exhumations.
- Attach unique non-sequential 128-bit verification codes and QR codes linking to `/verify/certificate/[folio]`.
- Public verification route must display certificate status (Vigente / Anulado), issuing timestamp, issuing authority, and SHA-256 PDF hash.
- Respect Ley 21.719 privacy rules: Never expose cause of death or personal contact numbers on public verification pages.

### D. Automated Lease Engine & Expiration Dashboard
- Implement background monitoring calculation for lease terms (2 months, 5 years, 20 years, 50 years).
- Build administrative widget highlighting expired and expiring leases (30, 60, 90 day filters).
- Trigger mock multi-channel alerts (Email / SMS / WhatsApp) to registered titleholders.
- Provide XLSX/CSV export capabilities for financial and lease reports.

### E. Field Crew Mobile PWA & Document Uploads
- Provide responsive mobile-first UI for cemetery field staff (sepultureros).
- Features: Daily scheduled burial/exhumation agenda, execution status confirmation, and camera capture for burial permits / death certificates (PDF/JPG/PNG up to 10MB) with secure signed URL access.

---

## 2. Database & Security Directives
1. **Append-Only Audit Trail:** Log user ID, RUT, IP address, Chilean timestamp, operation type, and exact field deltas. Ensure log rows cannot be updated or deleted.
2. **Data Cleansing Rules (CL-01 to CL-15):** Support RUT modulo 11 validation, sentinel date conversion (`1901-01-01` → NULL), age recalculation, and orphan location resolution.
3. **Performance Target:** Ensure search queries execute in ≤1s and property file opens in ≤2s at the 95th percentile with 30 concurrent users.

---

## 3. Execution Step-by-Step for Antigravity

1. **Audit Workspace:** Examine current models, REST routes, and UI components. Identify missing spatial fields and endpoints.
2. **Database & API Refactoring:** Add grid coordinate fields (`grid_x`, `grid_y`, `sector_code`, `status`) to location models. Create spatial and search REST endpoints.
3. **Build Map Canvas:** Implement `CemeteryMap` component with color status bindings and slide-over drawer.
4. **Link Instant Search to Map:** Wire instant search autocomplete to automatically select and focus target map slots.
5. **Verification & Mobile Views:** Create public QR verification route `/verify/certificate/[folio]` and mobile PWA layout for field staff.
6. **Testing & QA:** Validate search response times, QR code verification flows, audit logging integrity, and linting/types.

Proceed step-by-step, starting by summarizing the repository structure and listing the exact files to create or update.
```
