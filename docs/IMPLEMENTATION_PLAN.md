# 📋 IMPLEMENTATION PLAN: Closing All Identified Gaps
**Plataforma de Gestión Integral de Cementerios Municipales — San Carlos y Cachapoal**  
*Fecha:* 01 de Noviembre de 2026  
*Estrategia:* Vertical Slices (Migración + Backend + Frontend + Pruebas Automatizadas)

---

## 1. Orden de Prioridad para el Cierre de Brechas

Siguiendo estrictamente la directiva técnica de la EETT:
1. **Tier 0**: Cimientos y fundaciones arquitectónicas (Inmutabilidad, OCC, Privacidad, Traspasos múltiples, MIME seguro).
2. **Tier 1**: Pruebas Esenciales del Anexo 2 (Filas 1, 4, 8, 9, 11, 12, 17, 18, 19, 22, 26, 34).
3. **Tier 2**: Pruebas Post-adjudicación del Anexo 2 (Filas 2, 3, 5, 6, 7, 10, 13, 14, 15, 16, 20, 21, 23, 24, 25, 27–33, 35, 36, 37).
4. **Tier 3**: Mejoras opcionales (FirmaGob adapter).

---

## 2. Plan Detallado por Paquetes de Trabajo

### Paquete 0: Tier 0 — Fundaciones Arquitectónicas & Seguridad
| Tarea | Archivos Afectados | Descripción Técnica | Filas Anexo 2 que Desbloquea |
| :--- | :--- | :--- | :--- |
| **T0.1: Disparador Inmutabilidad Auditoría** | `backend/scripts/init_schemas.sql`, `backend/app/infrastructure/db/session.py` | Instalar triggers en BD (`trg_prevent_audit_tampering`) que rechacen `UPDATE` y `DELETE` en `tb_log_auditoria`. | A2-17 [E] |
| **T0.2: Concurrencia Optimista (OCC)** | `backend/app/domain/models/`, `backend/app/domain/schemas/`, endpoints | Agregar columna `version_id: int` a `tb_ubicacion`, `tb_derecho` e `tb_inhumacion` con validación de conflicto 409. | Concurrencia (Sec. 5) |
| **T0.3: Historial Cadena Múltiples Titulares** | `backend/app/domain/models/derecho.py`, `backend/app/domain/schemas/` | Crear tabla `tb_transferencia_derecho` vinculada a `tb_derecho` para registrar N transferencias con fecha, documento y resolución. | A2-02, A2-16 [P] |
| **T0.4: Fuga de Privacidad en Export Arriendos** | `backend/app/api/v1/endpoints/arriendos.py` | Encriptar/enmascarar teléfono y email en `GET /arriendos/exportar` para usuarios rol Visita o no autorizados. | A2-22 [E] |
| **T0.5: Validación MIME Magic Bytes & Descarga Privada** | `backend/app/api/v1/endpoints/terreno.py`, `backend/app/infrastructure/services/storage.py` | Validar encabezados binarios reales (`%PDF-`, PNG, JPG) rechazando ejecutables renombrados; endpoint autenticado `GET /adjuntos/{id}`. | A2-31 [P] |
| **T0.6: Encabezados de Seguridad HTTP** | `backend/app/main.py` | Inyectar middleware HSTS, CSP, X-Frame-Options, X-Content-Type-Options y Referrer-Policy. | A2-27 [P] |

---

### Paquete 1: Tier 1 — Pruebas Esenciales (Annex 2 Essential Rows)
| Tarea | Archivos Afectados | Descripción Técnica | Filas Anexo 2 que Desbloquea |
| :--- | :--- | :--- | :--- |
| **T1.1: Deshabilitar Ubicación con Historial** | `backend/app/api/v1/endpoints/ubicaciones.py`, `frontend/src/app/ubicaciones/page.tsx` | Endpoint `PATCH /ubicaciones/{id}/deshabilitar` con motivo, sin borrar filas y manteniendo historial visible. | A2-01 [E] |
| **T1.2: Persona Responsable en Inhumaciones** | `backend/app/domain/models/inhumacion.py`, `backend/app/domain/schemas/inhumacion.py`, `frontend/src/app/inhumaciones/page.tsx` | Campos `responsable_nombre`, `responsable_rut`, `responsable_telefono`, `responsable_direccion` en registro de sepultación. | A2-04 [E] |
| **T1.3: Módulo de Exhumaciones & Traslados** | `backend/app/api/v1/endpoints/exhumaciones.py`, `backend/app/api/v1/router.py`, `frontend/src/app/exhumaciones/page.tsx` | Registro completo de exhumaciones, traslados entre sepulturas, liberación de capacidad y conservación del enlace histórico. | A2-08 [E] |
| **T1.4: Anulación de Certificados con Motivo** | `backend/app/api/v1/endpoints/certificados.py`, `frontend/src/app/verify/certificate/[folio]/page.tsx` | Endpoint `POST /certificados/{folio}/anular` con motivo obligatorio y actualización del estado QR a CANCELADO. | A2-11 [E], A2-12 [E] |
| **T1.5: Búsqueda Exhumados con Ubicación Actual** | `backend/app/api/v1/endpoints/busqueda.py` | Incorporar `tb_exhumacion` en `GET /busqueda/autocomplete` devolviendo estado `EXHUMADO` y sepultura de destino. | A2-18 [E], A2-19 [E] |
| **T1.6: Índices Trigram GIN en Base de Datos** | `backend/app/infrastructure/migrations/`, `backend/scripts/init_schemas.sql` | Índices `CREATE INDEX ... USING gin (nombre_completo gin_trgm_ops)` para consultas sub-segundo con 30 usuarios concurrentes. | A2-20 [P] |
| **T1.7: Validación Automatizada del Exit Package** | `backend/tests/test_exit_package_standalone.py` | Script que descomprime el paquete generado y ejecuta el volcado SQL neutro sobre una base de datos limpia. | A2-34 [E] |

---

### Paquete 2: Tier 2 — Pruebas Post-Adjudicación (Annex 2 Post-Award Rows)
| Tarea | Archivos Afectados | Descripción Técnica | Filas Anexo 2 que Desbloquea |
| :--- | :--- | :--- | :--- |
| **T2.1: Renovación y Extensión de Arriendos** | `backend/app/api/v1/endpoints/arriendos.py` | Endpoint `POST /arriendos/{id}/renovar` para extender periodos (5, 20, 50 años) con nuevo folio de recibo. | A2-03, A2-14 [P] |
| **T2.2: Compra Perpetua de Nichos** | `backend/app/api/v1/endpoints/arriendos.py` | Endpoint `POST /arriendos/compra-perpetua` con comprador, RUT, orden de ingreso y emisión de certificado. | A2-05 [P] |
| **T2.3: Reglas de Adjuntos Obligatorios** | `backend/app/domain/models/adjunto.py`, `backend/app/api/v1/endpoints/adjuntos.py` | Modelo `tb_regla_adjunto` con configuración por tipo de trámite y exención automática para registros migrados. | A2-10 [P] |
| **T2.4: Módulo de Reservas y Liberación Admin** | `backend/app/domain/models/reserva.py`, `backend/app/api/v1/endpoints/reservas.py` | Tabla `tb_reserva`, solicitante, expiración y confirmación obligatoria del Administrador para liberar sepultura. | A2-13 [P] |
| **T2.5: Reportes Consolidados PDF / Excel** | `backend/app/api/v1/endpoints/reportes.py` | Módulo de reportes de inhumaciones, exhumaciones, ocupación por patio/pabellón y órdenes de trabajo. | A2-15 [P] |
| **T2.6: Scripts de Respaldo y Verificación** | `backend/scripts/backup.py`, `scripts/verify_restore.py` | Respaldo cifrado AES-256 diario/semanal con manifiesto SHA-256 y simulacro de restauración automatizado. | A2-32, A2-33 [P] |
| **T2.7: Diccionario de Datos y Manuales** | `docs/DATA_DICTIONARY.md`, `docs/USER_MANUAL_ADMIN.md`, `docs/USER_MANUAL_OPERATOR.md` | Especificación exhaustiva de tablas, tipos y guías de uso paso a paso en español chileno. | A2-24, A2-35 [P] |

---

### Paquete 3: Tier 3 — Adaptadores de Integración Externa
| Tarea | Archivos Afectados | Descripción Técnica | Filas Anexo 2 que Desbloquea |
| :--- | :--- | :--- | :--- |
| **T3.1: Adaptador FirmaGob** | `backend/app/infrastructure/services/firmagob_adapter.py` | Adaptador desacoplado para firma electrónica avanzada gubernamental con feature flag `FIRMAGOB_ENABLED=False`. | REQ-12.1 |
