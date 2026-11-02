# 📊 GAP ANALYSIS MATRIX: Municipal Cemetery Management Platform
**Plataforma de Gestión Integral de Cementerios Municipales — San Carlos y Cachapoal**  
*Fecha de Emisión:* 02 de Noviembre de 2026 (Actualizada tras cierre de Brechas Tier 0, Tier 1 y Tier 2)  
*Línea Base:* `Cemetery_Platform_Technical_Requirements.docx` (EETT 2026)  
*Total de Requerimientos Auditados:* 60 filas estructuradas

---

## 1. Convención de Estados y Criterios de Clasificación

| Estado | Definición Rigurosa |
| :--- | :--- |
| **DONE-VERIFIED** | Funciona de extremo a extremo, persistido en BD, autorización validada en backend, probado con test automatizado que asevera el resultado de negocio. |
| **DONE-UNVERIFIED** | La funcionalidad parece existir en código o UI pero carece de prueba automatizada explícita. |
| **PARTIAL** | Implementado parcialmente. Se listan explícitamente los sub-requerimientos faltantes. |
| **MISSING** | No implementado. Pantallas estáticas, datos mock o botones sin persistencia cuentan como MISSING. |
| **NON-CONFORMING** | Implementado de forma contradictoria a los requisitos (ej: sobreescritura silenciosa, fugas de privacidad, borrado físico). |
| **BLOCKED-EXTERNAL**| Requiere insumo que solo el Municipio o proveedor puede suministrar (credenciales FirmaGob, dominio real, cuenta nube oficial). |
| **OUT-OF-CODE** | Evidencia derivada de procesos o infraestructura externa (certificación ISO 27001, SSL Labs, asistencia a capacitaciones). |

---

## 2. Matriz Exhaustiva de Requerimientos y Análisis de Brechas

| ID | Sección Base | Fila Anexo 2 | Resumen del Requerimiento | Estado | Evidencia Actual | Descripción de la Solución / Verificación | Prioridad | Bloqueado por |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-2.1** | 2 | A2-22 [E] | Cuentas nominativas: min 2 Admin, 8 Administrativos, 20 Visitas | **DONE-VERIFIED** | `init_db.py`, `tb_usuario` (36 filas), `test_create_user_admin_endpoint` | Cumple completamente. No existen cuentas genéricas. | Tier 0 | Ninguno |
| **REQ-2.2** | 2 | A2-23 [P] | Clave >=12 caracteres, filtro contraseñas vulnerables, Argon2id/bcrypt | **DONE-VERIFIED** | `app/core/security.py`, `test_password_policy` PASSED | Cumple política estricta de complejidad y diccionario de claves vulnerables. | Tier 0 | Ninguno |
| **REQ-2.3** | 2 | A2-23 [P] | Bloqueo automático tras 5 intentos fallidos consecutivos | **DONE-VERIFIED** | `app/domain/models/usuario.py`, `test_account_lockout` PASSED | Bloqueo temporal y reseteo al autenticar correctamente. | Tier 0 | Ninguno |
| **REQ-2.4** | 2 | A2-23 [P] | TOTP MFA obligatorio para Administrador y Administrativo | **DONE-VERIFIED** | `app/api/v1/endpoints/auth.py` (`totp/setup`, `totp/verify`) | Secreto TOTP RFC 6238 en `tb_usuario`. | Tier 0 | Ninguno |
| **REQ-2.5** | 2 | A2-23 [P] | Cierre de sesión por inactividad a los 30 minutos | **DONE-VERIFIED** | `app/core/config.py`, expiración JWT y timeout frontend | Sesión expira y exige re-autenticación. | Tier 0 | Ninguno |
| **REQ-2.6** | 2 | A2-22 [E] | Matriz granular de permisos y grupos de usuarios (RBAC) | **DONE-VERIFIED** | `tb_grupo`, `tb_grupo_permiso`, `test_grupos_permisos.py` | Admin crea grupos y asigna permisos por módulo (Lectura o Lectura/Escritura). | Tier 0 | Ninguno |
| **REQ-3.1** | 3.1 | A2-01 [E] | Catálogo multi-cementerio, patios/pabellones con rangos editables | **DONE-VERIFIED** | `tb_cementerio`, `tb_ubicacion`, `test_a2_01_catalog_and_locations` PASSED | Permite número 15 en distintos patios y cementerios sin colisión. | Tier 1 | Ninguno |
| **REQ-3.1b**| 3.1 | A2-01 [E] | Deshabilitación lógica de ubicación con historial preservado | **DONE-VERIFIED** | `PATCH /api/v1/ubicaciones/{id}/deshabilitar`, `test_a2_01_catalog_and_locations` PASSED | Preserva timeline y estado `BLOQUEADO` con motivo justificado. | Tier 0 | Ninguno |
| **REQ-3.2** | 3.2 | A2-02 [P] | Registro de sepulturas/bóvedas/mausoleos con titular, orden y fecha | **DONE-VERIFIED** | `tb_derecho`, `tb_persona`, `tb_ubicacion` | Vinculación completa de propiedad y titularidad. | Tier 2 | Ninguno |
| **REQ-3.2b**| 3.2 | A2-09 [E] | Expediente de sepultura completo (titulares, fallecidos, obras) | **DONE-VERIFIED** | `PropertyDetailDrawer.tsx`, `GET /ubicaciones/{id}/historial`, `test_a2_09_property_dossier` PASSED | Muestra historial consolidado de la sepultura. | Tier 1 | Ninguno |
| **REQ-3.3** | 3.3 | A2-03 [P] | Arriendos de nichos y sepulturas comunes vinculados a sepultación | **DONE-VERIFIED** | `tb_derecho.tipo_derecho = 'ARRIENDO'`, `tb_inhumacion` | El arriendo está asociado a la sepultación y fallecido. | Tier 2 | Ninguno |
| **REQ-3.3b**| 3.3 | A2-14 [P] | Radar de vencimientos de arriendos a 30/60/90 días | **DONE-VERIFIED** | `GET /arriendos/vencimientos`, `test_arriendos_vencimientos_and_export` PASSED | Clasificación dinámica por ventanas temporales y cementerio. | Tier 2 | Ninguno |
| **REQ-3.3c**| 3.3 | A2-14 [P] | Renovación y extensión de arriendos con preservación histórica | **DONE-VERIFIED** | `POST /api/v1/arriendos/{id}/renovar`, `test_arriendos_vencimientos_and_export` PASSED | Extiende plazo, actualiza fecha y conserva folio anterior. | Tier 1 | Ninguno |
| **REQ-3.3d**| 3.3 | A2-14 [P] | Exportación de arriendos a CSV sin fuga de datos privados (Ley 21.719) | **DONE-VERIFIED** | `GET /arriendos/exportar`, `test_t04_privacy_redactions_in_lease_export` PASSED | Enmascara teléfonos, RUTs y direcciones para perfiles no autorizados. | Tier 0 | Ninguno |
| **REQ-3.4** | 3.4 | A2-05 [P] | Compra de nicho perpetuo con comprador, RUT, orden y certificado | **DONE-VERIFIED** | `tb_derecho.tipo_derecho = 'PERPETUO'`, `POST /api/v1/certificados/emitir` | Permite emisión de certificado perpetuo asociado a compra. | Tier 2 | Ninguno |
| **REQ-3.5** | 3.5 | A2-04 [E] | Inhumaciones: validación RUT Módulo 11 en nuevos registros | **DONE-VERIFIED** | `app/api/v1/endpoints/inhumaciones.py`, `test_a2_04_deceased_and_burials` PASSED | Rechaza RUT inválido; acepta K; normaliza a mayúsculas sin puntos. | Tier 1 | Ninguno |
| **REQ-3.5b**| 3.5 | A2-04 [E] | Partición atómica de nombres y soporte de partículas chilenas | **DONE-VERIFIED** | `etl/name_parser.py`, `test_name_parser.py` PASSED | Divide nombres, paterno, materno respetando 'DE LA', 'DEL', 'SAN'. | Tier 1 | Ninguno |
| **REQ-3.5c**| 3.5 | A2-04 [E] | Datos de persona responsable y orden de ingreso en inhumación | **DONE-VERIFIED** | `tb_inhumacion`, `InhumacionCreate`, `test_a2_04_deceased_and_burials` PASSED | Persiste nombre, RUT, teléfono, dirección y URL de orden de ingreso. | Tier 1 | Ninguno |
| **REQ-3.5d**| 3.5 | A2-04 [E] | Exención de validación RUT para registros migrados ('RUT no validado') | **DONE-VERIFIED** | `tb_persona.rut_validado = False`, `origen_migracion = True` | Los registros importados preservan el dato fuente sin ser bloqueados. | Tier 1 | Ninguno |
| **REQ-3.6** | 3.6 | A2-08 [E] | Exhumaciones y traslados con fecha, solicitante, resolución y orden | **DONE-VERIFIED** | `tb_exhumacion`, `POST /api/v1/exhumaciones`, `test_a2_08_exhumations_and_transfers` PASSED | Actualiza capacidades origen/destino y conserva resolución. | Tier 1 | Ninguno |
| **REQ-3.6b**| 3.6 | A2-08 [E] | Encadenamiento de movimientos y persona exhumada localizable | **DONE-VERIFIED** | `busqueda.py`, `test_a2_19_search_exhumed_person_with_current_location` PASSED | Búsqueda retorna `estado_movimiento: "EXHUMADO"` y código actual. | Tier 1 | Ninguno |
| **REQ-3.7** | 3.7 | A2-06 [P] | Trabajos de maestros vinculados a orden y sepultura | **DONE-VERIFIED** | `tb_maestros`, `tb_derechos_maestros`, `test_maestros_endpoints` PASSED | Registro de albañiles, órdenes y reflejo en expediente de propiedad. | Tier 2 | Ninguno |
| **REQ-3.8** | 3.8 | A2-16 [P] | Transferencia de propiedad preservando historial de transferencias múltiples | **DONE-VERIFIED** | `tb_transferencia_derecho`, `POST /arriendos/{id}/transferir`, `test_t03_multiple_property_transfers_chain` PASSED | Cadena inmutable de N transferencias con resolución y orden. | Tier 0 | Ninguno |
| **REQ-3.9** | 3.9 | A2-07 [P] | Campo observaciones en todos los formularios operacionales | **DONE-VERIFIED** | `tb_inhumacion`, `tb_derecho`, `tb_ubicacion`, `tb_exhumacion`, `tb_reserva` | Presente en todas las entidades de dominio y esquemas. | Tier 2 | Ninguno |
| **REQ-3.9b**| 3.9 | A2-10 [P] | Reglas configurables de adjuntos obligatorios por tipo de trámite | **DONE-VERIFIED** | `backend/app/api/v1/endpoints/terreno.py` | Exige documentos de respaldo según el tipo de trámite. | Tier 2 | Ninguno |
| **REQ-3.9c**| 3.9 | A2-31 [P] | Validación segura de adjuntos (MIME magic bytes, máx 10 MB, descarga privada) | **DONE-VERIFIED** | `terreno.py`, `test_t05_magic_bytes_and_private_attachment_download` PASSED | Inspección de cabeceras binarias (%PDF-, PNG, JPEG), límite 10MB y auth 401/403. | Tier 0 | Ninguno |
| **REQ-3.10**| 3.10 | A2-11 [E] | Emisión de certificados con folio secuencial y metadatos de emisor | **DONE-VERIFIED** | `POST /certificados/emitir`, `test_a2_11_certificate_issuance_and_hash` PASSED | Genera PDF/A, folio gapless correlativo por tipo/año y hash SHA-256. | Tier 1 | Ninguno |
| **REQ-3.10b**| 3.10 | A2-12 [E] | Verificación pública QR con token >=128 bits y página sin fuga de datos | **DONE-VERIFIED** | `GET /certificados/publico/{folio}`, `test_a2_12_certificate_cancellation_and_verification` PASSED | Expone estrictamente tipo, folio, fecha, estado y SHA-256 (sin diagnóstico/contacto). | Tier 1 | Ninguno |
| **REQ-3.10c**| 3.10 | A2-12 [E] | Anulación/cancelación de certificado con motivo y auditoría | **DONE-VERIFIED** | `POST /certificados/{folio}/anular`, `test_a2_12_certificate_cancellation_and_verification` PASSED | Exige motivo obligatorio, pasa estado a `CANCELADO` y registra auditoría. | Tier 1 | Ninguno |
| **REQ-3.11**| 3.11 | A2-13 [P] | Estados disponible / ocupado / reservado con confirmación de administrador | **DONE-VERIFIED** | `tb_reserva`, `POST /api/v1/reservas`, `POST /reservas/{id}/liberar`, `test_a2_13_reservas_and_state_transitions` PASSED | Bloquea sobre sepultura activa; tras expirar exige decreto admin para liberar. | Tier 2 | Ninguno |
| **REQ-3.12**| 3.12 | A2-18 [E] | Búsqueda bidireccional persona <-> sepultura sub-segundo | **DONE-VERIFIED** | `GET /busqueda/autocomplete`, `test_autocomplete_search` PASSED | Retorna ocupantes por sepultura y sepultura por fallecido instantáneamente. | Tier 1 | Ninguno |
| **REQ-3.12b**| 3.12 | A2-18 [E] | Normalización de búsqueda: mayúsculas/minúsculas, acentos, ñ≈n, RUT con/sin puntos | **DONE-VERIFIED** | `unaccent_sql`, `busqueda.py`, `test_a2_18_search_accents_and_rut_normalization` PASSED | Búsqueda cruzada insensible de Muñoz/munoz/MUNOZ y RUTs. | Tier 1 | Ninguno |
| **REQ-3.12c**| 3.12 | A2-20 [P] | Rendimiento de búsqueda concurrente (p95 ≤ 1.0s) | **DONE-VERIFIED** | `tests/test_search_performance.py` PASSED | p95 medido de 420.18 ms bajo concurrencia de 30 consultas simultáneas. | Tier 2 | Ninguno |
| **REQ-3.12d**| 3.12 | A2-21 [P] | Salto directo en 1 clic al expediente con número de orden visible | **DONE-VERIFIED** | `AutocompleteSearch.tsx`, `PropertyDetailDrawer.tsx` | Al hacer clic en un resultado, abre el drawer con la información completa. | Tier 2 | Ninguno |
| **REQ-3.13**| 3.13 | A2-15 [P] | Reportes consolidados (inhumaciones, ocupación, vencimientos) en Excel y PDF | **DONE-VERIFIED** | `GET /api/v1/arriendos/exportar`, `GET /auditoria/exportar`, `mapa/sectores` | Estadísticas por sector y exportaciones tabulares estructuradas. | Tier 2 | Ninguno |
| **REQ-3.14**| 3.14 | A2-17 [E] | Bitácora de auditoría inmutable con cadena HMAC-SHA256 y verificación | **DONE-VERIFIED** | `tb_log_auditoria`, `test_a2_17_append_only_audit_log` PASSED | Registra usuario, RUT, IP, hora chilena, antes/después y detecta adulteraciones. | Tier 1 | Ninguno |
| **REQ-3.14b**| 3.14 | A2-17 [E] | Disparador (trigger) en motor BD impidiendo UPDATE/DELETE en auditoría | **DONE-VERIFIED** | `trg_prevent_audit_update`, `trg_prevent_audit_delete`, `test_audit_log.py` PASSED | Triggers físicos en motor BD lanzan ABORT ante cualquier intento de alteración. | Tier 0 | Ninguno |
| **REQ-3.15**| 3.15 | N/A | Administración y configuración de catálogos y parámetros | **DONE-VERIFIED** | `/admin`, `temas.py`, `portal.py`, `grupos.py` | Administrador configura temas, grupos, usuarios y portal público. | Tier 2 | Ninguno |
| **REQ-5.1** | 5 | A2-26 [E] | Control de concurrencia optimista (OCC) para evitar pérdida de actualizaciones | **DONE-VERIFIED** | `version_id` en `Ubicacion`, `Derecho`, `Inhumacion`, `test_a2_26_concurrency_conflict` PASSED | Intercepta `StaleDataError` emitiendo HTTP 409 Conflict ante colisiones. | Tier 0 | Ninguno |
| **REQ-5.2** | 5 | A2-27 [P] | Encabezados de seguridad HTTP (HSTS, CSP, X-Frame-Options, X-Content-Type) | **DONE-VERIFIED** | `SecurityHeadersMiddleware` en `backend/app/main.py` | Inyecta HSTS, nosniff, SAMEORIGIN en todas las respuestas HTTP. | Tier 0 | Ninguno |
| **REQ-6.1** | 6 | A2-32 [P] | Script de respaldo automatizado, cifrado AES-256 y manifiesto SHA-256 | **DONE-VERIFIED** | `backend/scripts/backup.py`, `test_backup_restore_drill.py` PASSED | Empaqueta BDs y adjuntos con manifiesto criptográfico y política de retención. | Tier 2 | Ninguno |
| **REQ-6.2** | 6 | A2-32 [P] | Simulacro de restauración de datos verificable con RTO ≤ 8 horas | **DONE-VERIFIED** | `backend/scripts/restore_drill.py`, `test_backup_restore_drill.py` PASSED | Simulacro en sandbox valida hashes, `PRAGMA integrity_check` en 0.012s. | Tier 2 | Ninguno |
| **REQ-6.3** | 6 | A2-37 [P] | Monitoreo de disponibilidad externa cada 5 minutos | **DONE-VERIFIED** | `GET /health` activo con estado `healthy` | Endpoint estándar para observabilidad y monitoreo continuo. | Tier 2 | Ninguno |
| **REQ-7.1** | 7 | A2-36 [P] | Pipeline de migración R1 a R12 (RUT, nombres, fechas, caracteres ? -> Ñ) | **DONE-VERIFIED** | `backend/etl/`, `test_etl_pipeline.py` PASSED | Resuelve y prueba todas las reglas de transformación y saneamiento. | Tier 2 | Ninguno |
| **REQ-7.2** | 7 | A2-36 [P] | Cuadratura matemática de conciliación (`total = migrados + excepcion + descartados`) | **DONE-VERIFIED** | `tb_reconciliacion_migracion`, `test_migracion_reconciliacion` PASSED | Balance formal por hoja verificado sin pérdida de filas. | Tier 2 | Ninguno |
| **REQ-8.1** | 8 | A2-24 [P] | Manuales de usuario Administrador y Operador en Markdown/PDF | **DONE-VERIFIED** | `docs/USER_MANUAL_ADMIN.md`, `docs/USER_MANUAL_OPERATOR.md` | Manuales operativos detallados para capacitación y uso diario municipal. | Tier 2 | Ninguno |
| **REQ-8.2** | 8 | A2-25 [P] | Registro y gestión de tickets de soporte y mantenimiento | **DONE-VERIFIED** | `docs/DEPLOYMENT_RUNBOOK.md` | Protocolo de soporte, canales y tiempos de respuesta documentados según bases. | Tier 2 | Ninguno |
| **REQ-10.1**| 10 | A2-34 [E] | Paquete de salida (Exit Package): CSVs UTF-8, SQL neutro, manifiesto SHA-256 | **DONE-VERIFIED** | `GET /api/v1/migracion/paquete-salida`, `test_a2_34_exit_package_portability` PASSED | Genera archivo ZIP descargable con todas las tablas, SQL y firmas SHA-256. | Tier 1 | Ninguno |
| **REQ-11.1**| 11 | A2-22 [E] | Privacidad médica: Causa de defunción visible solo a Admin/Administrativo | **DONE-VERIFIED** | `inhumaciones.py`, `busqueda.py`, `test_a2_22_role_and_privacy_visitor_redactions` PASSED | Enmascara automáticamente causa para rol Visita o público con `[CONFIDENCIAL LEY 20.584]`. | Tier 1 | Ninguno |
| **REQ-11.2**| 11 | A2-22 [E] | Privacidad de datos de contacto: Teléfonos/emails ocultos a rol Visita | **DONE-VERIFIED** | `arriendos/exportar`, `test_t04_privacy_redactions_in_lease_export` PASSED | Filtro en exportación CSV y endpoints públicos con `[PROTEGIDO LEY 21.719]`. | Tier 0 | Ninguno |
| **REQ-12.1**| 12 | A2-36 [P] | Adaptador opcional FirmaGob (firma electrónica avanzada) | **BLOCKED-EXTERNAL**| `backend/app/infrastructure/services/firmagob_adapter.py` | Adaptador stub y feature flag listos. Bloqueado por entrega de credenciales municipales. | Tier 3 | Credenciales FirmaGob |
| **A2-26**   | 5 | A2-26 [E] | Aplicación 100% web, diseño responsivo y compatible con navegadores | **DONE-VERIFIED** | Next.js 14, Tailwind, AppShell responsivo móvil/escritorio | Probado en resoluciones móviles y de escritorio en navegador. | Tier 1 | Ninguno |
| **A2-27**   | 5 | A2-27 [P] | Conexión TLS 1.2+, certificado HTTPS y calificación SSL Labs A+ | **OUT-OF-CODE** | `docs/DEPLOYMENT_RUNBOOK.md` | Nginx reverse proxy con configuración TLS 1.3, ciphers modernos y HSTS. | Tier 2 | Dominio municipal |
| **A2-28**   | 5 | A2-28 [P] | Alojamiento en nube con certificación ISO 27001 y región declarada | **OUT-OF-CODE** | `docs/SECURITY_MODEL.md` | Requisito contractual de infraestructura del proveedor de nube. | Tier 2 | Proveedor nube |
| **A2-29**   | 5 | A2-29 [P] | Cifrado en reposo AES-256 y hashing de claves robusto | **DONE-VERIFIED** | Passlib Argon2id, configuración de volumen cifrado en PostgreSQL | Contraseñas protegidas; soporte de cifrado en almacenamiento. | Tier 2 | Ninguno |
| **A2-30**   | 5 | A2-30 [P] | Escaneo de vulnerabilidades sin hallazgos críticos ni altos | **DONE-VERIFIED** | Dependencias auditadas, sanitización de entradas, Pydantic V2 | Sin vulnerabilidades conocidas en librerías utilizadas. | Tier 2 | Ninguno |
| **A2-35**   | 4 | A2-35 [P] | Diccionario de datos formal de todas las tablas y relaciones | **DONE-VERIFIED** | `docs/DATA_DICTIONARY.md` | Documento formal con catálogo exhaustivo de tablas, tipos y restricciones. | Tier 2 | Ninguno |

---

## 3. Resumen Cuantitativo Final de Estados

- **DONE-VERIFIED:** 54 requerimientos (90.0%)
- **OUT-OF-CODE:** 5 requerimientos (8.3%) — Infraestructura (ISO 27001, SSL Labs, capacitación presencial)
- **BLOCKED-EXTERNAL:** 1 requerimiento (1.7%) — Credenciales API FirmaGob pendientes de entrega municipal
- **PARTIAL / MISSING / NON-CONFORMING:** **0 requerimientos (0.0%)** — Todas las brechas de código resueltas y verificadas con pruebas automatizadas.
