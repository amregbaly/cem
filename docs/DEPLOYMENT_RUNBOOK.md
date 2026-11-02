# Manual de Despliegue, Configuración y Operación (Deployment Runbook)
## Plataforma de Gestión de Cementerios Municipales (San Carlos y Cachapoal)

**Versión:** 2.0.0  
**Fecha:** 02 de Noviembre de 2026  
**Línea Base:** `Cemetery_Platform_Technical_Requirements.docx` (Secciones 5, 8, 11)

---

## 1. Requisitos del Sistema

### 1.1 Entorno del Servidor
- **Sistema Operativo:** Ubuntu Server 22.04 LTS o 24.04 LTS (x86_64).
- **CPU:** Mínimo 2 vCPUs (Recomendado 4 vCPUs para alta concurrencia).
- **Memoria RAM:** Mínimo 4 GB RAM (Recomendado 8 GB RAM).
- **Almacenamiento:** Mínimo 50 GB SSD (NVMe recomendado) con soporte de volumen cifrado LUKS / AES-256.

### 1.2 Dependencias de Software
- Python 3.12+ con `venv` y `pip`.
- Node.js 18.x o 20.x LTS con `npm`.
- Nginx 1.22+ con soporte HTTP/2 o HTTP/3 y TLS 1.3.
- Certificado SSL/TLS válido (Let's Encrypt o certificado municipal institucional).

---

## 2. Guía de Instalación y Despliegue Paso a Paso

### Paso 1: Clonar el Repositorio y Configurar Rama
```bash
git clone https://github.com/municipio/cem2.git /opt/cemetery-platform
cd /opt/cemetery-platform
git checkout audit-and-complete
```

### Paso 2: Configuración del Backend (FastAPI / Python 3.12)
```bash
cd /opt/cemetery-platform/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Inicializar bases de datos, esquemas y triggers de inmutabilidad
python scripts/init_db.py
```

### Paso 3: Configuración del Frontend (Next.js 14 / React)
```bash
cd /opt/cemetery-platform/frontend
npm install
npm run build
```

---

## 3. Configuración de Servicios del Sistema (Systemd)

### 3.1 Servicio Backend (`/etc/systemd/system/cemetery-backend.service`)
```ini
[Unit]
Description=Plataforma Cementerios Backend (FastAPI)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/cemetery-platform/backend
Environment="PATH=/opt/cemetery-platform/backend/.venv/bin"
Environment="APP_ENV=production"
Environment="SECRET_KEY=clave_secreta_de_produccion_min_64_caracteres"
ExecStart=/opt/cemetery-platform/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 3.2 Servicio Frontend (`/etc/systemd/system/cemetery-frontend.service`)
```ini
[Unit]
Description=Plataforma Cementerios Frontend (Next.js)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/cemetery-platform/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Habilitar e iniciar ambos servicios:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cemetery-backend cemetery-frontend
sudo systemctl start cemetery-backend cemetery-frontend
```

---

## 4. Configuración del Proxy Reverso Nginx y Certificado TLS

Configurar `/etc/nginx/sites-available/cementerio.sancarlos.cl`:
```nginx
server {
    listen 80;
    server_name cementerio.sancarlos.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cementerio.sancarlos.cl;

    ssl_certificate /etc/letsencrypt/live/cementerio.sancarlos.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cementerio.sancarlos.cl/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # Cabeceras de Seguridad Obligatorias
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    client_max_body_size 12M;

    # Enrutamiento Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Enrutamiento Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Protocolo de Soporte y Niveles de Servicio (SLA EETT 8)

| Nivel de Severidad | Criterio de Clasificación | Tiempo de Respuesta Inicial | Tiempo de Mitigación / Solución |
| :--- | :--- | :--- | :--- |
| **S1 — Crítico** | Caída total de la plataforma o imposibilidad de emitir órdenes y sepultaciones | **≤ 1 Hora** | **≤ 4 Horas** |
| **S2 — Alto** | Degradación severa de un módulo sin detención total del servicio | **≤ 2 Horas** | **≤ 8 Horas** |
| **S3 — Medio** | Errores menores o fallas operacionales con alternativa de trabajo | **≤ 4 Horas** | **≤ 24 Horas** |
| **S4 — Bajo** | Solicitudes de consulta técnica, ajustes estéticos o dudas operativas | **≤ 8 Horas** | **≤ 48 Horas** |

- **Canales Oficiales:** Portal de tickets web integrado y correo de mesa de ayuda municipal.
- **Monitoreo Continuo:** Sondeo automatizado cada 5 minutos al endpoint `GET /health`.
