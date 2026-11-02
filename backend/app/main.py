from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.init_db import init_db
from app.api.v1.router import api_router


from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm.exc import StaleDataError

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize schemas and seed data
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plataforma Web de Gestión Interna para los Cementerios Municipales de San Carlos y Cachapoal",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Exception handler for Optimistic Concurrency Control (OCC) conflicts
@app.exception_handler(StaleDataError)
async def stale_data_exception_handler(request: Request, exc: StaleDataError):
    return JSONResponse(
        status_code=409,
        content={
            "detail": "CONFLICTO_CONCURRENCIA: El registro fue modificado o eliminado por otra sesión concurrente. Por favor recargue los datos para resolver las diferencias antes de guardar."
        }
    )

# Security headers middleware (OWASP ASVS Level 2, EETT P54)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)



@app.get("/health")
def healthcheck():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/")
def root():
    return {
        "message": "Municipal Cemetery Management System (San Carlos & Cachapoal) API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }
