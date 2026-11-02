# Guía de Instalación en Ubuntu Linux
## Sistema de Gestión Cementerios Municipales (San Carlos & Cachapoal)

Esta guía detalla los pasos para instalar y desplegar el sistema completo en un servidor o máquina con **Ubuntu 22.04 LTS** o **Ubuntu 24.04 LTS**.

---

### Requisitos Mínimos Recomendados

- **Sistema Operativo:** Ubuntu 22.04 LTS o Ubuntu 24.04 LTS
- **CPU:** 2 núcleos (vCPU)
- **RAM:** 4 GB de memoria RAM
- **Disco:** 20 GB de espacio disponible
- **Puertos de Red Requeridos:**
  - `5011`: Portal Web y Aplicación Frontend
  - `8001`: API REST Backend FastAPI
  - `5432` / `5434`: Base de datos PostgreSQL (interna/local)

---

## Método 1: Instalación Rápida Automatizada (Recomendado)

El repositorio incluye el script ejecutable [`install.sh`](file:///home/amr/dev/cem2/install.sh).

### 1. Clonar o copiar el repositorio en su servidor Ubuntu

```bash
git clone <URL_DEL_REPOSITORIO> /opt/cem2
cd /opt/cem2
```

### 2. Dar permisos de ejecución al script

```bash
chmod +x install.sh
```

### 3. Ejecutar la instalación

#### Opción A: Modo Docker Compose (Más fácil y aislado)
Instala automáticamente Docker Engine, Docker Compose, construye las imágenes y levanta los servicios en contenedores:

```bash
./install.sh --docker
```

#### Opción B: Modo Nativo (Bare-metal con Systemd)
Instala PostgreSQL local, Node.js 20, Python 3.12 y crea los servicios de inicio automático `systemd`:

```bash
./install.sh --native
```

---

## Método 2: Instalación Manual Paso a Paso (Modo Nativo)

Si prefiere realizar cada paso manualmente sin ejecutar el script automatizado:

### Paso 1: Actualizar paquetes del sistema
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git libpq-dev postgresql postgresql-contrib python3 python3-pip python3-venv python3-dev
```

### Paso 2: Instalar Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Paso 3: Configurar PostgreSQL
```bash
sudo systemctl enable --now postgresql

# Crear usuario y base de datos
sudo -u postgres psql -c "CREATE USER cem_admin WITH PASSWORD 'cem_secure_password_2026' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE cem_db OWNER cem_admin ENCODING 'UTF8';"

# Ejecutar extensiones y esquemas normativos
PGPASSWORD=cem_secure_password_2026 psql -h localhost -U cem_admin -d cem_db -f backend/scripts/init_schemas.sql
```

### Paso 4: Configurar y arrancar el Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e .

# Inicializar tablas y datos semilla (Crea admin, cementerios, tema, etc.)
python3 -c "
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.init_db import init_db
db = SessionLocal()
init_db(db)
db.close()
"

# Iniciar servidor backend
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Paso 5: Configurar y arrancar el Frontend
En una nueva terminal:
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL="http://localhost:8001" npm run build
npm start -- -p 5011
```

---

## Acceso y Credenciales Iniciales

Una vez completada la instalación, abra su navegador web:

- **Plataforma Web (Frontend):** `http://<IP_DEL_SERVIDOR>:5011`
- **Documentación API (Swagger):** `http://<IP_DEL_SERVIDOR>:8001/api/v1/docs`
- **Panel Asistente de IA:** `http://<IP_DEL_SERVIDOR>:5011/admin/asistente`

### Credenciales de Administrador por Defecto:
- **Usuario:** `admin`
- **Contraseña:** `AdminCem2026!`

*(Recuerde cambiar la contraseña inicial desde el menú **Administración > Gestión de Usuarios** una vez dentro).*

---

## Comandos de Mantenimiento

### Ver estado de servicios (Docker):
```bash
docker compose ps
docker compose logs -f
```

### Ver estado de servicios (Systemd):
```bash
sudo systemctl status cem-backend
sudo systemctl status cem-frontend
```

### Realizar respaldo normativo de la base de datos:
```bash
python3 backend/scripts/backup.py
```
Los respaldos se almacenan cifrados y archivados en `backend/backups/automated/`.
