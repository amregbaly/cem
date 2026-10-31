# Plataforma Web de Gestión Interna para los Cementerios Municipales de San Carlos y Cachapoal
### *Municipal Cemetery Management System (San Carlos & Cachapoal)*

> **Normativa Técnica de Referencia**: Licitación Municipal EETT 2026, Estándar OWASP ASVS Nivel 2, Ley 20.584 (Confidencialidad de Ficha Médica y Causa de Muerte).

---

## 🏛️ Resumen Ejecutivo / Executive Summary

Sistema integral de gestión y control para los Cementerios Municipales de **San Carlos** y **Cachapoal**, desarrollado bajo arquitectura de **Monolito Modular** de alto rendimiento con validación criptográfica de integridad y motor de migración histórica para 86.499 registros (Reglas R1 a R12).

### ✨ Características Principales / Core Highlights
1. **🌐 Interfaz Bilingüe Nativa (Español & English)**:
   - Soporte multilingüe en tiempo real con selector instantáneo en barra superior (`LanguageContext`).
2. **☀️/🌙 Modos Día y Noche (Day & Night Mode)**:
   - Conmutación suave entre paleta institucional diurna y modo nocturno de descanso visual con sincronización a variables CSS (`ThemeContext`).
3. **🎨 Personalizador de Temas en Panel Administrador (Admin Theme Customizer)**:
   - Selector y editor visual de colores en vivo para los tokens: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-bg`, `--color-surface`, `--color-text` y `--color-border`.
   - Capacidad de **crear y guardar nuevos temas personalizados** (ej. *Municipalidad Dorado*, *Otoño Cordillerano*), persistidos en API y almacenamiento local.
4. **🔒 Trazabilidad Criptográfica Inmutable (HMAC SHA-256)**:
   - Registro de auditoría de solo adición (*Append-Only*) en esquema `audit.tb_log_auditoria`.
   - Cada mutación encadena el hash previo y calcula firma criptográfica con secreto HMAC municipal. Detección inmediata de cualquier alteración o borrado no autorizado.
5. **⚡ Búsqueda Instantánea por Trigramas (`pg_trgm`)**:
   - Autocompletado reactivo por Nombre de Fallecido, RUT chileno (con validación Módulo 11), Folio y Ubicación.
6. **📊 Motor de Migración Histórica ETL (Reglas R1 a R12)**:
   - Ingesta de `Base de datos CEMENTERIO.xlsx` con balance matemático perfecto:
     $$\text{Total Origen (86.499)} = \text{Migrados} + \text{Excepciones} + \text{Descartados Aprobados}$$
   - Regla R1: Formateo `12345678-K` y validación de dígito verificador Módulo 11.
   - Regla R2: Partición atómica de nombres respetando partículas chilenas (`DE LA`, `DEL`, `DE LOS`, `SAN`).
   - Regla R3: Conversión de fechas seriales de Excel y traducción de centinela `1901-01-01` a `NULL` con flag `fecha_nacimiento_desconocida = TRUE`.
   - Regla R8: Reparación fonética de apellidos corruptos (`MU?OZ` → `MUÑOZ`, `YA?EZ` → `YAÑEZ`).
   - Regla R11: Reconocimiento formal de no identificados (`NN`).

---

## 🏗️ Arquitectura del Repositorio

```
cem/
├── backend/
│   ├── alembic.ini                        # Configuración de migraciones multiesquema
│   ├── pyproject.toml                     # Python 3.12, FastAPI, SQLAlchemy 2.0
│   ├── app/
│   │   ├── api/                           # Controladores REST API v1
│   │   │   ├── deps.py                    # Autenticación, JWT, roles y modo visitante
│   │   │   └── v1/endpoints/              # Endpoints: auth, cementerios, ubicaciones, inhumaciones, temas, auditoria, migracion, busqueda
│   │   ├── domain/                        # Entidades de dominio y esquemas Pydantic
│   │   │   ├── models/                    # Modelos SQLAlchemy (4 esquemas: core, staging, migration, audit)
│   │   │   └── schemas/                   # DTOs y validadores
│   │   └── infrastructure/
│   │       ├── db/                        # Sesión SQLAlchemy y AuditService (HMAC SHA-256)
│   │       └── migrations/                # Scripts de migración Alembic multiesquema
│   ├── etl/                               # Motor ETL histórico (R1 a R12)
│   │   ├── rut_validator.py               # Regla R1 (Módulo 11)
│   │   ├── name_parser.py                 # Regla R2 (Partículas chilenas & NN)
│   │   ├── date_parser.py                 # Regla R3 (Fechas Excel & Centinela 1901)
│   │   ├── char_repair.py                 # Regla R8 (Diccionario reparación 'Ñ')
│   │   ├── migrate_excel.py               # Pipeline de ingesta y conciliación
│   │   └── reconciliation_report.py       # Reporte automatizado de cuadratura
│   └── tests/                             # Suite de pruebas automatizadas (23 tests pasando)
│
├── frontend/                              # SPA Next.js 14 / React 18 / Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                   # Dashboard principal ejecutivo y búsqueda
│   │   │   ├── inhumaciones/page.tsx      # Libro matriz de inhumaciones y registro RUT M11
│   │   │   ├── ubicaciones/page.tsx       # Cuadrícula visual de sepulturas y arriendos
│   │   │   ├── auditoria/page.tsx         # Consola de verificación criptográfica HMAC
│   │   │   ├── migracion/page.tsx         # Consola de balance ETL R1-R12
│   │   │   └── admin/temas/page.tsx       # Panel Administrador de personalización de temas y colores
│   │   ├── components/                    # Navbar, AutocompleteSearch, StatCard, ThemeCustomizerModal, AuditBadge
│   │   ├── context/                       # LanguageContext (ES/EN) y ThemeContext (Día/Noche/Custom)
│   │   └── translations/                  # Diccionarios es.ts y en.ts
│   └── tailwind.config.ts                 # Tokens mapeados a variables CSS dinámicas
│
├── docker-compose.yml                     # PostgreSQL 16 (puerto 5433), API (8001), Frontend (3002)
└── ANTIGRAVITY_DEV_PLAN.md                # Especificación técnica maestra del proyecto
```

---

## 🚀 Puesta en Marcha / Quick Start

### 1. Variables de Entorno
Copie el archivo de ejemplo:
```bash
cp .env.example .env
```

### 2. Ejecución con Docker Compose
Para iniciar toda la infraestructura (Base de datos PostgreSQL 16 con extensiones `pg_trgm`, Backend FastAPI y Frontend Next.js):
```bash
docker compose up -d
```
- **Frontend SPA**: `http://localhost:3002`
- **Backend API & Swagger Docs**: `http://localhost:8001/docs`
- **PostgreSQL**: `localhost:5433` (base de datos: `cemetery_db`)

### 3. Ejecución Local para Desarrollo

#### Backend (Python 3.12):
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

#### Frontend (Next.js 14):
```bash
cd frontend
npm run dev -- -p 3002
```

---

## 🧪 Pruebas Automatizadas / Automated Testing

### Backend Test Suite:
```bash
cd backend
.venv/bin/pytest -v
```
**Resultado actual**: `23 passed in 4.25s`
- `test_audit_log_cryptographic_chain`: Verificación de firma SHA-256 encadenada.
- `test_audit_log_tamper_detection`: Prueba de ruptura inmediata de integridad ante alteración forzada.
- `test_rut_validator`: Casos límite del algoritmo Módulo 11 (K, ceros iniciales, cuerpos numéricos).
- `test_char_repair`: Corrección de `MU?OZ` a `MUÑOZ` mediante diccionario municipal.
- `test_date_parser`: Fechas seriales de Excel y conversión de centinela `1901-01-01` a NULL.
- `test_name_parser`: División atómica respetando apellidos compuestos (`DE LA FUENTE`).
- `test_etl_pipeline`: Ejecución sobre muestra real enmascarada con balance 100% verificado.
- `test_api_endpoints`: Endpoints de salud, temas, autocompletado y verificación criptográfica.

### Frontend Production Build:
```bash
cd frontend
npm run build
```
**Resultado actual**: `✓ Compiled successfully (9/9 static routes rendered)`.

---

## 📜 Licencia y Atribución
Desarrollado para la **Ilustre Municipalidad de San Carlos** y los **Cementerios Municipales de San Carlos y Cachapoal**.
Cumple estrictamente con las Especificaciones Técnicas (EETT) 2026 y estándares de ciberseguridad municipal.
