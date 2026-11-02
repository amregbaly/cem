# Limitaciones Conocidas y Dependencias Externas (Known Limitations)
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Línea Base:** `Cemetery_Platform_Technical_Requirements.docx` (Secciones 1, 3, 10, 15)

---

## 1. Declaración de Dependencias Externas Bloqueadas (BLOCKED-EXTERNAL)

De acuerdo con las reglas de ingeniería de este proyecto, **ningún componente que dependa de insumos exclusivos de la Municipalidad de San Carlos ha sido falsificado o simulado como completado**. Todos los adaptadores, contratos de interfaz y pipelines están construidos y probados en código, a la espera de la entrega oficial de los siguientes elementos:

### 1.1 Libro Excel Histórico Real (`EETT_Cementerio_2026_2.xlsx`)
- **Estado:** `BLOCKED-EXTERNAL`
- **Detalle:** El documento de especificaciones técnicas contiene cifras de planificación estimadas (18 hojas, 86.499 filas, 18.418 sepultaciones y 21.716 transacciones de propiedad). Sin embargo, el archivo Excel físico de producción no ha sido suministrado por la Municipalidad.
- **Acción Realizada:** Se implementó y verificó el motor completo de ETL con las 12 reglas de negocio (R1 a R12), pruebas con datos sintéticos, cuadratura contable y generación de libros de excepciones. Una vez entregado el archivo real, se ejecutará el procedimiento descrito en `docs/MIGRATION_RUNBOOK.md`.

---

### 1.2 Credenciales del Servicio de Firma Electrónica Avanzada FirmaGob
- **Estado:** `BLOCKED-EXTERNAL`
- **Detalle:** Para la firma digital avanzada con validez legal del Estado de Chile (Ley 19.799), se requiere un convenio activo entre la Municipalidad de San Carlos y la Secretaría de Gobierno Digital (SEGPRES / Ministerio de Hacienda), junto con el `API_TOKEN` institucional y la URL del endpoint gubernamental.
- **Acción Realizada:** Se implementó el adaptador `backend/app/infrastructure/services/firmagob_adapter.py` y el feature flag `FIRMAGOB_ENABLED`. Mientras no se disponga de las credenciales, los certificados se emiten con código QR criptográfico, token de alta entropía (≥128 bits) y hash SHA-256 verificable, sin simular firmas falsas.

---

### 1.3 Asignación de Dominio Municipal y Zona DNS
- **Estado:** `BLOCKED-EXTERNAL`
- **Detalle:** Para la emisión del certificado SSL/TLS con calificación A+ en SSL Labs y la resolución de los códigos QR bajo el dominio institucional (ej. `https://cementerio.sancarlos.cl/verify/certificate/...`), la unidad de Informática Municipal debe crear los registros DNS tipo `A` o `CNAME`.
- **Acción Realizada:** El archivo de configuración Nginx (`docs/DEPLOYMENT_RUNBOOK.md`) y las cabeceras HSTS/CSP están completamente definidos y probados a nivel de proxy reverso.

---

### 1.4 Aprovisionamiento de la Cuenta de Nube Corporativa
- **Estado:** `OUT-OF-CODE`
- **Detalle:** La suscripción o cuenta en el proveedor de nube certificado (AWS, Google Cloud o Microsoft Azure) en la región Chile/Santiago (o centro de datos municipal) debe ser formalmente provista por la municipalidad tras la adjudicación.
- **Acción Realizada:** Todos los scripts de empaquetado, servicios systemd, respaldo automatizado y pruebas de carga están configurados para despliegue directo e inmediato.

---

## 2. Resumen de Fronteras de Confianza

| Límite | Frontera de Confianza | Salvaguarda Implementada en la Plataforma |
| :--- | :--- | :--- |
| **Integridad de Base de Datos** | DBA o Servidor Físico | Triggers inmutables en base de datos; cualquier manipulación de la bitácora rompe la cadena HMAC y es detectada por la función de verificación. |
| **Almacenamiento de Adjuntos** | Sistema de Archivos | Descarga autorizada exclusiva mediante endpoint autenticado; ninguna URL de archivo es accesible públicamente sin token de sesión. |
| **Acceso Ciudadano / Visitantes** | Portal Público | Restricción estricta bajo Leyes 21.719 y 20.584: causas de defunción y datos de contacto de deudos permanecen censurados en todas las respuestas de API. |
