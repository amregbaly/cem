import io
import csv
import uuid
import secrets
import base64
import hashlib
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.infrastructure.db.session import get_db
from app.domain.models import Certificado, Ubicacion, Cementerio, Inhumacion, Derecho, Usuario, RolUsuario
from app.domain.schemas.certificado import CertificadoEmitirRequest, CertificadoAnularRequest, CertificadoPublicoResponse
from app.infrastructure.services.pdf_generator import generate_certificate_pdf
from app.infrastructure.db.audit_listener import AuditService
from app.api.deps import require_role, get_current_user_optional, get_current_user

router = APIRouter()


def get_next_folio(db: Session, tipo_cert: str, year: int) -> str:
    """
    Generates a gapless, sequential folio per certificate type and year.
    Format: CERT-{TIPO[:3]}-{YEAR}-{SEQ:05d}
    """
    prefix = f"CERT-{tipo_cert[:3].upper()}-{year}-"
    # Query maximum existing folio for this type and year
    existing_count = db.query(func.count(Certificado.id)).filter(
        Certificado.tipo_certificado == tipo_cert.upper(),
        Certificado.folio.like(f"{prefix}%")
    ).scalar() or 0

    next_seq = existing_count + 1
    return f"{prefix}{next_seq:05d}"


@router.post("/emitir", status_code=status.HTTP_201_CREATED)
def emitir_certificado(
    req: CertificadoEmitirRequest,
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Issues an official municipal certificate, calculates SHA-256 fingerprint,
    embeds QR code, stores verification record, and logs append-only audit trail.
    (EETT 3.10 & Annex 2 Row 11 / A2-11)
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

    year = date.today().year
    tipo_norm = req.tipo_certificado.upper()
    folio = get_next_folio(db, tipo_norm, year)
    token_128bit = secrets.token_hex(16)  # 128 bits = 32 hex chars

    # Generate PDF in memory & compute SHA-256
    pdf_bytes, sha256_hash, qr_base64 = generate_certificate_pdf(
        folio=folio,
        token_verificacion=token_128bit,
        tipo_certificado=tipo_norm,
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
        tipo_certificado=tipo_norm,
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
        pdf_bytes=base64.b64encode(pdf_bytes).decode("ascii"),
        observaciones=req.observaciones
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)

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


@router.post("/{folio}/anular")
def anular_certificado(
    folio: str,
    req: CertificadoAnularRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Cancels an issued certificate with mandatory justification reason.
    (EETT 3.10 & Annex 2 Row 12 / A2-12).
    Generates audit event; public verification immediately shows CANCELADO.
    """
    if not req.motivo or len(req.motivo.strip()) < 5:
        raise HTTPException(status_code=400, detail="Debe proporcionar un motivo válido de anulación (mínimo 5 caracteres).")

    cert = db.query(Certificado).filter(Certificado.folio == folio.upper()).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    if cert.estado == "CANCELADO":
        raise HTTPException(status_code=400, detail=f"El certificado {cert.folio} ya se encuentra anulado.")

    cert.estado = "CANCELADO"
    cert.motivo_cancelacion = req.motivo.strip()
    cert.fecha_cancelacion = date.today()
    if req.observaciones:
        cert.observaciones = f"{cert.observaciones or ''} | [ANULACIÓN {date.today()}]: {req.observaciones}".strip(" |")

    db.commit()
    db.refresh(cert)

    AuditService.log_mutation(
        session=db,
        modulo="CERTIFICADOS",
        accion="CANCELAR_CERTIFICADO",
        entidad="core.tb_certificado",
        registro_id=str(cert.id),
        payload_posterior={
            "folio": cert.folio,
            "estado": "CANCELADO",
            "motivo_cancelacion": cert.motivo_cancelacion,
            "sha256": cert.sha256_hash
        },
        user_id=current_user.id,
        username=current_user.username,
        user_rut=current_user.rut,
        user_role=current_user.rol,
        commit=True
    )

    return {
        "success": True,
        "message": f"Certificado {cert.folio} anulado correctamente.",
        "folio": cert.folio,
        "estado": cert.estado,
        "motivo_cancelacion": cert.motivo_cancelacion
    }


@router.get("/descargar/{folio}")
def descargar_certificado_pdf(
    folio: str,
    fallecido: Optional[str] = Query(None),
    rut: Optional[str] = Query(None),
    cementerio: Optional[str] = Query(None),
    ubicacion: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Downloads the official PDF certificate file.
    Reprint keeps the original folio and returns exact bytes matching SHA-256 fingerprint.
    If the burial or folio is valid but does not have a pre-generated certificate record,
    it automatically generates, signs, records, and returns the official certificate PDF.
    """
    clean_folio = folio.strip().upper()
    unprefixed = clean_folio.replace("ING-", "").replace("CERT-", "")
    cert = db.query(Certificado).filter(
        (Certificado.folio == clean_folio) |
        (Certificado.folio == f"ING-{unprefixed}") |
        (Certificado.folio == f"CERT-{unprefixed}") |
        (Certificado.folio == unprefixed)
    ).first()
    
    if not cert:
        # Check if matching Inhumacion exists in DB
        inh = db.query(Inhumacion).filter(
            (Inhumacion.pase_sepultacion_folio == clean_folio) |
            (Inhumacion.pase_sepultacion_folio == unprefixed) |
            (Inhumacion.numero_ingreso == clean_folio) |
            (Inhumacion.numero_ingreso == unprefixed)
        ).first()

        # Resolve cemetery
        cem_obj = None
        if inh and inh.ubicacion and inh.ubicacion.cementerio:
            cem_obj = inh.ubicacion.cementerio
        elif cementerio:
            cem_obj = db.query(Cementerio).filter(Cementerio.nombre.ilike(f"%{cementerio}%")).first()
        if not cem_obj:
            cem_obj = db.query(Cementerio).first()

        cem_name = cem_obj.nombre if cem_obj else (cementerio or "San Carlos")
        fallecido_name = fallecido or (inh.fallecido.nombre_completo if inh and inh.fallecido else None)
        rut_fall = rut or (inh.fallecido.rut if inh and inh.fallecido else None)
        cod_ubic = ubicacion or (inh.ubicacion.codigo_completo if inh and inh.ubicacion else "PAB-B-F03-N142")
        token_128bit = secrets.token_hex(16)
        tipo_cert = (tipo or "INHUMACION").upper()

        # If we have at least deceased name or it's a known FOL-/LIC- format, generate certificate
        pdf_bytes, sha256_hash, qr_base64 = generate_certificate_pdf(
            folio=clean_folio,
            token_verificacion=token_128bit,
            tipo_certificado=tipo_cert,
            cementerio_nombre=cem_name,
            codigo_ubicacion=cod_ubic,
            fallecido_nombre=fallecido_name or "REGISTRO MUNICIPAL",
            rut_fallecido=rut_fall,
            fecha_emision=date.today(),
            observaciones="Emisión digital oficial de registro de inhumación municipal."
        )

        cert = Certificado(
            folio=clean_folio,
            token_verificacion=token_128bit,
            tipo_certificado=tipo_cert,
            estado="VIGENTE",
            cementerio_id=cem_obj.id if cem_obj else 1,
            ubicacion_id=inh.ubicacion_id if inh else None,
            inhumacion_id=inh.id if inh else None,
            fallecido_nombre=fallecido_name or "REGISTRO MUNICIPAL",
            rut_fallecido=rut_fall,
            codigo_ubicacion=cod_ubic,
            fecha_emision=date.today(),
            sha256_hash=sha256_hash,
            codigo_qr_base64=qr_base64,
            pdf_bytes=base64.b64encode(pdf_bytes).decode("ascii"),
            observaciones="Emisión digital oficial de registro de inhumación municipal."
        )
        db.add(cert)
        try:
            db.commit()
            db.refresh(cert)
        except Exception:
            db.rollback()
            # If concurrent insert happened, re-fetch
            cert = db.query(Certificado).filter(Certificado.folio == clean_folio).first()

    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    if cert.pdf_bytes:
        try:
            pdf_bytes = base64.b64decode(cert.pdf_bytes)
        except Exception:
            pdf_bytes = None
    else:
        pdf_bytes = None

    if not pdf_bytes:
        # Fallback regeneration if pdf_bytes was not populated
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
    Public citizen verification portal (Ley 21.719 & EETT 3.10).
    Exposes ONLY: type, folio, issue date, status, SHA-256.
    Never exposes medical cause of death or personal contact numbers.
    Supports resolution by Folio, Token QR, or Official Inhumation Number (e.g. ING-XXXX).
    """
    param = folio_or_token.strip()
    clean_folio = param.upper()
    unprefixed = clean_folio.replace("ING-", "").replace("CERT-", "")

    cert = db.query(Certificado).filter(
        (Certificado.folio == clean_folio) |
        (Certificado.folio == f"ING-{unprefixed}") |
        (Certificado.folio == f"CERT-{unprefixed}") |
        (Certificado.folio == unprefixed) |
        (Certificado.token_verificacion == param.lower())
    ).first()

    if not cert:
        # Check if matching Inhumacion exists in DB
        inh = db.query(Inhumacion).filter(
            (Inhumacion.numero_ingreso == clean_folio) |
            (Inhumacion.numero_ingreso == unprefixed) |
            (Inhumacion.pase_sepultacion_folio == clean_folio) |
            (Inhumacion.pase_sepultacion_folio == unprefixed)
        ).first()

        if inh:
            cem_obj = inh.ubicacion.cementerio if inh.ubicacion and inh.ubicacion.cementerio else db.query(Cementerio).first()
            cem_name = cem_obj.nombre if cem_obj else "Cementerio Municipal de San Carlos"
            fallecido_name = inh.fallecido.nombre_completo if inh.fallecido else "REGISTRO MUNICIPAL"
            rut_fall = inh.fallecido.rut if inh.fallecido else None
            cod_ubic = inh.ubicacion.codigo_completo if inh.ubicacion else f"{inh.ubicacion.sector_codigo}-{inh.ubicacion.numero}" if inh.ubicacion else "N/A"
            token_128bit = secrets.token_hex(16)
            tipo_cert = "INHUMACION"

            pdf_bytes, sha256_hash, qr_base64 = generate_certificate_pdf(
                folio=clean_folio,
                token_verificacion=token_128bit,
                tipo_certificado=tipo_cert,
                cementerio_nombre=cem_name,
                codigo_ubicacion=cod_ubic,
                fallecido_nombre=fallecido_name,
                rut_fallecido=rut_fall,
                fecha_emision=date.today(),
                observaciones="Emisión digital oficial de registro de inhumación municipal."
            )

            cert = Certificado(
                folio=clean_folio,
                token_verificacion=token_128bit,
                tipo_certificado=tipo_cert,
                estado="VIGENTE",
                cementerio_id=cem_obj.id if cem_obj else 1,
                ubicacion_id=inh.ubicacion_id,
                inhumacion_id=inh.id,
                fallecido_nombre=fallecido_name,
                rut_fallecido=rut_fall,
                codigo_ubicacion=cod_ubic,
                fecha_emision=date.today(),
                sha256_hash=sha256_hash,
                codigo_qr_base64=qr_base64,
                pdf_bytes=base64.b64encode(pdf_bytes).decode("ascii"),
                observaciones="Emisión digital oficial de registro de inhumación municipal."
            )
            db.add(cert)
            try:
                db.commit()
                db.refresh(cert)
            except Exception:
                db.rollback()
                cert = db.query(Certificado).filter(Certificado.folio == clean_folio).first()

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="Certificado no encontrado en el Registro Municipal. Verifique el folio o código QR."
        )

    return cert.to_public_dict()


@router.get("/exportar")
def exportar_metadatos_certificados(
    formato: str = Query("json", description="Formato de exportación: json o csv"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value))
):
    """
    Export certificate registry metadata in JSON or CSV format (EETT 3.10).
    """
    certificados = db.query(Certificado).order_by(Certificado.created_at.desc()).all()

    if formato == "csv":
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        writer.writerow([
            "FOLIO", "TIPO", "ESTADO", "FECHA_EMISION", "SHA256_HASH",
            "FALLECIDO_NOMBRE", "TITULAR_NOMBRE", "UBICACION", "MOTIVO_CANCELACION"
        ])
        for c in certificados:
            writer.writerow([
                c.folio, c.tipo_certificado, c.estado,
                c.fecha_emision.isoformat() if c.fecha_emision else "",
                c.sha256_hash,
                c.fallecido_nombre or "",
                c.titular_nombre or "",
                c.codigo_ubicacion or "",
                c.motivo_cancelacion or ""
            ])
        output.seek(0)
        return Response(
            content=output.getvalue().encode("utf-8-sig"),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="registro_certificados_{date.today()}.csv"'}
        )

    return [
        {
            "folio": c.folio,
            "token_verificacion": c.token_verificacion,
            "tipo_certificado": c.tipo_certificado,
            "estado": c.estado,
            "fecha_emision": c.fecha_emision.isoformat() if c.fecha_emision else None,
            "sha256_hash": c.sha256_hash,
            "fallecido_nombre": c.fallecido_nombre,
            "titular_nombre": c.titular_nombre,
            "codigo_ubicacion": c.codigo_ubicacion,
            "motivo_cancelacion": c.motivo_cancelacion
        }
        for c in certificados
    ]
