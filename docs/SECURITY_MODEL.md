# Modelo de Seguridad y Protección de Datos
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Línea Base:** `Cemetery_Platform_Technical_Requirements.docx` (Secciones 2, 7, 11 y Anexo 2 filas 22, 23, 27–31)  
**Marco de Referencia:** OWASP ASVS Nivel 2, OWASP Top 10 (2025/2026), Ley 21.719 (Protección de Datos Personales), Ley 20.584 (Derechos y Deberes en Salud).

---

## 1. Autenticación y Gestión de Identidades (EETT 2 y A2-23)

1. **Cuentas Nominativas Obligatorias:** Prohibición absoluta de cuentas genéricas o compartidas. Todo operador cuenta con nombre, RUT, correo institucional y rol asignado.
2. **Política de Complejidad de Contraseñas:**
   - Longitud mínima de 12 caracteres.
   - Presencia obligatoria de mayúsculas, minúsculas, dígitos numéricos y caracteres especiales.
   - Cribado contra diccionarios de contraseñas vulnerables y filtradas conocidas.
3. **Algoritmos Criptográficos de Contraseñas:** Almacenamiento exclusivo mediante hashing con `Argon2id` (preferido) o `bcrypt` con factor de trabajo adecuado. Cero contraseñas en texto plano.
4. **Bloqueo Automático por Fuerza Bruta:** Cuenta temporalmente bloqueada tras 5 intentos fallidos consecutivos de autenticación.
5. **Autenticación Multifactor (MFA/2FA):** Obligatoria para roles `ADMINISTRADOR` y `ADMINISTRATIVO` mediante TOTP (RFC 6238, Google Authenticator / Microsoft Authenticator).
6. **Expiración de Sesión:** Cierre automático de sesión por inactividad tras 30 minutos sin interacción.

---

## 2. Control de Acceso Basado en Roles y Grupos (RBAC Granular)

La plataforma cuenta con 3 roles jerárquicos base combinados con una matriz de grupos personalizados (`tb_grupo`, `tb_grupo_permiso`):

| Módulo / Funcionalidad | ADMINISTRADOR | ADMINISTRATIVO | VISITANTE / CIUDADANO |
| :--- | :---: | :---: | :---: |
| **Gestión de Cementerios y Ubicaciones** | Lectura / Escritura | Lectura / Escritura | Lectura (Ubicaciones Públicas) |
| **Inhumaciones / Sepultaciones** | Lectura / Escritura | Lectura / Escritura | Oculto / Requiere Habilitación Admin |
| **Causa de Defunción (Ley 20.584)** | **Visible** | **Visible** | **ENMASCARADO [CONFIDENCIAL]** |
| **Datos de Contacto (Ley 21.719)** | **Visible** | **Visible** | **ENMASCARADO [PROTEGIDO]** |
| **Exhumaciones y Traslados** | Lectura / Escritura | Lectura / Escritura | Solo consulta estado `EXHUMADO` |
| **Arriendos y Vencimientos** | Lectura / Escritura | Lectura / Escritura | Denegado (403) |
| **Emisión de Certificados** | Emisión / Anulación | Emisión | Solo Verificación Pública |
| **Verificación QR de Certificados** | Acceso Completo | Acceso Completo | Solo 5 Metadatos y Hash SHA-256 |
| **Administración de Usuarios y Roles** | Total | Denegado (403) | Denegado (401/403) |
| **Bitácora de Auditoría** | Lectura / Verificación | Denegado (403) | Denegado (401/403) |

---

## 3. Protección de Datos Personales y Médicos (Leyes 21.719 y 20.584)

1. **Ley 20.584 (Diagnóstico y Causa de Muerte):**
   - El diagnóstico médico que originó la defunción se cataloga como dato sensible.
   - En todo endpoint público o perfil de Visitante, el valor se reemplaza estrictamente por `[CONFIDENCIAL LEY 20.584]`.
2. **Ley 21.719 (Datos Personales de Contacto):**
   - Teléfonos, correos electrónicos, direcciones y RUTs de titulares, compradores y familiares responsables son redactados server-side con la marca `[PROTEGIDO LEY 21.719]`.
   - Se prohíbe la descarga de planillas masivas que contengan teléfonos de titulares por usuarios no pertenecientes al personal de planta municipal.
3. **Verificación de Certificados Libre de Fugas:**
   - La página pública a la que redirige el código QR (`/verify/certificate/[token]`) expone únicamente: Tipo de Certificado, Folio Oficial, Fecha de Emisión, Estado (`VIGENTE`/`CANCELADO`) y Hash SHA-256 del PDF. No expone diagnósticos médicos, causas de muerte ni teléfonos de solicitantes.

---

## 4. Seguridad de Archivos y Prevención de Cargas Maliciosas

1. **Inspección de Magic-Bytes Binarios:** El validador en `backend/app/api/v1/endpoints/terreno.py` no confía en la extensión del archivo ni en la cabecera `Content-Type` enviada por el cliente. Inspecciona directamente los primeros bytes en memoria:
   - `%PDF-` para documentos PDF.
   - `\x89PNG\r\n\x1a\n` para imágenes PNG.
   - `\xff\xd8\xff` para imágenes JPEG.
2. **Rechazo de Archivos Disfrazados:** Binarios ejecutables (`.exe`, `.sh`, `.elf`) renombrados como `.pdf` son inmediatamente rechazados con código HTTP 400.
3. **Límite de Tamaño Estricto:** Máximo 10 MB por archivo adjunto.
4. **Almacenamiento Privado y Descarga Protegida:** Los archivos se almacenan en disco fuera de la raíz web pública (`uploads/`). La descarga se realiza exclusivamente a través del endpoint controlado `GET /api/v1/terreno/adjuntos/{filename}`, el cual exige sesión autenticada con rol autorizado (401/403 para llamadas públicas).

---

## 5. Inmutabilidad y Auditoría Criptográfica (EETT 3.14 y A2-17)

1. **Bloqueo a Nivel de Motor de Base de Datos:**
   - Triggers `trg_prevent_audit_update` y `trg_prevent_audit_delete` impiden físicamente modificar o eliminar filas en `tb_log_auditoria`.
2. **Encadenamiento Criptográfico HMAC-SHA256:**
   - Cada evento incorpora el hash del evento anterior (`cadena_hash_anterior`) y genera un hash propio (`hash_registro`) incorporando la estampa temporal, usuario, IP, módulo y deltas de cambio.
   - La función `verify_chain_integrity()` evalúa la secuencia completa de la bitácora e identifica inmediatamente el índice de cualquier registro adulterado.

---

## 6. Cabeceras de Seguridad y Protección de Red

El middleware de seguridad en `backend/app/main.py` inyecta en cada respuesta HTTP:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS)
- `X-Content-Type-Options: nosniff` (Previene MIME-confusion attacks)
- `X-Frame-Options: SAMEORIGIN` (Mitigación de Clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`
