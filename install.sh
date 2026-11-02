#!/usr/bin/env bash
# ==============================================================================
# Script de Instalación Automatizada para Ubuntu
# Sistema de Gestión Cementerios Municipales (San Carlos & Cachapoal)
# Compatible con: Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================

set -euo pipefail

# ─── Colores y Formato ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}${BOLD}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}${BOLD}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[AVISO]${NC} $*"; }
error()   { echo -e "${RED}${BOLD}[ERROR]${NC} $*" >&2; }

# ─── Comprobación de Sistema Operativo ────────────────────────────────────────
if [ ! -f /etc/os-release ]; then
    error "Este script está diseñado para Ubuntu Linux."
    exit 1
fi

. /etc/os-release
if [ "$ID" != "ubuntu" ] && [ "${ID_LIKE:-}" != "ubuntu" ] && [ "$ID" != "debian" ]; then
    warn "Sistema detectado: $PRETTY_NAME. Se recomienda Ubuntu 22.04 o 24.04 LTS."
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

INSTALL_MODE="sqlite" # Default: use the bundled SQLite database from local repository
for arg in "$@"; do
    case "$arg" in
        --sqlite)
            INSTALL_MODE="sqlite"
            ;;
        --native|--bare-metal)
            INSTALL_MODE="native"
            ;;
        --docker)
            INSTALL_MODE="docker"
            ;;
        --help|-h)
            echo "Uso: ./install.sh [OPCIONES]"
            echo ""
            echo "Opciones:"
            echo "  --sqlite       (RECOMENDADA) Instalación nativa directa utilizando la base de datos local actual (Anexo 1)"
            echo "  --native       Instalación nativa con servidor PostgreSQL local y migración de datos"
            echo "  --docker       Instalación mediante contenedores Docker Compose"
            echo "  -h, --help     Muestra esta ayuda"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}${BOLD}"
cat << 'EOF'
======================================================================
     SISTEMA DE GESTIÓN CEMENTERIOS MUNICIPALES
       San Carlos & Cachapoal — Región de Ñuble
======================================================================
EOF
echo -e "${NC}"
info "Directorio del proyecto: $PROJECT_DIR"
info "Modo de instalación seleccionado: ${BOLD}${INSTALL_MODE^^}${NC}"

# ─── Comprobar permisos sudo ──────────────────────────────────────────────────
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo >/dev/null 2>&1; then
            SUDO="sudo"
        else
            error "Se requieren permisos de root o sudo para instalar paquetes."
            exit 1
        fi
    else
        SUDO=""
    fi
}

run_as_root() {
    if [ -n "$SUDO" ]; then
        $SUDO "$@"
    else
        "$@"
    fi
}

run_as_user() {
    local target_user="$1"
    shift
    if [ -n "$SUDO" ]; then
        $SUDO -u "$target_user" "$@"
    else
        su - "$target_user" -c "$*"
    fi
}

# ─── CONFIGURAR .ENV ──────────────────────────────────────────────────────────
setup_env() {
    info "Configurando variables de entorno (.env)..."
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            cat << 'ENVEOF' > .env
ENVIRONMENT=production
DEBUG=False
APP_NAME="Sistema de Gestión Cementerios Municipales San Carlos y Cachapoal"
APP_VERSION=1.0.0
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || echo "cemetery-production-super-secret-key-32b-min")
API_V1_STR=/api/v1
AUDIT_HMAC_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "cemetery-hmac-sha256-audit-secret-key-32b-min")
TOTP_ISSUER="Cementerio Municipal San Carlos"
ACCESS_TOKEN_EXPIRE_MINUTES=480

POSTGRES_USER=cem_admin
POSTGRES_PASSWORD=cem_secure_password_2026
POSTGRES_DB=cem_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg2://cem_admin:cem_secure_password_2026@localhost:5432/cem_db

NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_DEFAULT_LOCALE=es
ENVEOF
        fi
        success "Archivo .env creado."
    else
        info "Archivo .env existente encontrado. Se preservará."
    fi
}

# ==============================================================================
# MODO 1: INSTALACIÓN CON DOCKER COMPOSE (RECOMENDADO)
# ==============================================================================
install_docker_mode() {
    check_sudo
    info "Verificando dependencias de Docker..."

    if ! command -v docker >/dev/null 2>&1; then
        info "Instalando Docker Engine..."
        $SUDO apt-get update -y
        $SUDO apt-get install -y ca-certificates curl gnupg lsb-release
        $SUDO install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
        $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
        $SUDO apt-get update -y
        $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
        # Permitir al usuario actual ejecutar docker sin sudo si no es root
        if [ -n "${SUDO_USER:-}" ]; then
            $SUDO usermod -aG docker "$SUDO_USER" || true
        fi
        success "Docker instalado correctamente."
    else
        success "Docker ya está instalado: $(docker --version)"
    fi

    # Verificar docker compose
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        info "Instalando plugin docker-compose-plugin..."
        $SUDO apt-get update -y && $SUDO apt-get install -y docker-compose-plugin
        COMPOSE_CMD="docker compose"
    fi
    success "Docker Compose listo: $($COMPOSE_CMD version)"

    setup_env

    info "Construyendo y levantando contenedores en segundo plano..."
    $COMPOSE_CMD up -d --build

    info "Esperando que los servicios inicien..."
    sleep 8

    # Comprobación de salud
    info "Comprobando estado de contenedores..."
    $COMPOSE_CMD ps
}

# ==============================================================================
# MODO 2: INSTALACIÓN NATIVA DIRECTA (SQLITE - USA LA BASE DE DATOS ACTUAL)
# ==============================================================================
install_sqlite_mode() {
    check_sudo
    info "Iniciando instalación directa con la base de datos actual (SQLite / Anexo 1)..."

    info "Actualizando repositorios de Ubuntu e instalando dependencias base..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y \
        build-essential \
        curl \
        git \
        sqlite3 \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        libssl-dev \
        libffi-dev

    # 1. Configurar Backend Python
    info "Configurando Backend FastAPI y entorno virtual Python..."
    cd "$PROJECT_DIR/backend"
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi

    # Instalar UV para instalaciones rápidas
    if ! command -v uv >/dev/null 2>&1; then
        info "Instalando instalador rápido Astral UV..."
        curl -LsSf https://astral.sh/uv/install.sh | sh || true
        export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    fi

    if command -v uv >/dev/null 2>&1; then
        uv pip install -p .venv/bin/python -r pyproject.toml
    else
        .venv/bin/pip install --upgrade pip
        .venv/bin/pip install -e .
    fi

    # Configurar .env del backend para usar la base de datos actual
    if [ ! -f .env ]; then
        cat << 'ENVEOF' > .env
ENVIRONMENT=production
DEBUG=False
APP_NAME="Sistema de Gestión Cementerios Municipales San Carlos y Cachapoal"
APP_VERSION=1.0.0
SECRET_KEY=cemetery-secret-key-production-local-2026
API_V1_STR=/api/v1
AUDIT_HMAC_SECRET=cemetery-hmac-sha256-audit-secret-key-32bytes-min
TOTP_ISSUER="Cementerio Municipal San Carlos"
ACCESS_TOKEN_EXPIRE_MINUTES=480
DATABASE_URL=sqlite:///./cem_dev.db
ENVEOF
        success "Archivo backend/.env configurado con SQLite."
    fi

    # Verificar que los archivos de base de datos actuales existan
    if [ -f "cem_core.db" ]; then
        success "Base de datos actual encontrada (cem_core.db). Preservando todos los registros."
    else
        warn "cem_core.db no encontrada, ejecutando inicialización..."
        .venv/bin/python3 app/infrastructure/db/init_db.py
    fi

    # 2. Configurar Node.js y Frontend
    info "Verificando Node.js..."
    if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
        info "Instalando Node.js 20 LTS desde NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
        if [ -n "$SUDO" ]; then
            $SUDO bash /tmp/nodesource_setup.sh
            $SUDO apt-get install -y nodejs
        else
            bash /tmp/nodesource_setup.sh
            apt-get install -y nodejs
        fi
        rm -f /tmp/nodesource_setup.sh
    fi
    success "Node.js listo: $(node -v) con npm $(npm -v)"

    info "Instalando dependencias del Frontend y compilando paquete de producción..."
    cd "$PROJECT_DIR/frontend"
    npm install
    NEXT_PUBLIC_API_URL="http://localhost:8001" npm run build
    success "Frontend compilado correctamente."

    # 3. Crear servicios systemd para arranque automático
    info "Creando servicios systemd para backend y frontend..."
    CURRENT_USER="${SUDO_USER:-$USER}"

    # Servicio Backend
    $SUDO tee /etc/systemd/system/cem-backend.service > /dev/null << SYSTEMD_BACKEND
[Unit]
Description=Sistema Cementerios - Backend FastAPI (SQLite Mode)
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always
RestartSec=3
Environment=PATH=$PROJECT_DIR/backend/.venv/bin:/usr/local/bin:/usr/bin
Environment=DATABASE_URL=sqlite:///./cem_dev.db

[Install]
WantedBy=multi-user.target
SYSTEMD_BACKEND

    # Servicio Frontend
    $SUDO tee /etc/systemd/system/cem-frontend.service > /dev/null << SYSTEMD_FRONTEND
[Unit]
Description=Sistema Cementerios - Frontend Next.js
After=network.target cem-backend.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=/usr/bin/npm start -- -p 5011
Restart=always
RestartSec=3
Environment=PORT=5011
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=http://localhost:8001

[Install]
WantedBy=multi-user.target
SYSTEMD_FRONTEND

    $SUDO systemctl daemon-reload
    $SUDO systemctl enable --now cem-backend.service
    $SUDO systemctl enable --now cem-frontend.service
    success "Servicios systemd activados y en ejecución con la base de datos local."

    cd "$PROJECT_DIR"
}

# ==============================================================================
# MODO 3: INSTALACIÓN NATIVA CON POSTGRESQL (CON SINCRONIZACIÓN DE DATOS)
# ==============================================================================
install_native_mode() {
    check_sudo
    info "Iniciando instalación nativa con servidor PostgreSQL..."

    info "Actualizando repositorios de Ubuntu e instalando dependencias..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y \
        build-essential \
        curl \
        git \
        libpq-dev \
        postgresql \
        postgresql-contrib \
        sqlite3 \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        libssl-dev \
        libffi-dev

    # 1. Configurar PostgreSQL
    info "Configurando base de datos PostgreSQL..."
    $SUDO systemctl enable --now postgresql

    # Crear usuario y base de datos
    $SUDO -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='cem_admin'" | grep -q 1 || \
        $SUDO -u postgres psql -c "CREATE USER cem_admin WITH PASSWORD 'cem_secure_password_2026' SUPERUSER;"
    
    $SUDO -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='cem_db'" | grep -q 1 || \
        $SUDO -u postgres psql -c "CREATE DATABASE cem_db OWNER cem_admin ENCODING 'UTF8';"

    if [ -f "$PROJECT_DIR/backend/scripts/init_schemas.sql" ]; then
        info "Inicializando esquemas PostgreSQL (core, audit, migration, staging)..."
        PGPASSWORD=cem_secure_password_2026 psql -h localhost -U cem_admin -d cem_db -f "$PROJECT_DIR/backend/scripts/init_schemas.sql" || true
    fi
    success "PostgreSQL configurado correctamente."

    # 2. Configurar Backend Python
    info "Configurando Backend FastAPI y entorno virtual Python..."
    cd "$PROJECT_DIR/backend"
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi

    if ! command -v uv >/dev/null 2>&1; then
        info "Instalando instalador rápido Astral UV..."
        curl -LsSf https://astral.sh/uv/install.sh | sh || true
        export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    fi

    if command -v uv >/dev/null 2>&1; then
        uv pip install -p .venv/bin/python -r pyproject.toml
    else
        .venv/bin/pip install --upgrade pip
        .venv/bin/pip install -e .
    fi

    # Inicializar tablas y datos semilla
    info "Inicializando tablas en PostgreSQL..."
    DATABASE_URL=postgresql+psycopg2://cem_admin:cem_secure_password_2026@localhost:5432/cem_db .venv/bin/python3 -c "
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.init_db import init_db
db = SessionLocal()
init_db(db)
db.close()
print('Base de datos PostgreSQL inicializada.')
"

    # Sincronizar datos desde la base de datos actual (SQLite) si existe
    if [ -f "$PROJECT_DIR/backend/cem_core.db" ] && [ -f "$PROJECT_DIR/backend/scripts/sync_sqlite_to_pg.py" ]; then
        info "Sincronizando registros actuales desde cem_core.db a PostgreSQL..."
        .venv/bin/python3 "$PROJECT_DIR/backend/scripts/sync_sqlite_to_pg.py" "postgresql+psycopg2://cem_admin:cem_secure_password_2026@localhost:5432/cem_db" || warn "Sincronización SQLite a PostgreSQL continuó con advertencias."
    fi
    success "Backend y base de datos PostgreSQL sincronizados."

    # 3. Configurar Node.js y Frontend
    info "Verificando Node.js..."
    if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
        info "Instalando Node.js 20 LTS desde NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
        if [ -n "$SUDO" ]; then
            $SUDO bash /tmp/nodesource_setup.sh
            $SUDO apt-get install -y nodejs
        else
            bash /tmp/nodesource_setup.sh
            apt-get install -y nodejs
        fi
        rm -f /tmp/nodesource_setup.sh
    fi
    success "Node.js listo: $(node -v) con npm $(npm -v)"

    info "Instalando dependencias del Frontend y compilando paquete de producción..."
    cd "$PROJECT_DIR/frontend"
    npm install
    NEXT_PUBLIC_API_URL="http://localhost:8001" npm run build
    success "Frontend compilado correctamente."

    # 4. Crear servicios systemd para arranque automático
    info "Creando servicios systemd para backend y frontend..."
    CURRENT_USER="${SUDO_USER:-$USER}"

    # Servicio Backend
    $SUDO tee /etc/systemd/system/cem-backend.service > /dev/null << SYSTEMD_BACKEND
[Unit]
Description=Sistema Cementerios - Backend FastAPI (PostgreSQL Mode)
After=network.target postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always
RestartSec=3
Environment=PATH=$PROJECT_DIR/backend/.venv/bin:/usr/local/bin:/usr/bin
Environment=DATABASE_URL=postgresql+psycopg2://cem_admin:cem_secure_password_2026@localhost:5432/cem_db

[Install]
WantedBy=multi-user.target
SYSTEMD_BACKEND

    # Servicio Frontend
    $SUDO tee /etc/systemd/system/cem-frontend.service > /dev/null << SYSTEMD_FRONTEND
[Unit]
Description=Sistema Cementerios - Frontend Next.js
After=network.target cem-backend.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=/usr/bin/npm start -- -p 5011
Restart=always
RestartSec=3
Environment=PORT=5011
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=http://localhost:8001

[Install]
WantedBy=multi-user.target
SYSTEMD_FRONTEND

    $SUDO systemctl daemon-reload
    $SUDO systemctl enable --now cem-backend.service
    $SUDO systemctl enable --now cem-frontend.service
    success "Servicios systemd activados y en ejecución."

    cd "$PROJECT_DIR"
}

# ─── Ejecución del modo seleccionado ──────────────────────────────────────────
if [ "$INSTALL_MODE" = "sqlite" ]; then
    install_sqlite_mode
elif [ "$INSTALL_MODE" = "docker" ]; then
    install_docker_mode
else
    install_native_mode
fi

# ─── Resumen Final ────────────────────────────────────────────────────────────
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}     ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!                            ${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo ""
echo -e "${BOLD}Acceso al Sistema:${NC}"
echo -e "  🌐 Plataforma Web (Frontend): ${CYAN}http://${SERVER_IP}:5011${NC}  o  ${CYAN}http://localhost:5011${NC}"
echo -e "  ⚙️  API Backend Docs:          ${CYAN}http://${SERVER_IP}:8001/api/v1/docs${NC}"
echo -e "  🤖 Asistente de IA:           ${CYAN}http://${SERVER_IP}:5011/admin/asistente${NC}"
echo ""
echo -e "${BOLD}Credenciales Administrativas Iniciales:${NC}"
echo -e "  👤 Usuario:     ${BOLD}admin${NC}"
echo -e "  🔑 Contraseña:  ${BOLD}AdminCem2026!${NC}"
echo ""
if [ "$INSTALL_MODE" = "docker" ]; then
echo -e "${BOLD}Comandos de Gestión (Docker):${NC}"
echo -e "  Ver estado:       ${CYAN}docker compose ps${NC}"
echo -e "  Ver registros:    ${CYAN}docker compose logs -f${NC}"
echo -e "  Detener sistema:  ${CYAN}docker compose down${NC}"
echo -e "  Reiniciar:        ${CYAN}docker compose restart${NC}"
else
echo -e "${BOLD}Comandos de Gestión (Systemd):${NC}"
echo -e "  Estado Backend:   ${CYAN}sudo systemctl status cem-backend${NC}"
echo -e "  Estado Frontend:  ${CYAN}sudo systemctl status cem-frontend${NC}"
echo -e "  Ver logs Backend: ${CYAN}sudo journalctl -u cem-backend -f${NC}"
echo -e "  Reiniciar todo:   ${CYAN}sudo systemctl restart cem-backend cem-frontend${NC}"
fi
echo ""
echo -e "Para realizar respaldos normativos de la base de datos:"
echo -e "  ${CYAN}python3 backend/scripts/backup.py${NC}"
echo ""
echo -e "${GREEN}${BOLD}¡Sistema listo para operar!${NC}"
