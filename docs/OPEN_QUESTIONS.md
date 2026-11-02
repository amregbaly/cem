# ❓ OPEN QUESTIONS & UNRESOLVED ITEMS
**Plataforma de Gestión Integral de Cementerios Municipales — San Carlos y Cachapoal**  
*Fecha:* 01 de Noviembre de 2026

---

## 1. Bloqueadores Externos (Blockers)

Estos elementos dependen exclusivamente de insumos o decisiones institucionales del Municipio de San Carlos o entidades gubernamentales y no pueden ser inventados por el equipo de ingeniería:

| ID | Asunto | Descripción del Bloqueador | Impacto | Estrategia de Mitigación en Código |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | **Credenciales FirmaGob (Firma Electrónica Avanzada)** | La integración con el servicio oficial de FirmaGob (División de Gobierno Digital / SEGPRES) requiere token de servicio, clave pública y endpoint de interoperabilidad que solo se emiten a organismos públicos acreditados. | Impide la emisión de firmas con certificado gubernamental real. | Se implementa un **FirmaGob Adapter** con interfaz desacoplada y feature-flag (`FIRMAGOB_ENABLED=False`). En desarrollo, genera certificados PDF/A válidos con sello criptográfico SHA-256 local, token de verificación de 128 bits y código QR oficial verificable. |
| **BLK-02** | **Archivo Excel Histórico Real sin Enmascarar** | El repositorio cuenta con `Anexo 1_Muestra_Enmascarada_Base_Cementerio..xlsx`, el cual contiene datos de muestra con RUTs y nombres enmascarados para propósitos de licitación. La carga de datos productiva definitiva requiere el libro de trabajo Excel oficial firmado por la administración municipal. | La base de datos contiene datos de muestra sintéticos y saneados. | El pipeline ETL de migración (`backend/etl/`) está completamente construido y probado (Reglas R1–R12). Admite el archivo definitivo en cualquier momento generando bitácoras de conciliación matemática y excepciones sin pérdida de datos. |

---

## 2. No Bloqueadores (Non-Blockers / Decisiones Técnicas Seguras)

| ID | Asunto | Estado Actual / Decisión Adoptada | Solución Configurable Implementada |
| :--- | :--- | :--- | :--- |
| **Q-01** | **Subdominio Municipal y Certificado SSL/TLS** | Pendiente asignación de `cementerios.munisancarlos.cl` por la Dirección de Informática municipal. | Se parametriza mediante la variable de entorno `NEXT_PUBLIC_BASE_URL` y `MUNICIPAL_DOMAIN`. Los códigos QR apuntan dinámicamente al dominio configurado. |
| **Q-02** | **Canales de Notificación de Vencimiento de Arriendos** | En los cementerios chilenos, el contacto a deudos se realiza principalmente por correo postal, teléfono o correo electrónico. | `NotificationService` soporta canales seleccionables (`EMAIL`, `SMS`, `CARTA_POSTAL`), registrando cada intento en la bitácora inmutable de auditoría. |
| **Q-03** | **Políticas de Retención de Reservas Expiradas** | Las EETT estipulan que una sepultura reservada cuya fecha de expiración se cumpla no puede liberarse automáticamente, requiriendo confirmación expresa del Administrador. | Se implementa el modelo `tb_reserva` con estado `EXPIRADA_PENDIENTE_CONFIRMACION`. Solo un usuario con rol `ADMINISTRADOR` puede ejecutar la acción de liberación a `DISPONIBLE`. |
| **Q-04** | **Proveedor Cloud de Producción (AWS, Azure o GCP)** | La adjudicación definitiva define el proveedor de infraestructura bajo certificación ISO 27001 en región declarada. | La plataforma es 100% agnóstica mediante Docker Compose / contenedores OCI estándar, apta para despliegue en cualquier nube (AWS eu/us, GCP o Azure) o infraestructura On-Premise municipal. |
