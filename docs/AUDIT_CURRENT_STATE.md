# 🔍 AUDIT CURRENT STATE: Municipal Cemetery Management Platform
**Plataforma de Gestión Integral de Cementerios Municipales — San Carlos y Cachapoal**  
*Fecha de Auditoría:* 01 de Noviembre de 2026  
*Autor:* Antigravity Lead Architect, Senior Full-Stack & Security Engineer  
*Referencia Base:* `Cemetery_Platform_Technical_Requirements.docx` (EETT Cementerios 2026)

---

## 1. Stack Tecnológico & Entorno de Ejecución

| Componente | Tecnología | Versión | Propósito & Configuración |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | FastAPI (ASGI) / Uvicorn | 0.115.3 / Python 3.12.13 | API REST asíncrona, validación Pydantic V2, router modular `/api/v1` |
| **ORM & Modelado** | SQLAlchemy | 2.0.36 | Modelos declarativos Tipados (`Mapped`), soporte dual PostgreSQL/SQLite |
| **Base de Datos Prod/Dev** | PostgreSQL / SQLite multi-attach | PG 16-alpine / SQLite 3 | 4 esquemas lógicos: `core`, `audit`, `migration`, `staging` |
| **Frontend Framework** | Next.js (App Router) | 14.2.35 / React 18.3.1 | SPA/SSR hibrido, renderizado estático (13 rutas), modo cliente |
| **Estilos & UI** | Tailwind CSS + CSS Tokens | 3.4.14 | Paleta dinámica (día/noche/contrastes), soporte multilenguaje (ES/EN) |
| **Seguridad & Auth** | PyJWT, Passlib (Argon2id/Bcrypt), PyOTP | - | JWT tokens, lockout tras 5 intentos, TOTP RFC 6238, HMAC SHA-256 |
| **Generación Documental** | ReportLab (PDF/A) + QRCodegen | - | Certificados oficiales con sello digital, hash SHA-256 y token criptográfico 128-bit |
| **Contenedores** | Docker Compose | Compose v2 | `cem_postgres` (puerto externo 5434), redis, backend (8001), frontend (5011) |

---

## 2. Resumen de Esquemas y Base de Datos en Vivo

El sistema utiliza 4 esquemas aislados para cumplir con las directivas de trazabilidad y gobernanza de datos (Ley 21.719):

### Esquema 1: `core` (Entidades Operacionales)
- **`tb_cementerio`** (2 filas): Cementerios independientes (`San Carlos` y `Cachapoal`).
- **`tb_persona`** (48 filas): Ciudadanos, fallecidos, solicitantes y titulares con RUT particionado (`rut_cuerpo`, `rut_dv`, `rut_validado`), nombres atómicos (`nombres`, `apellido_paterno`, `apellido_materno`), y flag `es_nn`.
- **`tb_ubicacion`** (134 filas): Sepulturas con coordenadas espaciales (`grid_x`, `grid_y`), sector, fila, número, capacidad ocupada/total, y estado (`DISPONIBLE`, `OCUPADA`, `RESERVADA`, etc.). *Nota:* El número de sepultura está acotado por cementerio + sector + fila, permitiendo números repetidos entre patios distintos.
- **`tb_derecho`** (39 filas): Concesiones, compras perpetuas y arriendos temporales vinculados a sepulturas. Posee `titular_persona_id`, `titular_anterior_id`, `folio_recibo`, `fecha_vencimiento`.
- **`tb_inhumacion`** (36 filas): Registro de sepultaciones con fecha de defunción, fecha de sepultación, pase de sepultación y causa de muerte.
- **`tb_exhumacion`** (20 filas): Historial de traslados y reducciones entre sepulturas origen y destino.
- **`tb_maestros`** (21 filas): Directorio de constructores/maestros autorizados.
- **`tb_derechos_maestros`** (20 filas): Órdenes de trabajo de maestros en sepulturas.
- **`tb_certificado`** (17 filas): Certificados emitidos con folio único secuencial, token aleatorio >=128 bits, hash SHA-256 y código QR.
- **`tb_tarea_terreno`** (3 filas): Agenda diaria para sepultureros y cuadrillas de campo.
- **`tb_usuario`** (36 filas): Cuentas nominativas (2 Administradores, 8 Administrativos, 20 Visitas, operarios) con contraseñas seguras, contador de intentos y lockout.
- **`tb_grupo` & `tb_grupo_permiso`** (6 grupos, 48 permisos): Matriz granular de roles y permisos RBAC.
- **`tb_config_portal`** (1 fila): Ajustes públicos del portal ciudadano y conmutador de visualización de lista de fallecidos.
- **`tb_config_tema`** (20 filas): Paletas cromáticas institucionales y accesibles.

### Esquema 2: `audit` (Gobernanza Criptográfica)
- **`tb_log_auditoria`** (113 eventos): Registro inmutable con `timestamp` oficial chileno, actor (`username`, `user_rut`, `user_role`, `ip_address`), `modulo`, `accion`, `entidad`, `registro_id`, `payload_anterior`, `payload_posterior`, `hash_anterior` y `hash_registro` (cadena de bloques HMAC-SHA256).

### Esquema 3: `migration` (Trazabilidad y Calidad de Datos)
- **`tb_excepcion_migracion`** (63 excepciones): Bitácora de filas fuente con anomalías detectadas en reglas R1 a R12 (RUT sin dígito verificador, fechas inválidas, etc.).
- **`tb_reconciliacion_migracion`** (9 hojas): Balance formal de cuadratura por hoja (`total_origen = migrados + excepcion + descartados`).

### Esquema 4: `staging`
- Esquema de paso para ingestión temporal de hojas de cálculo sin alterar datos productivos.

---

## 3. Inventario de Rutas API (54 Endpoints)

| Módulo / Prefijo | Rutas Principales | Middleware / Autenticación |
| :--- | :--- | :--- |
| **`/api/v1/auth`** | `login`, `me`, `cambiar-password`, `totp/setup`, `totp/verify`, `usuarios`, `usuarios/{id}/desbloquear` | JWT, Require Role (ADMINISTRADOR) |
| **`/api/v1/grupos`** | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/usuarios/{uid}` | Require Role (ADMINISTRADOR) |
| **`/api/v1/portal`** | `GET /config` (público), `PUT /config` (admin) | Require Role (ADMINISTRADOR/ADMINISTRATIVO) |
| **`/api/v1/cementerios`** | `GET /` | Lectura general |
| **`/api/v1/ubicaciones`** | `GET /`, `POST /`, `GET /mapa/sectores`, `GET /mapa/cuadricula`, `GET /{id}`, `GET /{id}/historial` | Filtro por cementerio, control de capacidad |
| **`/api/v1/inhumaciones`** | `GET /`, `POST /` | Enmascaramiento Ley 21.719; 403 Forbidden para público si restringido |
| **`/api/v1/certificados`** | `POST /emitir`, `GET /descargar/{folio}`, `GET /publico/{folio_or_token}` | Emisión con token 128-bit, descarga PDF/A, verificación QR pública |
| **`/api/v1/arriendos`** | `GET /vencimientos`, `POST /notificar`, `GET /exportar` | Cálculo de 30/60/90 días, radar de alertas |
| **`/api/v1/terreno`** | `GET /agenda`, `POST /tarea`, `PATCH /tarea/{id}/completar`, `POST /subir-acta` | PWA operarios de campo, subida de documentos |
| **`/api/v1/maestros`** | `GET /`, `POST /`, `GET /ordenes`, `POST /ordenes` | Directorio de maestros y órdenes de obra |
| **`/api/v1/migracion`** | `POST /ejecutar`, `GET /excepciones`, `GET /reconciliacion` | ETL reglas R1-R12 y conciliación de cuadratura |
| **`/api/v1/auditoria`** | `GET /`, `POST /verificar`, `GET /export-csv`, `GET /exit-package` | Verificación de cadena HMAC SHA-256, ZIP de portabilidad |
| **`/api/v1/busqueda`** | `GET /autocomplete` | Autocompletado sub-segundo con reparación fonética |
| **`/api/v1/temas`** | `GET /`, `POST /`, `GET /activo`, `POST /activar/{id}`, `PUT /{id}`, `DELETE /{id}` | Selector y editor de paletas |

---

## 4. Pantallas de Usuario (11 Rutas Frontend)

1. **`/` (Dashboard Operacional / Portal Ciudadano)**: Vista conmutada condicional. Visitantes ven el verificador de certificados con descarga de PDF; personal autenticado visualiza KPIs y accesos directos.
2. **`/admin`**: Panel de control del sistema: gestión de usuarios nominativos, grupos y matriz RBAC, y conmutador del portal público.
3. **`/admin/temas`**: Gestor de temas y contraste visual institucional.
4. **`/arriendos`**: Radar de vencimientos de nichos y sepulturas temporales a 30, 60 y 90 días con exportación a CSV.
5. **`/auditoria`**: Visor de trazabilidad HMAC SHA-256 con botón de verificación de integridad y exportación de paquete de salida.
6. **`/campo`**: PWA responsiva para cuadrillas de terreno y registro de pases.
7. **`/inhumaciones`**: Registro oficial de sepultaciones, validación Módulo 11 en vivo y modo confidencial de causas médicas.
8. **`/migracion`**: Reportes de conciliación matemática de hojas Excel y libro de excepciones.
9. **`/ubicaciones`**: Explorador de sepulturas, cuadrícula espacial interactiva y drawer con historial completo de la tumba.
10. **`/verify/certificate`**: Buscador público de certificados oficiales por Folio o token QR.
11. **`/verify/certificate/[folio]`**: Hoja digital de verificación de autenticidad con descarga directa del PDF sellado.

---

## 5. Comandos de Operación y Línea Base de Pruebas

### Comandos Exactos
- **Construcción Frontend:** `cd frontend && npm run build`  
  *Resultado:* `✓ Compiled successfully (13/13 static routes rendered)`.
- **Servidor Frontend Dev:** `cd frontend && npm run dev` (Puerto 5011).
- **Ejecución Backend:** `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload`.
- **Suite de Pruebas Backend:** `cd backend && .venv/bin/pytest -v`.

### Línea Base de Pruebas (Test Baseline)
- **Total de Pruebas:** 39 pruebas automáticas.
- **Aprobadas:** 38 passed.
- **Fallidas:** 1 failed (`tests/test_spatial_enhancements.py::test_terreno_agenda_and_tasks`, debido a filtro de fecha estricto `date.today()` sobre datos semilla fijados al 31-Oct-2026).
- **Tiempo de Ejecución:** 46.11 segundos.

---

## 6. Riesgos Identificados & Brechas Arquitectónicas

1. **Falta de Disparadores (Triggers) de Inmutabilidad en DB**: La cadena criptográfica de auditoría detecta alteraciones vía software, pero la tabla `audit.tb_log_auditoria` carece de disparadores `BEFORE UPDATE OR DELETE RAISE(ABORT)` para impedir físicamente que un DBA o inyección SQL modifique filas históricas.
2. **Ausencia de Control de Concurrencia Optimista (OCC)**: Ninguna de las entidades operacionales (`tb_ubicacion`, `tb_derecho`, `tb_inhumacion`) posee columna de versión (`version_id`), lo que permite que dos sesiones concurrentes sobreescriban silenciosamente los datos de la otra sin alerta de conflicto.
3. **Módulo de Exhumaciones y Traslados Incompleto**: Existe la tabla `tb_exhumacion`, pero no hay endpoints en la API para registrar exhumaciones, traslados entre sepulturas o liberación de capacidad con trazabilidad encadenada.
4. **Fuga de Datos Sensibles en Exportación de Arriendos**: El endpoint `GET /api/v1/arriendos/exportar` carece de autenticación obligatoria y expone números de teléfono y correos electrónicos de los titulares a cualquier usuario o visitante no autorizado.
5. **Validación de Archivos Adjuntos Insegura**: El endpoint de carga `POST /api/v1/terreno/subir-acta` solo valida la extensión del archivo y no inspecciona firmas de contenido (magic bytes). Además, no está protegido por autenticación obligatoria y carece de reglas configurables de adjuntos obligatorios.
6. **Módulo de Reservas y Estados de Disponibilidad Faltante**: No existe tabla `tb_reserva` ni flujo de confirmación administrativa para la expiración o liberación de reservas de sepulturas.
7. **Cadena Histórica de Múltiples Transferencias de Propiedad**: `tb_derecho` solo guarda un titular actual y un único `titular_anterior_id`, perdiéndose la cadena completa ante dos o más transferencias sucesivas.
