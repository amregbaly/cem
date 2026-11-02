#!/usr/bin/env python3
"""
Maintenance script to scan and upgrade all certificates in PostgreSQL or SQLite,
regenerating any PDF, SHA-256 seal, and QR code that was generated with a localhost URL.
Uses the production verification domain: https://munisancarlosdemo.voxera.net/verify/certificate
"""
import os
import sys
import base64
from datetime import date

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.infrastructure.db.session import SessionLocal
from app.domain.models import Certificado, Cementerio
from app.infrastructure.services.pdf_generator import generate_certificate_pdf
from app.core.config import settings


def upgrade_certificates():
    print(f"[*] Target verification base URL: {settings.VERIFY_BASE_URL}")
    db = SessionLocal()
    try:
        certs = db.query(Certificado).all()
        print(f"[*] Found {len(certs)} certificates in database.")
        upgraded_count = 0

        for cert in certs:
            has_localhost = False
            if cert.pdf_bytes:
                try:
                    raw = base64.b64decode(cert.pdf_bytes)
                    if b"localhost" in raw:
                        has_localhost = True
                except Exception:
                    has_localhost = True
            else:
                has_localhost = True

            if has_localhost:
                print(f"[*] Upgrading certificate folio: {cert.folio}...")
                pdf_bytes, sha256_hash, qr_base64 = generate_certificate_pdf(
                    folio=cert.folio,
                    token_verificacion=cert.token_verificacion,
                    tipo_certificado=cert.tipo_certificado,
                    cementerio_nombre=cert.cementerio.nombre if cert.cementerio else "San Carlos",
                    codigo_ubicacion=cert.codigo_ubicacion or "N/A",
                    fallecido_nombre=cert.fallecido_nombre,
                    rut_fallecido=cert.rut_fallecido,
                    titular_nombre=cert.titular_nombre,
                    rut_titular=cert.rut_titular,
                    fecha_emision=cert.fecha_emision or date.today(),
                    fecha_vencimiento=cert.fecha_vencimiento,
                    autoridad_emisora=cert.autoridad_emisora,
                    funcionario_emisor=cert.funcionario_emisor,
                    observaciones=cert.observaciones
                )
                cert.pdf_bytes = base64.b64encode(pdf_bytes).decode("ascii")
                cert.sha256_hash = sha256_hash
                cert.codigo_qr_base64 = qr_base64
                upgraded_count += 1

        if upgraded_count > 0:
            db.commit()
            print(f"[OK] Successfully upgraded {upgraded_count} certificates with https://munisancarlosdemo.voxera.net!")
        else:
            print("[OK] All certificates are already using the production verification domain.")

    finally:
        db.close()


if __name__ == "__main__":
    upgrade_certificates()
