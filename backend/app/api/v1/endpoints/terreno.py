import os
import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import TareaTerreno, Cementerio, Ubicacion, Usuario, RolUsuario
from app.domain.schemas.terreno import TareaTerrenoCreate, TareaTerrenoUpdate, TareaTerrenoResponse
from app.infrastructure.db.audit_listener import AuditService
from app.api.deps import require_role, get_current_user_optional, get_current_user

router = APIRouter()

UPLOAD_DIR = "/tmp/cemetery_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/agenda", response_model=List[TareaTerrenoResponse])
def get_daily_agenda(
    fecha: Optional[date] = Query(None, description="Target date (default: today)"),
    cementerio_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns the daily scheduled burial, exhumation, and maintenance agenda
    tailored for cemetery field personnel (sepultureros mobile PWA).
    """
    target_date = fecha or date.today()
    query = db.query(TareaTerreno).filter(TareaTerreno.fecha_programada == target_date)

    if cementerio_id:
        query = query.filter(TareaTerreno.cementerio_id == cementerio_id)
    if estado:
        query = query.filter(TareaTerreno.estado == estado.upper())

    tasks = query.order_by(TareaTerreno.hora_programada.asc()).all()

    results = []
    for t in tasks:
        results.append(TareaTerrenoResponse(
            id=t.id,
            folio_orden=t.folio_orden,
            cementerio_id=t.cementerio_id,
            cementerio_nombre=t.cementerio.nombre if t.cementerio else "San Carlos",
            ubicacion_id=t.ubicacion_id,
            codigo_ubicacion=t.ubicacion.codigo_completo if t.ubicacion else "N/A",
            tipo_tarea=t.tipo_tarea,
            estado=t.estado,
            fallecido_nombre=t.fallecido_nombre,
            rut_fallecido=t.rut_fallecido,
            solicitante_nombre=t.solicitante_nombre,
            fecha_programada=t.fecha_programada.isoformat(),
            hora_programada=t.hora_programada,
            sepulturero_asignado=t.sepulturero_asignado,
            acta_firmada_url=t.acta_firmada_url,
            foto_pase_url=t.foto_pase_url,
            observaciones=t.observaciones,
            ejecutado_at=t.ejecutado_at.isoformat() if t.ejecutado_at else None,
            ejecutado_por=t.ejecutado_por
        ))

    return results


@router.post("/tarea", response_model=TareaTerrenoResponse, status_code=status.HTTP_201_CREATED)
def crear_tarea_terreno(
    tarea_in: TareaTerrenoCreate,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """Schedule a new task for the cemetery field crew."""
    cemetery = db.query(Cementerio).filter(Cementerio.id == tarea_in.cementerio_id).first()
    if not cemetery:
        raise HTTPException(status_code=404, detail="Cementerio no encontrado")

    folio = f"ORD-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
    nueva = TareaTerreno(
        folio_orden=folio,
        cementerio_id=tarea_in.cementerio_id,
        ubicacion_id=tarea_in.ubicacion_id,
        tipo_tarea=tarea_in.tipo_tarea.upper(),
        estado="PENDIENTE",
        fallecido_nombre=tarea_in.fallecido_nombre,
        rut_fallecido=tarea_in.rut_fallecido,
        solicitante_nombre=tarea_in.solicitante_nombre,
        fecha_programada=tarea_in.fecha_programada,
        hora_programada=tarea_in.hora_programada,
        sepulturero_asignado=tarea_in.sepulturero_asignado or "Cuadrilla 1",
        observaciones=tarea_in.observaciones
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return TareaTerrenoResponse(
        id=nueva.id,
        folio_orden=nueva.folio_orden,
        cementerio_id=nueva.cementerio_id,
        cementerio_nombre=nueva.cementerio.nombre,
        ubicacion_id=nueva.ubicacion_id,
        codigo_ubicacion=nueva.ubicacion.codigo_completo if nueva.ubicacion else "N/A",
        tipo_tarea=nueva.tipo_tarea,
        estado=nueva.estado,
        fallecido_nombre=nueva.fallecido_nombre,
        rut_fallecido=nueva.rut_fallecido,
        solicitante_nombre=nueva.solicitante_nombre,
        fecha_programada=nueva.fecha_programada.isoformat(),
        hora_programada=nueva.hora_programada,
        sepulturero_asignado=nueva.sepulturero_asignado,
        acta_firmada_url=nueva.acta_firmada_url,
        foto_pase_url=nueva.foto_pase_url,
        observaciones=nueva.observaciones,
        ejecutado_at=None,
        ejecutado_por=None
    )


@router.patch("/tarea/{task_id}/completar")
def completar_tarea_terreno(
    task_id: int,
    operario_nombre: Optional[str] = Query("Sepulturero en Terreno"),
    observaciones: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """Marks a field task as executed with completion timestamp."""
    tarea = db.query(TareaTerreno).filter(TareaTerreno.id == task_id).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea de terreno no encontrada")

    tarea.estado = "COMPLETADA"
    tarea.ejecutado_at = datetime.now()
    tarea.ejecutado_por = operario_nombre or (current_user.username if current_user else "Sepulturero")
    if observaciones:
        tarea.observaciones = f"{tarea.observaciones or ''} | Ejecución: {observaciones}".strip(" |")

    db.commit()
    db.refresh(tarea)

    AuditService.log_mutation(
        session=db,
        modulo="TERRENO",
        accion="COMPLETAR_TAREA",
        entidad="core.tb_tarea_terreno",
        registro_id=str(tarea.id),
        payload_posterior=tarea.to_dict(),
        user_id=current_user.id if current_user else 1,
        username=current_user.username if current_user else operario_nombre,
        user_rut=current_user.rut if current_user else "11111111-1",
        user_role=current_user.rol if current_user else "OPERARIO",
        commit=True
    )

    return {
        "success": True,
        "message": f"Tarea {tarea.folio_orden} completada exitosamente.",
        "tarea": tarea.to_dict()
    }


from fastapi.responses import FileResponse

MAGIC_HEADERS = {
    ".pdf": b"%PDF-",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
}

BLOCKED_EXECUTABLE_PREFIXES = [
    b"MZ",       # Windows DOS/PE executable / DLL
    b"\x7fELF",   # Linux ELF binary
    b"PK\x03\x04" # Disguised ZIP / APK / JAR executable payload
]


@router.post("/subir-acta")
async def subir_acta_o_foto(
    task_id: int = Form(...),
    tipo_adjunto: str = Form("FOTO_PASE"),  # FOTO_PASE or ACTA_FIRMADA
    archivo: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Upload endpoint for burial permits, death certificates, or signed field acts.
    Enforces strict 10MB limit, allowlist extension, binary magic-bytes signature verification,
    and executable/malware payload rejection (OWASP ASVS & EETT P54).
    """
    # 1. Size verification: 10MB limit
    contents = await archivo.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo excede el límite permitido de 10 MB."
        )

    # 2. Extension verification
    allowed_exts = {".pdf", ".jpg", ".jpeg", ".png"}
    ext = os.path.splitext(archivo.filename or "archivo.jpg")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no válido. Se admiten exclusivamente PDF, JPG y PNG."
        )

    # 3. Executable / malware signature detection
    for blocked_prefix in BLOCKED_EXECUTABLE_PREFIXES:
        if contents.startswith(blocked_prefix):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seguridad: Contenido binario ejecutable o comprimido rechazado por política de seguridad."
            )

    # 4. Strict Magic-Bytes Signature Verification
    expected_header = MAGIC_HEADERS.get(ext)
    if expected_header and not contents.startswith(expected_header):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inconsistencia de archivo: El contenido binario no coincide con la extensión declarada {ext} (firma inválida)."
        )

    # 5. Secure random file naming (prevent directory traversal / overwrites)
    safe_filename = f"task_{task_id}_{uuid.uuid4().hex[:12]}{ext}"
    target_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(target_path, "wb") as f:
        f.write(contents)

    private_url = f"/api/v1/terreno/adjuntos/{safe_filename}"
    return {
        "success": True,
        "filename": safe_filename,
        "url": private_url,
        "size_bytes": len(contents),
        "content_type": archivo.content_type
    }


@router.get("/adjuntos/{filename}")
def descargar_adjunto_privado(
    filename: str,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Authenticated Private Document Download Handler.
    Restricts download to authenticated staff. Visitor profile is rejected with 403 Forbidden.
    Prevents public object storage exposure and directory traversal (EETT P54, ASVS Level 2).
    """
    # 1. Role-based authorization: Visitor cannot download internal attachments
    if current_user.rol == RolUsuario.VISITA.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: El perfil Visita no cuenta con autorización para descargar documentación interna protegida por Ley 21.719."
        )

    # 2. Directory traversal sanitization
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, clean_filename)

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo adjunto solicitado no existe en el almacenamiento privado."
        )

    ext = os.path.splitext(clean_filename)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg"
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=clean_filename,
        headers={"Content-Disposition": f'attachment; filename="{clean_filename}"'}
    )

