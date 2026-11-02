# Manual Operativo del Pipeline de Migración (ETL)
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Línea Base:** `Cemetery_Platform_Technical_Requirements.docx` (Secciones 7, 10 y Reglas R1–R12)

---

## 1. Principios Fundamentales de la Migración

1. **Cero Invención de Datos:** Si un registro histórico carece de fecha o RUT, se preserva el dato crudo original (`raw_value`) y se cataloga con su marcador de excepción.
2. **Cero Fusión Automática (No Auto-Merge):** Dos registros con similitud de nombre o ubicación jamás se combinan sin visto bueno formal municipal.
3. **Preservación de Trazabilidad de Origen:** Cada fila migrada almacena el archivo fuente, nombre de hoja, número de fila de Excel, lote de migración y marca de tiempo.
4. **Cuadratura Matemática Estricta:** Para cada una de las hojas procesadas, se debe cumplir la ecuación de balance:
   $$\text{Total Filas Fuente} = \text{Filas Migradas} + \text{Excepciones} + \text{Exclusiones Aprobadas}$$
5. **Modo Dry-Run Obligatorio:** Toda ejecución previa a la carga definitiva debe ejecutarse en modo simulado para generar el libro de excepciones.

---

## 2. Catálogo de Reglas de Transformación (R1 a R12)

| Regla | Ámbito | Descripción Técnica | Implementación en Código |
| :--- | :--- | :--- | :--- |
| **R1** | Normalización de RUT | Limpieza de puntos y espacios; validación de dígito verificador mediante algoritmo Módulo 11 chileno. Si el RUT es inválido, se importa con flag `rut_validado = False` y se marca como `RUT no validado`. | `backend/etl/rut_validator.py` (`validate_and_format_rut`) |
| **R2** | Partición Atómica de Nombres | Separación del nombre completo en `nombres`, `apellido_paterno` y `apellido_materno`. Reconocimiento de partículas y apellidos compuestos chilenos (`DE LA`, `DEL`, `SAN`, `VON`). | `backend/etl/name_parser.py` (`parse_chilean_name`) |
| **R3** | Reparación de Caracteres Corruptos | Sustitución de signos de interrogación y caracteres corruptos (`?`) por `Ñ`, `ñ` o vocales acentuadas según diccionario fonético de apellidos chilenos (ej. `MU?OZ` -> `MUÑOZ`, `IB?EZ` -> `IBAÑEZ`). | `backend/etl/char_repair.py` (`repair_chilean_text`) |
| **R4** | Fechas y Seriales Excel | Conversión de enteros de fecha serial de Excel (ej. `44197`) y cadenas en formatos `DD/MM/AAAA`, `AAAA-MM-DD`. Manejo de fechas centinela (`01/01/1901` catalogada como `FECHA_NO_REGISTRADA`). | `backend/etl/date_parser.py` (`parse_flexible_date`) |
| **R5** | Aislamiento por Cementerio | Los registros de San Carlos y Cachapoal se cargan con su correspondiente `cementerio_id`. El número de sepultura no es global: se vincula a su patio, fila y pabellón. | `backend/etl/pipeline.py` (`resolve_location`) |
| **R6** | Manejo de Exhumaciones | La hoja `tmp_exhumaciones` se concilia con `EXHUMACIONES`. Solo se importan filas exclusivas `exhu_lib` tras aprobación municipal; los restos conservan su estado `EXHUMADO` y apuntan a la tumba de destino. | `backend/etl/pipeline.py` (`process_exhumations`) |
| **R7** | Exclusión de Hojas Auxiliares | Las hojas `BUSQUEDAS` y `Esquema` no se importan como registros operacionales; se clasifican como exclusiones aprobadas de diseño. | `backend/etl/pipeline.py` (`SKIP_SHEETS`) |
| **R8** | Preservación de Órdenes de Ingreso | Toda orden de ingreso histórica (`ORDEN`, `FOLIO`, `BOLETA`) se asigna al campo `orden_ingreso` o `numero_ingreso` de la sepultación o derecho. | `backend/etl/pipeline.py` (`extract_order_refs`) |
| **R9** | Generación de Excepciones | Cada fila que viole restricciones o presente ambigüedades insalvables se escribe en `tb_excepcion_migracion` para resolución manual de la municipalidad. | `backend/app/domain/models/migration.py` |
| **R10**| Idempotencia y Reanudación | Las cargas se identifican por `batch_id`. Una re-ejecución sobre el mismo lote actualiza o reanuda sin generar duplicados. | `backend/etl/pipeline.py` (`run_migration_batch`) |
| **R11**| Verificación de Muestra (300 Casos) | Generación automática de un reporte de muestreo de 300 registros cotejados fila a fila con el archivo Excel original. | `backend/scripts/generate_sample_report.py` |
| **R12**| Cuadratura Contable Final | Inserción en `tb_reconciliacion_migracion` del total de filas, éxito, excepciones y discrepancias por cada hoja. | `backend/app/domain/models/migration.py` |

---

## 3. Procedimiento de Ejecución Paso a Paso

### Paso 1: Preparación del Entorno y Copia de Seguridad
Antes de ejecutar cualquier proceso de migración:
```bash
cd /home/amr/dev/cem2/backend
# 1. Crear respaldo previo
.venv/bin/python3 scripts/backup.py
# 2. Depositar el libro oficial entregado por el Municipio en:
# /home/amr/dev/cem2/backend/data/EETT_Cementerio_2026_2.xlsx
```

### Paso 2: Ejecución en Modo Simulado (Dry-Run)
Ejecutar el pipeline con la bandera `--dry-run` para validar el 100% de las hojas sin alterar las tablas de producción:
```bash
.venv/bin/python3 etl/pipeline.py --file data/EETT_Cementerio_2026_2.xlsx --dry-run
```
El pipeline generará:
- `data/migration_dry_run_report.json`: Estadísticas globales de filas analizadas.
- `data/migration_exceptions.xlsx`: Libro de excepciones con hoja, fila, regla infringida y valor crudo para revisión municipal.

### Paso 3: Aprobación Municipal y Carga Definitiva
Una vez validadas las excepciones con la Dirección de Cementerios:
```bash
.venv/bin/python3 etl/pipeline.py --file data/EETT_Cementerio_2026_2.xlsx --commit
```

### Paso 4: Generación del Reporte de Cuadratura y Muestreo
Verificar la consistencia con las pruebas automatizadas del sistema:
```bash
.venv/bin/python3 -m pytest tests/test_etl_pipeline.py -v
```
Acceder al endpoint de conciliación municipal para auditoría en tiempo real:
`GET /api/v1/migracion/reconciliacion`
