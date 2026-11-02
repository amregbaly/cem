# Manual de Usuario: Perfil Administrador Municipal
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Audiencia:** Administradores Generales y Encargados de Informática Municipal

---

## 1. Acceso a la Plataforma y Panel de Administración

### 1.1 Inicio de Sesión y Segundo Factor (MFA)
1. Ingrese a la URL institucional de la plataforma con su navegador web.
2. Digite su nombre de usuario nominativo y su contraseña de alta seguridad (mínimo 12 caracteres).
3. Si el usuario tiene habilitado 2FA/TOTP, el sistema solicitará el código de 6 dígitos generado por su aplicación de autenticación (Google Authenticator / Microsoft Authenticator).
4. Tras autenticarse, el menú lateral izquierdo desplegará las opciones operacionales y el botón de acceso exclusivo al **Panel de Administración** (`/admin`).

---

## 2. Gestión de Usuarios y Seguridad de Cuentas

### 2.1 Creación de Usuarios Nominativos
1. En el menú superior del Panel de Administración, seleccione la pestaña **Usuarios**.
2. Haga clic en el botón azul **+ Crear Usuario**.
3. Complete los campos obligatorios:
   - **Nombre de Usuario:** Cuenta institucional (ej. `m.gonzalez`).
   - **Nombre Completo y RUT:** Datos de identidad del funcionario.
   - **Correo Electrónico:** Correo municipal para notificaciones.
   - **Rol Base:** `ADMINISTRADOR`, `ADMINISTRATIVO` o `VISITANTE`.
   - **Grupo de Permisos:** Seleccione el grupo personalizado correspondiente.
   - **Contraseña:** Mínimo 12 caracteres alfanuméricos y símbolos.
4. Presione **Guardar Usuario**. La acción quedará registrada en la bitácora inmutable de auditoría.

---

## 3. Matriz Granular de Grupos y Permisos (RBAC)

La plataforma permite definir perfiles a la medida de la dotación municipal:

1. Ingrese a la pestaña **Grupos de Permisos** dentro de `/admin`.
2. Para crear un nuevo grupo, presione **+ Nuevo Grupo**.
3. Ingrese el nombre del grupo (ej. `Encargados de Sepultaciones Cachapoal`) y su descripción.
4. En la matriz de permisos, seleccione el nivel para cada módulo:
   - **Sin Acceso (NONE):** El usuario no verá el módulo ni podrá consultar sus datos.
   - **Solo Lectura (READ):** El usuario puede ver listados y expedientes, pero no crear ni editar.
   - **Lectura y Escritura (WRITE):** El usuario puede registrar, modificar y operar el módulo.
5. Presione **Guardar Grupo**. Al asignar usuarios a este grupo, sus facultades en el sistema se actualizarán de forma inmediata.

---

## 4. Configuración del Portal Ciudadano y Privacidad

1. Seleccione la pestaña **Portal Ciudadano** en el panel de administración.
2. Localice el interruptor: **Permitir acceso público a la lista de personas fallecidas**.
3. **Comportamiento:**
   - **Desactivado (Recomendado / EETT):** Los visitantes externos tienen acceso restringido únicamente al módulo de **Verificación de Certificados por QR**. Todo intento de consultar el listado general de difuntos responderá con un bloqueo formal.
   - **Activado:** La ciudadanía puede consultar el buscador general de sepulturas, pero las causas de fallecimiento y los teléfonos de los deudos permanecerán permanentemente censurados y protegidos por ley.
4. Guarde los cambios para aplicar la política al instante.

---

## 5. Gestión de Certificados y Cancelación Oficial

### 5.1 Anulación de Certificados
Cuando un certificado de sepultación o propiedad deba ser revocado por error de digitación o decreto:
1. Diríjase al módulo de **Certificados**.
2. Ubique el certificado mediante su folio oficial (ej. `CERT-INH-2026-00012`).
3. Haga clic en el botón rojo **Anular Certificado**.
4. Ingrese obligatoriamente la **Justificación Administrativa / Motivo de Anulación**.
5. Confirme la operación.
6. **Efecto Inmediato:** El estado pasará a `CANCELADO`. Al escanear el código QR del documento físico, la página pública advertirá que el documento carece de validez legal y mostrará el motivo de anulación.

---

## 6. Módulo de Reservas: Liberación de Espacios con Decreto

1. Ingrese al módulo de **Reservas**.
2. Filtre por reservas con estado `VENCIDA`.
3. Para devolver la sepultura al estado `DISPONIBLE`, el Administrador debe hacer clic en **Autorizar Liberación de Espacio**.
4. Digite el **Número de Decreto / Resolución Alcaldicia** y el **Motivo Formal**.
5. Al confirmar, la reserva pasará a `LIBERADA` y la ubicación retornará al catálogo de disponibles.

---

## 7. Inspección y Verificación Criptográfica de la Bitácora de Auditoría

1. Ingrese al módulo de **Auditoría**.
2. Filtre por rango de fechas, usuario ejecutor, módulo o dirección IP.
3. Presione el botón **Verificar Integridad de Cadena (HMAC)**.
4. El sistema recorrerá todos los bloques de la base de datos validando los hashes encadenados. Un mensaje verde confirmará que la bitácora no ha sufrido manipulación ni borrado de eventos.
