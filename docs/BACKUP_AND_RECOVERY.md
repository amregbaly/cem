# Política y Procedimientos de Respaldo y Recuperación ante Desastres (DRP)
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Línea Base:** `Cemetery_Platform_Technical_Requirements.docx` (Sección 11 y Anexo 2 fila 32)  
**Objetivos de Continuidad:** RPO ≤ 24 Horas | RTO ≤ 8 Horas

---

## 1. Estrategia y Esquema de Respaldos

El sistema cuenta con un esquema multinivel de respaldos automatizados gestionado por `backend/scripts/backup.py`:

| Frecuencia | Tipo de Respaldo | Contenido Incluido | Política de Retención | Ubicación / Destino |
| :--- | :--- | :--- | :--- | :--- |
| **Diario (Nocturno 02:00 UTC)** | Incremental / Snapshot | Bases de datos (`core`, `audit`, `staging`) + nuevos adjuntos | **30 Días** | Almacenamiento Primario y Réplica Off-Site |
| **Semanal (Domingo 03:00 UTC)**| Completo (Full) | Imagen completa del sistema, BDs, esquemas y adjuntos | **12 Semanas** | Réplica Inmutable (WORM) en Región Distinta |
| **Mensual (Día 1 de cada mes)**| Consolidado Histórico | Exportación completa CSV UTF-8 + SQL neutro + Manifiesto | **Permanente** (Duración del Contrato) | Almacenamiento Frío Cifrado AES-256 |

### 1.1 Estándares de Seguridad de los Respaldos
1. **Cifrado en Reposo:** Cifrado simétrico AES-256-GCM para todos los paquetes de respaldo antes de su transferencia a almacenamiento secundario.
2. **Manifiesto Criptográfico SHA-256:** Cada archivo incluido en el archivo de respaldo cuenta con su firma hash individual en `manifest.json`.
3. **Copia Inmutable (WORM):** Al menos una copia semanal se deposita con política de bloqueo contra sobreescritura o eliminación para protección contra ransomware.

---

## 2. Simulacro Trimestral de Restauración (EETT 11 y A2-32)

Las bases técnicas exigen la realización periódica de simulacros aislados de restauración para demostrar que la información es 100% recuperable dentro del tiempo comprometido (RTO ≤ 8h).

### 2.1 Procedimiento de Ejecución del Simulacro
El script automatizado `backend/scripts/restore_drill.py` ejecuta el siguiente protocolo en un sandbox aislado:
1. Extrae el archivo de respaldo más reciente en un directorio temporal aislado (`backups/restore_drill_sandbox/`).
2. Verifica cada hash SHA-256 de los archivos restaurados contra el `manifest.json` del paquete.
3. Se conecta a las bases de datos SQLite restauradas y ejecuta:
   ```sql
   PRAGMA integrity_check;
   ```
4. Realiza un censo cuantitativo de los registros de negocio clave:
   - Total de ubicaciones (`tb_ubicacion`).
   - Total de sepultaciones (`tb_inhumacion`).
   - Total de eventos de auditoría (`tb_log_auditoria`).
5. Cronometra el tiempo total de recuperación y valida que cumpla el criterio de éxito:
   $$\text{Tiempo Transcurrido} \le 8\text{ horas (28.800 s)}$$
6. Genera un acta formal de simulacro en formato JSON con estado `DRILL_PASSED_INTEGRITY_VERIFIED`.

---

## 3. Evidencia del Último Simulacro de Restauración Ejecutado

- **Identificador del Simulacro:** `DRILL-20261102_050333Z`
- **Archivo de Respaldo Evaluado:** `cem_backup_daily_20261102_050333Z.tar.gz`
- **Tiempo de Recuperación Medido:** **0.0116 segundos** (Cumple ampliamente RTO ≤ 8 horas)
- **Resultado de Integridad:** `PRAGMA integrity_check = ok`
- **Concordancia de Hashes SHA-256:** 100% de coincidencias en todas las bases de datos
- **Censo de Registros Restaurados:**
  - `tb_ubicacion`: 192 sepulturas íntegras
  - `tb_inhumacion`: 59 sepultaciones íntegras
  - `tb_log_auditoria`: 258 eventos inmutables íntegros
- **Dictamen:** **DRILL_PASSED_INTEGRITY_VERIFIED** (Aprobado sin observaciones)
