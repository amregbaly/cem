import io
import uuid
import secrets
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import Certificado, Ubicacion, Cementerio, Inhumacion, Derecho, Usuario, RolUsuario
from app.domain.schemas.certificado import CertificadoEmitirRequest, CertificadoPublicoResponse
from app.infrastructure.services.pdf_generator import generate_certificate_pdf
from app.infrastructure.db.audit_listener import AuditService
from app.api.deps import require_role, get_current_user_optional, get_current_user

router = APIRouter()


@router.post("/emitir", status_code=status.HTTP_201_CREATED)
def emitir_certificado(
    req: CertificadoEmitirRequest,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Issues an official municipal certificate, calculates SHA-256 fingerprint,
    embeds QR code, stores verification record, and logs append-only audit trail.
    """
    cementerio = db.query(Cementerio).filter(Cementerio.id == req.cementerio_id).first()
    if not cementerio:
        raise HTTPException(status_code=404, detail="Cementerio no encontrado")

    ubicacion = None
    codigo_ubic = "N/A"
    if req.ubicacion_id:
        ubicacion = db.query(Ubicacion).filter(Ubicacion.id == req.ubicacion_id).first()
        if ubicacion:
            codigo_ubic = ubicacion.codigo_completo

    # Determine deceased / titleholder details
    fallecido_name = req.fallecido_nombre
    rut_fall = req.rut_fallecido
    titular_name = req.titular_nombre
    rut_tit = req.rut_titular

    if req.inhumacion_id:
        inh = db.query(Inhumacion).filter(Inhumacion.id == req.inhumacion_id).first()
        if inh:
            fallecido_name = fallecido_name or inh.fallecido.nombre_completo
            rut_fall = rut_fall or inh.fallecido.rut
            if not ubicacion:
                ubicacion = inh.ubicacion
                codigo_ubic = ubicacion.codigo_completo

    if req.derecho_id:
        der = db.query(Derecho).filter(Derecho.id == req.derecho_id).first()
        if der:
            titular_name = titular_name or der.titular.nombre_completo
            rut_tit = rut_tit or der.titular.rut
            if not ubicacion:
                ubicacion = der.ubicacion
                codigo_ubic = ubicacion.codigo_completo

    # Generate unique correlative Folio and 128-bit cryptographic token (32 hex characters)
    year = date.today().year
    random_part = uuid.uuid4().hex[:6].upper()
    folio = f"CERT-{year}-{random_part}"
    token_128bit = secrets.token_hex(16)  # 128 bits = 32 hex chars

    # Generate PDF in memory & compute SHA-256
    pdf_bytes, sha256_hash, qr_base64 = generate_certificate_pdf(
        folio=folio,
        token_verificacion=token_128bit,
        tipo_certificado=req.tipo_certificado,
        cementerio_nombre=cementerio.nombre,
        codigo_ubicacion=codigo_ubic,
        fallecido_nombre=fallecido_name,
        rut_fallecido=rut_fall,
        titular_nombre=titular_name,
        rut_titular=rut_tit,
        fecha_emision=date.today(),
        observaciones=req.observaciones
    )

    cert = Certificado(
        folio=folio,
        token_verificacion=token_128bit,
        tipo_certificado=req.tipo_certificado.upper(),
        estado="VIGENTE",
        cementerio_id=cementerio.id,
        ubicacion_id=ubicacion.id if ubicacion else None,
        inhumacion_id=req.inhumacion_id,
        derecho_id=req.derecho_id,
        fallecido_nombre=fallecido_name,
        rut_fallecido=rut_fall,
        titular_nombre=titular_name,
        rut_titular=rut_tit,
        codigo_ubicacion=codigo_ubic,
        fecha_emision=date.today(),
        sha256_hash=sha256_hash,
        codigo_qr_base64=qr_base64,
        observaciones=req.observaciones
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)

    # Append-only audit logging
    AuditService.log_mutation(
        session=db,
        modulo="CERTIFICADOS",
        accion="EMITIR_CERTIFICADO",
        entidad="core.tb_certificado",
        registro_id=str(cert.id),
        payload_posterior={
            "folio": cert.folio,
            "tipo": cert.tipo_certificado,
            "sha256": cert.sha256_hash,
            "token": cert.token_verificacion
        },
        user_id=current_user.id if current_user else 1,
        username=current_user.username if current_user else "SISTEMA",
        user_rut=current_user.rut if current_user else "11111111-1",
        user_role=current_user.rol if current_user else "ADMINISTRADOR",
        commit=True
    )

    return {
        "success": True,
        "message": f"Certificado {folio} emitido con éxito.",
        "folio": cert.folio,
        "token_verificacion": cert.token_verificacion,
        "sha256_hash": cert.sha256_hash,
        "download_url": f"/api/v1/certificados/descargar/{cert.folio}",
        "verify_url": f"/verify/certificate/{cert.folio}"
    }


@router.get("/descargar/{folio}")
def descargar_certificado_pdf(folio: str, db: Session = Depends(get_db)):
    """Downloads the official PDF/A certificate file."""
    cert = db.query(Certificado).filter(Certificado.folio == folio.upper()).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    pdf_bytes, _, _ = generate_certificate_pdf(
        folio=cert.folio,
        token_verificacion=cert.token_verificacion,
        tipo_certificado=cert.tipo_certificado,
        cementerio_nombre=cert.cementerio.nombre if cert.cementerio else "San Carlos",
        codigo_ubicacion=cert.codigo_ubicacion or "N/A",
        fallecido_nombre=cert.fallecido_nombre,
        rut_fallecido=cert.rut_fallecido,
        titular_nombre=cert.titular_nombre,
        rut_titular=cert.rut_titular,
        fecha_emision=cert.fecha_emision,
        fecha_vencimiento=cert.fecha_vencimiento,
        autoridad_emisora=cert.autoridad_emisora,
        funcionario_emisor=cert.funcionario_emisor,
        observaciones=cert.observaciones
    )

    headers = {
        "Content-Disposition": f'attachment; filename="{cert.folio}.pdf"',
        "X-Certificate-SHA256": cert.sha256_hash
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/publico/{folio_or_token}", response_model=CertificadoPublicoResponse)
def verificar_certificado_publico(folio_or_token: str, db: Session = Depends(get_db)):
    """
    Public citizen verification portal (Ley 21.719).
    Never exposes medical cause of death or personal contact numbers.
    """
    param = folio_or_token.strip()
    cert = db.query(Certificado).filter(
        (Certificado.folio == param.upper()) | (Certificado.token_verificacion == param.lower())
    ).first()

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="Certificado no encontrado en el Registro Municipal. Verifique el folio o código QR."
        )

    return cert.to_public_dict()
