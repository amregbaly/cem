# Manual de Usuario: Perfil Operador y Administrativo
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Audiencia:** Funcionarios de Atención de Ventanilla, Giradores y Encargados de Terreno

---

## 1. Búsqueda Rápida e Instantánea (Buscador Global)

El buscador superior permite localizar personas y sepulturas en milisegundos:
1. **Búsqueda por Nombre:** Escriba desde 3 letras del nombre o apellido. La búsqueda es insensible a mayúsculas, minúsculas, tildes y diéresis (ej. `Muñoz`, `munoz` y `MUNOZ` devuelven el mismo resultado).
2. **Búsqueda por RUT:** Puede ingresar el RUT con puntos y guión (`12.345.678-5`) o como solo números (`123456785`).
3. **Búsqueda por Sepultura:** Ingrese el código de patio o pabellón y el número (ej. `PAB-A-15` o `15`).
4. **Resultados de Exhumados:** Si una persona fue trasladada, aparecerá con una insignia destacada `[EXHUMADO]` y mostrará de inmediato la ubicación actual donde descansan sus restos.
5. **Acceso al Expediente en 1 Clic:** Al seleccionar un resultado de la lista desplegable, se abrirá el cajón lateral con la ficha histórica completa.

---

## 2. Registro de Inhumaciones y Sepultaciones (EETT 3.5)

Para registrar un nuevo sepelio en el cementerio:
1. Diríjase a **Inhumaciones** en el menú lateral y presione **+ Nueva Sepultación**.
2. **Paso 1: Selección de Ubicación:**
   - Seleccione el cementerio (San Carlos o Cachapoal).
   - Elija el patio/pabellón y la sepultura. El sistema validará que el espacio cuente con capacidad disponible.
3. **Paso 2: Datos del Fallecido:**
   - **Nombres, Apellido Paterno y Materno:** Ingréselos en casillas separadas para garantizar el almacenamiento atómico.
   - **RUT:** El sistema valida automáticamente el dígito verificador bajo el algoritmo Módulo 11. No permitirá guardar RUTs erróneos en nuevos registros.
   - **Fechas:** Digite la fecha de defunción y la fecha de sepultación (la sepultación debe ser igual o posterior a la defunción).
   - **Causa de Muerte:** Causa médica certificada (protegida bajo reserva confidencial).
   - **Pase de Sepultación:** Folio del Registro Civil y archivo PDF/imagen de respaldo.
4. **Paso 3: Familiar Responsable y Orden de Ingreso:**
   - Complete nombre, RUT, teléfono y dirección del deudo responsable del trámite.
   - Adjunte el comprobante de la **Orden de Ingreso Municipal** cancelada en tesorería.
5. Presione **Registrar Inhumación**. La capacidad ocupada del espacio se incrementará automáticamente.

---

## 3. Traspasos de Dominio y Transferencias de Propiedad (EETT 3.8)

Cuando un titular cede o transfiere derechos de una sepultura a otra persona:
1. Localice la propiedad en el buscador y abra su ficha.
2. En la sección de Concesión / Dominio, presione **Transferir Dominio**.
3. Seleccione o ingrese al **Nuevo Titular** (nombre y RUT).
4. Ingrese el **Número de Resolución o Decreto Alcaldicio** y el número de **Orden de Ingreso** de los derechos de transferencia.
5. Adjunte la escritura de cesión o documento notarial digitalizado.
6. Presione **Confirmar Transferencia**.
7. **Garantía Histórica:** El nuevo titular quedará como titular vigente, y el titular anterior pasará a la lista histórica permanente. En caso de transferencias sucesivas, toda la cadena de antiguos dueños permanecerá visible en el expediente.

---

## 4. Gestión de Exhumaciones y Traslados (EETT 3.6)

1. En el menú lateral, seleccione **Exhumaciones** y presione **+ Nueva Exhumación / Traslado**.
2. Busque la sepultación de origen del difunto.
3. Indique la sepultura de destino (si los restos serán reducidos o trasladados a otro pabellón del cementerio).
4. Registre la fecha de la diligencia, resolución sanitaria/alcaldicia, nombre del solicitante y motivo.
5. Si marca **Liberar Ubicación de Origen**, la sepultura anterior restará su ocupación y quedará disponible para nueva asignación.
6. Al guardar, el difunto quedará vinculado a su nuevo espacio y el evento figurará en la cronología de ambas sepulturas.

---

## 5. Radar de Vencimientos de Arriendos y Renovaciones (EETT 3.3)

1. Ingrese al módulo **Arriendos & Vencimientos**.
2. El tablero clasifica automáticamente los arriendos en:
   - **Vencidos:** Arriendos cuyo plazo expiró sin renovación.
   - **Vencimiento Próximo (30 Días):** Casos prioritarios para notificación a deudos.
   - **Ventanas 60 y 90 Días:** Planificación de renovaciones.
3. **Para Renovar un Arriendo:**
   - Localice el arriendo en la lista y presione **Renovar Arriendo**.
   - Seleccione el nuevo período (ej. 5 años o compra perpetua).
   - Ingrese el folio de la nueva orden de ingreso y confirme. La fecha de vencimiento se extenderá automáticamente preservando el historial del contrato original.

---

## 6. Emisión Oficial de Certificados (EETT 3.10)

1. Ingrese al módulo **Certificados**.
2. Seleccione el tipo de documento a emitir:
   - *Certificado de Inhumación / Sepultación*
   - *Certificado de Concesión / Título de Propiedad Perpetua*
   - *Certificado de Arriendo y Vigencia*
3. Seleccione la persona o sepultura vinculada.
4. Presione **Emitir Certificado**.
5. El sistema asignará un folio correlativo único sin saltos (ej. `CERT-INH-2026-00015`), generará el código QR con token criptográfico de alta seguridad y calculará la huella digital SHA-256 del documento.
6. Presione **Descargar PDF** para imprimir o enviar el documento oficial con membrete municipal.
