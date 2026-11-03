import time
import asyncio
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError

from app.core.config import settings
from app.infrastructure.db.session import SessionLocal
from app.domain.models.audit import ActividadUsuario
from app.domain.models.usuario import Usuario

# In-memory short cache for user identity: username -> {"user_id": ..., "user_rut": ..., "user_role": ..., "ts": ...}
_USER_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300


def get_cached_user_info(username: str) -> Tuple[Optional[int], Optional[str], Optional[str]]:
    now = time.time()
    cached = _USER_CACHE.get(username)
    if cached and (now - cached["ts"]) < CACHE_TTL_SECONDS:
        return cached["user_id"], cached["user_rut"], cached["user_role"]
    
    # Query database
    try:
        with SessionLocal() as db:
            user = db.query(Usuario).filter(Usuario.username == username).first()
            if user:
                user_id = user.id
                user_rut = user.rut
                user_role = user.rol
                _USER_CACHE[username] = {
                    "user_id": user_id,
                    "user_rut": user_rut,
                    "user_role": user_role,
                    "ts": now
                }
                return user_id, user_rut, user_role
    except Exception:
        pass

    return None, None, None


def extract_client_ip(request: Request) -> str:
    """Resolves real client IP address checking reverse proxy and load balancer headers."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    
    if request.client and request.client.host:
        return request.client.host
    
    return "127.0.0.1"


def infer_module_and_action(method: str, path: str, status_code: int) -> Tuple[str, str, str]:
    """
    Intelligently identifies the cemetery system module, action code,
    and a clear, Chilean human-readable explanation of the user's movement.
    """
    p = path.lower()
    m = method.upper()

    # Default fallback
    modulo = "SISTEMA"
    accion = f"{m}_MOVIMIENTO"
    descripcion = f"Petición {m} a {path}"

    # 1. Autenticación & Seguridad
    if "/auth" in p:
        modulo = "AUTENTICACION"
        if "/login" in p:
            if status_code < 400:
                accion = "LOGIN_EXITOSO"
                descripcion = "Inicio de sesión exitoso en el sistema"
            else:
                accion = "LOGIN_FALLIDO"
                descripcion = "Intento fallido de inicio de sesión con credenciales erróneas"
        elif "/me" in p:
            accion = "VERIFICAR_SESION"
            descripcion = "Validación de credenciales y estado de sesión activa"
        elif "/logout" in p:
            accion = "LOGOUT"
            descripcion = "Cierre de sesión de usuario"

    # 2. Inhumaciones & Defunciones (DS 357)
    elif "/inhumaciones" in p:
        modulo = "INHUMACIONES"
        if m == "GET":
            accion = "CONSULTA_LIBRO"
            descripcion = "Consulta del Libro Oficial de Inhumaciones y Defunciones"
        elif m == "POST":
            accion = "REGISTRO_INHUMACION"
            descripcion = "Registro formal de nueva inhumación de fallecido"
        elif m in ["PUT", "PATCH"]:
            accion = "ACTUALIZACION_INHUMACION"
            descripcion = "Actualización de datos de fallecido o sepultación"
        elif m == "DELETE":
            accion = "ELIMINACION_INHUMACION"
            descripcion = "Anulación o eliminación de registro de inhumación"

    # 3. Ubicaciones & Catastro Espacial GIS
    elif "/ubicaciones" in p:
        modulo = "UBICACIONES"
        if m == "GET":
            accion = "CONSULTA_GIS"
            descripcion = "Consulta de catastro espacial, nichos y coordenadas GIS"
        elif m == "POST":
            accion = "CREACION_UBICACION"
            descripcion = "Creación de nueva sepultura/nicho en catastro"
        elif m in ["PUT", "PATCH"]:
            accion = "MODIFICACION_UBICACION"
            descripcion = "Modificación de estado, capacidad o sector de sepultura"
        elif m == "DELETE":
            accion = "ELIMINACION_UBICACION"
            descripcion = "Eliminación de sepultura del catastro"

    # 4. Derechos de Sepultación & Concesiones
    elif "/derechos" in p or "/arriendos" in p:
        modulo = "DERECHOS"
        if m == "GET":
            accion = "CONSULTA_CONCESIONES"
            descripcion = "Consulta de régimen de concesiones y derechos municipales"
        elif m == "POST":
            accion = "OTORGAMIENTO_CONCESION"
            descripcion = "Otorgamiento de nueva concesión o arriendo de sepultura"
        elif m in ["PUT", "PATCH"]:
            accion = "RENOVACION_CONCESION"
            descripcion = "Renovación o regularización de plazo de arriendo"

    # 5. Reservas de Sepulturas
    elif "/reservas" in p:
        modulo = "RESERVAS"
        if m == "GET":
            accion = "CONSULTA_RESERVAS"
            descripcion = "Consulta del padrón de reservas anticipadas"
        elif m == "POST":
            accion = "CREACION_RESERVA"
            descripcion = "Ingreso de reserva anticipada de sepultura"
        elif m in ["PUT", "PATCH"]:
            accion = "MODIFICACION_RESERVA"
            descripcion = "Confirmación, anulación o modificación de reserva"

    # 6. Exhumaciones & Traslados Sanitarios
    elif "/exhumaciones" in p:
        modulo = "EXHUMACIONES"
        if m == "GET":
            accion = "CONSULTA_EXHUMACIONES"
            descripcion = "Consulta del registro oficial de exhumaciones y traslados"
        elif m == "POST":
            accion = "ORDEN_EXHUMACION"
            descripcion = "Ingreso de orden sanitaria de exhumación o traslado"

    # 7. Maestros & Obras Particulares
    elif "/maestros" in p:
        modulo = "MAESTROS"
        if m == "GET":
            accion = "CONSULTA_MAESTROS"
            descripcion = "Consulta del padrón de maestros y obras autorizadas"
        elif m == "POST":
            accion = "AUTORIZACION_OBRA"
            descripcion = "Registro de autorización de obras en sepulturas"

    # 8. Reportes & Estadísticas Municipales
    elif "/reportes" in p:
        modulo = "REPORTES"
        if "/exportar" in p:
            accion = "EXPORTACION_EXCEL"
            descripcion = "Exportación de reporte oficial en formato Excel / CSV"
        elif "/resumen" in p:
            accion = "CONSULTA_KPIS"
            descripcion = "Visualización de indicadores ejecutivos y capacidad municipal"
        elif "/defunciones" in p:
            accion = "CONSULTA_LIBRO_DEFUNCIONES"
            descripcion = "Consulta filtrada del Libro de Defunciones (DS 357)"
        elif "/vencimientos" in p:
            accion = "CONTROL_VENCIMIENTOS"
            descripcion = "Revisión de concesiones vencidas o próximas a vencer"
        elif "/capacidad" in p:
            accion = "ANALISIS_CAPACIDAD"
            descripcion = "Análisis de capacidad y nichos disponibles por cementerio"
        else:
            accion = "CONSULTA_REPORTES"
            descripcion = "Acceso a la sección de reportes y estadísticas"

    # 9. Certificados Oficiales
    elif "/certificados" in p:
        modulo = "CERTIFICADOS"
        if "/publico" in p:
            accion = "VERIFICACION_PUBLICA"
            descripcion = "Verificación pública de autenticidad de certificado"
        elif m == "POST":
            accion = "EMISION_CERTIFICADO"
            descripcion = "Emisión de certificado oficial con firma QR digital"
        else:
            accion = "CONSULTA_CERTIFICADOS"
            descripcion = "Consulta de historial de certificados emitidos"

    # 10. Campo & Cuadrillas Terreno
    elif "/agenda" in p or "/terreno" in p:
        modulo = "CAMPO_TERRENO"
        if m == "GET":
            accion = "CONSULTA_FAENAS"
            descripcion = "Consulta de faenas y tareas asignadas a cuadrillas"
        else:
            accion = "ASIGNACION_FAENA"
            descripcion = "Asignación o actualización de faena operativa de terreno"

    # 11. Usuarios & Funcionarios
    elif "/usuarios" in p:
        modulo = "USUARIOS"
        if m == "GET":
            accion = "CONSULTA_USUARIOS"
            descripcion = "Consulta de nómina de funcionarios y usuarios del sistema"
        elif m == "POST":
            accion = "CREACION_USUARIO"
            descripcion = "Alta de nuevo usuario en el sistema"
        elif m in ["PUT", "PATCH"]:
            accion = "MODIFICACION_USUARIO"
            descripcion = "Modificación de datos, roles o estado de funcionario"
        elif m == "DELETE":
            accion = "BLOQUEO_USUARIO"
            descripcion = "Desactivación o bloqueo de cuenta de usuario"

    # 12. Grupos & Permisos (RBAC)
    elif "/grupos" in p:
        modulo = "GRUPOS_PERMISOS"
        if m == "GET":
            accion = "CONSULTA_PERMISOS"
            descripcion = "Consulta de la matriz de permisos por grupo"
        else:
            accion = "MODIFICACION_PERMISOS"
            descripcion = "Modificación de matriz de permisos RBAC para grupo de usuarios"

    # 13. Auditoría & Trazabilidad
    elif "/auditoria" in p:
        modulo = "AUDITORIA"
        if "/actividad" in p:
            accion = "CONSULTA_ACTIVIDAD"
            descripcion = "Consulta del log de actividad de usuarios"
        elif "/verificar" in p:
            accion = "VERIFICACION_CRIPTOGRAFICA"
            descripcion = "Verificación de integridad de cadena HMAC SHA-256"
        elif "/exit-package" in p:
            accion = "EXPORT_PAQUETE_SALIDA"
            descripcion = "Descarga del paquete nativo de salida (Cláusula de Portabilidad)"
        elif "/export-csv" in p:
            accion = "EXPORT_LOG_CSV"
            descripcion = "Descarga de registro de auditoría en CSV"
        else:
            accion = "CONSULTA_AUDITORIA"
            descripcion = "Visualización del módulo de auditoría del sistema"

    # 14. Portal Ciudadano
    elif "/portal" in p:
        modulo = "PORTAL_PUBLICO"
        if m == "GET":
            accion = "CONSULTA_PORTAL"
            descripcion = "Consulta de parámetros y configuración del portal cívico"
        else:
            accion = "CONFIG_PORTAL"
            descripcion = "Actualización de configuración del portal público"

    # 15. Temas & Personalización
    elif "/temas" in p:
        modulo = "TEMAS"
        if m == "GET":
            accion = "CONSULTA_TEMAS"
            descripcion = "Consulta de paleta de temas e identidad visual"
        else:
            accion = "CAMBIO_TEMA"
            descripcion = "Modificación de tema e identidad visual del sistema"

    # Si hubo error HTTP, contextualizar la descripción
    if status_code == 401:
        accion = "ACCESO_NO_AUTORIZADO"
        descripcion = f"Intento no autorizado en {path} (Sin token válido)"
    elif status_code == 403:
        accion = "ACCESO_DENEGADO"
        descripcion = f"Acceso denegado en {path} (Permisos insuficientes)"
    elif status_code == 404:
        accion = "RECURSO_NO_ENCONTRADO"
        descripcion = f"Búsqueda de recurso inexistente en {path}"
    elif status_code == 409:
        accion = "CONFLICTO_CONCURRENCIA"
        descripcion = f"Conflicto de concurrencia al modificar {path}"
    elif status_code >= 500:
        accion = "ERROR_SERVIDOR"
        descripcion = f"Fallo interno en el servidor ({status_code}) procesando {path}"

    return modulo, accion, descripcion


def _sync_persist_activity(
    username: str,
    user_id: Optional[int],
    user_rut: Optional[str],
    user_role: Optional[str],
    ip_address: str,
    user_agent: Optional[str],
    metodo: str,
    ruta: str,
    modulo: str,
    accion: str,
    descripcion: str,
    status_code: int,
    duracion_ms: float,
    detalles: Optional[Dict[str, Any]]
):
    """Safely records the activity event to SQLite audit database."""
    try:
        with SessionLocal() as db:
            act = ActividadUsuario(
                username=username,
                user_id=user_id,
                user_rut=user_rut,
                user_role=user_role,
                ip_address=ip_address,
                user_agent=user_agent,
                metodo=metodo,
                ruta=ruta,
                modulo=modulo,
                accion=accion,
                descripcion=descripcion,
                status_code=status_code,
                duracion_ms=duracion_ms,
                detalles=detalles
            )
            db.add(act)
            db.commit()
    except Exception:
        # Never fail or block the main application thread if logging encounters an issue
        pass


class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """
    Automatic User Activity & Movement Logging Middleware.
    Captures every user action, endpoint visit, data modification, and error
    with real client IP, username, role, and execution latency.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        method = request.method

        # Skip noise: preflight, health, docs, static favicons
        if method == "OPTIONS" or path in [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico"
        ]:
            return await call_next(request)

        # Only audit API routes
        if not path.startswith(settings.API_V1_STR):
            return await call_next(request)

        # Extract Client IP
        client_ip = extract_client_ip(request)

        # Extract User Agent
        raw_ua = request.headers.get("user-agent", "")
        user_agent = raw_ua[:250] if raw_ua else None

        # Extract Username from Bearer JWT Token
        username = "ANONIMO"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            try:
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM]
                )
                sub = payload.get("sub")
                if sub:
                    username = sub
            except JWTError:
                pass

        # Measure request latency
        start_time = time.perf_counter()
        response: Response = await call_next(request)
        duracion_ms = round((time.perf_counter() - start_time) * 1000, 2)

        status_code = response.status_code

        # If user is still anonymous but it was a successful login, let's catch the username if possible
        if username == "ANONIMO" and "/auth/login" in path and status_code < 400:
            username = "ADMIN_LOGIN"

        # Resolve user ID, RUT, Role
        user_id, user_rut, user_role = None, None, None
        if username != "ANONIMO":
            user_id, user_rut, user_role = get_cached_user_info(username)

        # Infer module, action, and friendly description
        modulo, accion, descripcion = infer_module_and_action(method, path, status_code)

        # Prepare query parameters summary for extra context
        query_params = dict(request.query_params)
        # Redact sensitive parameters if present
        for sensitive_key in ["password", "token", "secret", "clave"]:
            if sensitive_key in query_params:
                query_params[sensitive_key] = "******"

        detalles = {
            "query": query_params if query_params else None,
            "path": path,
            "ip": client_ip
        }

        # Don't flood the DB with polling from /auditoria/actividad itself
        # We record it, but we can execute persistence non-blockingly
        loop = asyncio.get_event_loop()
        loop.run_in_executor(
            None,
            _sync_persist_activity,
            username,
            user_id,
            user_rut,
            user_role,
            client_ip,
            user_agent,
            method,
            path,
            modulo,
            accion,
            descripcion,
            status_code,
            duracion_ms,
            detalles
        )

        return response
