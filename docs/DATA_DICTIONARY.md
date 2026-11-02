# Diccionario de Datos del Sistema (Data Dictionary)
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Estándar:** ANSI SQL / PostgreSQL 16 & SQLite Multi-Database  
**Esquemas:** `core`, `audit`, `migracion`

---

## 1. Esquema `core` (Entidades Operacionales)

### 1.1 `core.tb_cementerio`
Almacena los cementerios municipales administrados de forma independiente por el sistema.

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Identificador único del cementerio. |
| `nombre` | VARCHAR(100) | NO | NOT NULL | Nombre oficial (ej. "Cementerio Municipal de San Carlos"). |
| `comuna` | VARCHAR(50) | NO | DEFAULT 'San Carlos' | Comuna administrativa. |
| `direccion` | VARCHAR(200) | SÍ | NULL | Dirección física o georreferencia de acceso. |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Fecha de creación del registro. |
| `updated_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Fecha de última actualización. |

---

### 1.2 `core.tb_ubicacion`
Catálogo de espacios y sepulturas físicas. El número es único únicamente dentro del ámbito: `cementerio_id` + `sector_codigo` + `fila` + `tipo_ubicacion`.

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Identificador único de la sepultura. |
| `cementerio_id` | INTEGER | NO | FK -> `core.tb_cementerio.id` | Cementerio al que pertenece el espacio. |
| `tipo_ubicacion`| VARCHAR(20) | NO | NOT NULL | Tipo: `PAT` (Patio), `PAB` (Pabellón), `BOV` (Bóveda), `MAU` (Mausoleo), `SP4` (Sepultura 4). |
| `sector_codigo` | VARCHAR(50) | NO | NOT NULL | Código de sector o patio (ej. `PAT-01`, `PAB-A`). |
| `fila` | VARCHAR(20) | NO | NOT NULL | Fila o nivel dentro del pabellón/patio. |
| `numero` | VARCHAR(20) | NO | NOT NULL | Número de sepultura o nicho (ej. "15"). |
| `capacidad_total`| INTEGER | NO | DEFAULT 1 | Capacidad máxima de ocupantes (cuerpos / restos). |
| `capacidad_ocupada`| INTEGER | NO | DEFAULT 0 | Número de ocupantes actualmente sepultados. |
| `estado` | VARCHAR(20) | NO | DEFAULT 'DISPONIBLE'| Estado: `DISPONIBLE`, `OCUPADO`, `RESERVADO`, `BLOQUEADO`. |
| `activo` | BOOLEAN | NO | DEFAULT TRUE | Indicador de habilitación lógica (deshabilitar sin borrar historial). |
| `motivo_deshabilitacion`| TEXT | SÍ | NULL | Justificación alcaldicia obligatoria si `activo=FALSE`. |
| `version_id` | INTEGER | NO | DEFAULT 1 | Número de versión para Control de Concurrencia Optimista (OCC). |
| `observaciones` | TEXT | SÍ | NULL | Notas operacionales o de infraestructura. |

---

### 1.3 `core.tb_persona`
Registro unificado de personas naturales (fallecidos, titulares, solicitantes, compradores y responsables).

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Identificador único de la persona. |
| `rut` | VARCHAR(12) | SÍ | NULL | RUT formal chileno normalizado (`12345678-K`). |
| `rut_cuerpo` | INTEGER | SÍ | NULL | Cuerpo numérico del RUT sin dígito verificador. |
| `rut_dv` | VARCHAR(1) | SÍ | NULL | Dígito verificador ('0'-'9' o 'K'). |
| `rut_validado` | BOOLEAN | NO | DEFAULT FALSE | `TRUE` si cumple algoritmo Módulo 11; `FALSE` en registros migrados inválidos. |
| `nombres` | VARCHAR(100) | SÍ | NULL | Nombres de pila atómicos. |
| `apellido_paterno`| VARCHAR(100) | SÍ | NULL | Primer apellido atómico. |
| `apellido_materno`| VARCHAR(100) | SÍ | NULL | Segundo apellido atómico. |
| `nombre_completo`| VARCHAR(250) | NO | NOT NULL | Nombre consolidado canónico indexado para búsquedas. |
| `telefono` | VARCHAR(50) | SÍ | NULL | Teléfono de contacto (protegido por Ley 21.719). |
| `direccion` | VARCHAR(250) | SÍ | NULL | Dirección domiciliaria (protegida por Ley 21.719). |
| `es_nn` | BOOLEAN | NO | DEFAULT FALSE | `TRUE` si la persona no cuenta con identificación formal (NN). |
| `origen_migracion`| BOOLEAN | NO | DEFAULT FALSE | `TRUE` si el registro proviene de la carga masiva histórica. |

---

### 1.4 `core.tb_derecho`
Contratos de concesión de propiedad, compras perpetuas y arriendos temporales.

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Folio interno del derecho. |
| `ubicacion_id` | INTEGER | NO | FK -> `core.tb_ubicacion.id` | Sepultura o nicho sobre el cual recae el derecho. |
| `titular_persona_id`| INTEGER| NO | FK -> `core.tb_persona.id` | Titular actual con dominio o arriendo vigente. |
| `tipo_derecho` | VARCHAR(20) | NO | NOT NULL | `ARRIENDO` o `PERPETUO`. |
| `periodo_arriendo`| VARCHAR(20) | NO | NOT NULL | `2_MESES`, `3_ANOS`, `5_ANOS`, `20_ANOS`, `50_ANOS`, `PERPETUO`. |
| `fecha_inicio` | DATE | NO | NOT NULL | Fecha de formalización o inicio del contrato. |
| `fecha_vencimiento`| DATE | SÍ | NULL | Fecha de vencimiento (nulo en compras perpetuas). |
| `monto_pagado` | NUMERIC(12,2)| NO| DEFAULT 0.00 | Monto cancelado en tesorería municipal. |
| `folio_recibo` | VARCHAR(50) | SÍ | NULL | Número de orden de ingreso municipal o boleta. |
| `estado` | VARCHAR(20) | NO | DEFAULT 'VIGENTE' | `VIGENTE`, `VENCIDO`, `TRANSFERIDO`, `ANULADO`. |
| `version_id` | INTEGER | NO | DEFAULT 1 | Versión para Control de Concurrencia Optimista (OCC). |
| `observaciones` | TEXT | SÍ | NULL | Observaciones y cláusulas específicas. |

---

### 1.5 `core.tb_transferencia_derecho`
Cadena histórica inmutable de traspasos de dominio (EETT 3.8 y A2-16).

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Folio del traspaso. |
| `derecho_id` | INTEGER | NO | FK -> `core.tb_derecho.id` | Derecho transferido. |
| `titular_anterior_id`| INTEGER| NO | FK -> `core.tb_persona.id` | Persona que cede o transfiere el dominio. |
| `titular_nuevo_id` | INTEGER | NO | FK -> `core.tb_persona.id` | Persona que adquiere el dominio. |
| `fecha_transferencia`| DATE | NO | NOT NULL | Fecha oficial de la cesión o traspaso. |
| `numero_resolucion` | VARCHAR(100)| SÍ | NULL | Decreto alcaldicio o resolución que autoriza el traspaso. |
| `orden_ingreso` | VARCHAR(100)| SÍ | NULL | Número de orden de ingreso de derechos de traspaso. |
| `documento_respaldo_url`| VARCHAR(255)| SÍ | NULL | Enlace al archivo escaneado de respaldo (notarial/decreto). |
| `motivo` | TEXT | SÍ | NULL | Motivo (cesión notarial, sucesión hereditaria, etc.). |
| `usuario_registro_id` | INTEGER | NO | FK -> `core.tb_usuario.id` | Operador municipal que registró la transferencia. |

---

### 1.6 `core.tb_inhumacion`
Registro legal de sepultaciones / inhumaciones (EETT 3.5 y A2-04).

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Folio interno de sepultación. |
| `ubicacion_id` | INTEGER | NO | FK -> `core.tb_ubicacion.id` | Espacio físico donde descansa el difunto. |
| `fallecido_persona_id`| INTEGER| NO | FK -> `core.tb_persona.id` | Persona fallecida. |
| `numero_ingreso` | VARCHAR(50) | NO | NOT NULL | Número de orden de ingreso o folio de libro de sepultaciones. |
| `fecha_defuncion`| DATE | SÍ | NULL | Fecha de muerte certificada. |
| `fecha_sepultacion`| DATE | NO | NOT NULL | Fecha de inhumación en cementerio (debe ser >= defunción). |
| `causa_fallecimiento`| VARCHAR(250)| SÍ| NULL | Diagnóstico médico (estrictamente confidencial, Ley 20.584). |
| `pase_sepultacion_folio`| VARCHAR(50)| SÍ| NULL | Folio de licencia médica o pase del Registro Civil. |
| `pase_sepultacion_doc_url`| VARCHAR(255)| SÍ| NULL | URL del documento digital escaneado del pase. |
| `responsable_nombre`| VARCHAR(200)| SÍ | NULL | Nombre completo del familiar o solicitante responsable. |
| `responsable_rut` | VARCHAR(20) | SÍ | NULL | RUT del responsable (normalizado con Módulo 11). |
| `responsable_telefono`| VARCHAR(50)| SÍ | NULL | Teléfono del responsable (protegido Ley 21.719). |
| `responsable_direccion`| VARCHAR(250)| SÍ| NULL | Dirección domiciliaria del responsable. |
| `orden_ingreso_doc_url`| VARCHAR(255)| SÍ| NULL | Documento adjunto de la orden de ingreso municipal. |
| `reduccion` | BOOLEAN | NO | DEFAULT FALSE | `TRUE` si se trata de reducción de restos óseos. |
| `version_id` | INTEGER | NO | DEFAULT 1 | Versión para Control de Concurrencia Optimista (OCC). |

---

### 1.7 `core.tb_exhumacion`
Registro y trazabilidad de exhumaciones, traslados y reducciones (EETT 3.6 y A2-08).

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Folio interno de exhumación. |
| `inhumacion_id` | INTEGER | NO | FK -> `core.tb_inhumacion.id` | Inhumación original del difunto exhumado. |
| `ubicacion_origen_id`| INTEGER | NO | FK -> `core.tb_ubicacion.id` | Ubicación desde donde se extraen los restos. |
| `ubicacion_destino_id`| INTEGER| SÍ | FK -> `core.tb_ubicacion.id` | Nueva ubicación (nulo si es traslado fuera del cementerio). |
| `fecha_exhumacion`| DATE | NO | NOT NULL | Fecha efectiva de la exhumación. |
| `resolucion_numero`| VARCHAR(100)| SÍ| NULL | Resolución o autorización sanitaria/municipal. |
| `solicitante_nombre`| VARCHAR(200)| SÍ| NULL | Nombre de quien solicita la exhumación. |
| `solicitante_rut` | VARCHAR(20) | SÍ | NULL | RUT del solicitante. |
| `motivo` | TEXT | SÍ | NULL | Causal (traslado a nicho perpetuo, orden judicial, etc.). |
| `libera_ubicacion_origen`| BOOLEAN| NO | DEFAULT TRUE | `TRUE` si la tumba origen queda vacía para reutilización. |

---

### 1.8 `core.tb_reserva`
Gestión de reservas de espacios disponibles y confirmación alcaldicia (EETT 3.11 y A2-13).

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Folio de reserva. |
| `ubicacion_id` | INTEGER | NO | FK -> `core.tb_ubicacion.id` | Espacio reservado. |
| `solicitante_nombre`| VARCHAR(200)| NO | NOT NULL | Nombre de la persona que reserva. |
| `solicitante_rut` | VARCHAR(20) | SÍ | NULL | RUT del solicitante. |
| `solicitante_telefono`| VARCHAR(50)| SÍ | NULL | Teléfono del solicitante. |
| `fecha_reserva` | DATE | NO | DEFAULT CURRENT_DATE | Fecha de constitución de la reserva. |
| `fecha_vencimiento`| DATE | NO | NOT NULL | Fecha límite para formalizar adquisición o arriendo. |
| `estado` | VARCHAR(30) | NO | DEFAULT 'VIGENTE' | `VIGENTE`, `VENCIDA`, `LIBERADA`, `CONVERTIDA`. |
| `documento_respaldo_url`| VARCHAR(255)| SÍ | NULL | Solicitud formal de reserva escaneada. |
| `resolucion_liberacion`| VARCHAR(100)| SÍ | NULL | Decreto alcaldicio que autoriza la liberación del espacio. |
| `motivo_liberacion`| TEXT | SÍ | NULL | Justificación formal de liberación tras vencimiento. |
| `fecha_liberacion`| DATE | SÍ | NULL | Fecha en que el Administrador liberó el espacio. |
| `usuario_liberacion_id`| INTEGER| SÍ | FK -> `core.tb_usuario.id` | Administrador que autorizó la liberación. |

---

### 1.9 `core.tb_certificado`
Certificados municipales emitidos con folio correlativo y hash SHA-256 (EETT 3.10, A2-11 y A2-12).

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Identificador interno. |
| `folio` | VARCHAR(50) | NO | UNIQUE | Folio gapless: `CERT-{TIPO}-{AÑO}-{SEQ}`. |
| `token_verificacion`| VARCHAR(64)| NO | UNIQUE | Token criptográfico aleatorio (≥128 bits de entropía). |
| `tipo_certificado`| VARCHAR(50) | NO | NOT NULL | `INHUMACION`, `SEPULTACION`, `PROPIEDAD`, `ARRIENDO`. |
| `fecha_emision` | DATE | NO | NOT NULL | Fecha de generación oficial del certificado. |
| `estado` | VARCHAR(20) | NO | DEFAULT 'VIGENTE' | `VIGENTE`, `CANCELADO`. |
| `sha256_hash` | VARCHAR(64) | NO | NOT NULL | Hash SHA-256 inmutable de los bytes del PDF emitido. |
| `pdf_bytes` | BLOB | SÍ | NULL | Bytes binarios exactos del documento PDF/A almacenado. |
| `motivo_cancelacion`| TEXT | SÍ | NULL | Motivo administrativo obligatorio en caso de anulación. |
| `fecha_cancelacion`| TIMESTAMP | SÍ | NULL | Fecha y hora en que se ejecutó la anulación. |
| `usuario_emisor_id`| INTEGER | NO | FK -> `core.tb_usuario.id` | Funcionario municipal que emitió el documento. |

---

## 2. Esquema `audit` (Bitácora de Integridad Criptográfica)

### 2.1 `audit.tb_log_auditoria`
Bitácora inmutable de eventos del sistema (EETT 3.14 y A2-17). Protegida por triggers en base de datos.

| Columna | Tipo de Dato | Nulo | Clave / Restricción | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | PK, Autoincrement | Secuencia monótona del evento. |
| `timestamp` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Hora oficial continental de Chile (`America/Santiago`). |
| `modulo` | VARCHAR(50) | NO | NOT NULL | Módulo afectado (`INHUMACIONES`, `DERECHOS`, `RESERVAS`). |
| `accion` | VARCHAR(50) | NO | NOT NULL | Operación (`CREAR`, `MODIFICAR`, `ANULAR`, `TRASPASO`). |
| `usuario_id` | INTEGER | SÍ | NULL | ID del usuario ejecutor (nulo si es evento de sistema). |
| `username` | VARCHAR(50) | SÍ | NULL | Cuenta nominativa del funcionario. |
| `user_rut` | VARCHAR(20) | SÍ | NULL | RUT del funcionario ejecutor. |
| `user_role` | VARCHAR(50) | SÍ | NULL | Rol del actor (`ADMINISTRADOR`, `ADMINISTRATIVO`). |
| `ip_address` | VARCHAR(45) | SÍ | NULL | Dirección IP de origen del cliente HTTP. |
| `entidad` | VARCHAR(100)| NO | NOT NULL | Tabla o entidad de negocio afectada (ej. `core.tb_derecho`). |
| `registro_id` | VARCHAR(100)| SÍ | NULL | Identificador del registro mutado. |
| `payload_previo`| JSON / TEXT | SÍ | NULL | Estado de los campos antes de la mutación. |
| `payload_posterior`| JSON / TEXT| SÍ | NULL | Estado de los campos después de la mutación. |
| `resultado` | VARCHAR(20) | NO | DEFAULT 'EXITOSO' | `EXITOSO` o `FALLIDO`. |
| `cadena_hash_anterior`| VARCHAR(64)| NO | NOT NULL | Hash SHA-256 del registro de auditoría inmediatamente anterior. |
| `hash_registro` | VARCHAR(64) | NO | NOT NULL | Hash HMAC-SHA256 del evento actual (garantía anti-manipulación). |
