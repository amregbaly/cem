from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    cementerios,
    ubicaciones,
    inhumaciones,
    temas,
    auditoria,
    busqueda,
    migracion,
    certificados,
    arriendos,
    terreno,
    maestros,
    grupos,
    portal,
    exhumaciones,
    reservas,
    asistente,
    reportes
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación & 2FA"])
api_router.include_router(grupos.router, prefix="/grupos", tags=["Grupos & Permisos (RBAC)"])
api_router.include_router(portal.router, prefix="/portal", tags=["Portal Ciudadano & Configuración Pública"])
api_router.include_router(cementerios.router, prefix="/cementerios", tags=["Cementerios"])
api_router.include_router(ubicaciones.router, prefix="/ubicaciones", tags=["Ubicaciones & Sepulturas"])
api_router.include_router(reservas.router, prefix="/reservas", tags=["Reservas & Disponibilidad (EETT 3.11)"])

api_router.include_router(inhumaciones.router, prefix="/inhumaciones", tags=["Inhumaciones & Sepultaciones"])
api_router.include_router(exhumaciones.router, prefix="/exhumaciones", tags=["Exhumaciones & Traslados"])
api_router.include_router(temas.router, prefix="/temas", tags=["Gestión de Temas & Paletas"])
api_router.include_router(auditoria.router, prefix="/auditoria", tags=["Auditoría Criptográfica HMAC"])
api_router.include_router(busqueda.router, prefix="/busqueda", tags=["Buscador Instantáneo"])
api_router.include_router(migracion.router, prefix="/migracion", tags=["Migración ETL & Conciliación"])
api_router.include_router(certificados.router, prefix="/certificados", tags=["Certificados QR & Verificación Digital"])
api_router.include_router(arriendos.router, prefix="/arriendos", tags=["Control de Arriendos & Vencimientos"])
api_router.include_router(terreno.router, prefix="/terreno", tags=["PWA Operarios en Terreno"])
api_router.include_router(maestros.router, prefix="/maestros", tags=["Derechos de Maestros & Obras"])
api_router.include_router(asistente.router, prefix="/asistente", tags=["Asistente de IA (Módulo Opcional)"])
api_router.include_router(reportes.router, prefix="/reportes", tags=["Reportes & Estadísticas Municipales"])

