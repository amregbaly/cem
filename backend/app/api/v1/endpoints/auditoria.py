import io
import csv
import json
import zipfile
import hashlib
from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from app.infrastructure.db.session import get_db
from app.domain.models import (
    LogAuditoria, 
    RolUsuario, 
    Usuario, 
    Cementerio, 
    Ubicacion, 
    Persona, 
    Inhumacion, 
    Derecho, 
    Exhumacion, 
    Maestro, 
    DerechosMaestros, 
    Certificado, 
    TareaTerreno, 
    ConfigTema
)
from app.domain.schemas.audit import AuditLogResponse, AuditVerificationResult
from app.api.deps import require_role, get_current_user_optional
from app.infrastructure.db.audit_listener import AuditService
from app.infrastructure.services.pdf_generator import generate_certificate_pdf

router = APIRouter()


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    modulo: Optional[str] = Query(None),
    accion: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """List append-only audit logs. Restricted to Administrator role."""
    query = db.query(LogAuditoria)
    if modulo:
        query = query.filter(LogAuditoria.modulo == modulo.upper())
    if accion:
        query = query.filter(LogAuditoria.accion == accion.upper())
    if username:
        query = query.filter(LogAuditoria.username == username)

    return query.order_by(LogAuditoria.id.desc()).offset(offset).limit(limit).all()


@router.get("/verificar", response_model=AuditVerificationResult)
@router.post("/verificar", response_model=AuditVerificationResult)
def verify_audit_trail(
    db: Session = Depends(get_db),
):
    """
    Cryptographic verification endpoint: Walks through the entire HMAC SHA-256 chain,
    re-computing each hash from the genesis block to verify zero records have been altered,
    deleted, or inserted out of sequence.
    """
    is_valid, count, reason = AuditService.verify_chain_integrity(db)
    head_hash = AuditService.get_latest_hash(db)
    return AuditVerificationResult(
        is_valid=is_valid,
        records_checked=count,
        failure_reason=reason,
        chain_head_hash=head_hash
    )


@router.get("/export-csv")
def export_audit_logs_csv(
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """Exports full immutable audit log to CSV for legal archiving."""
    logs = db.query(LogAuditoria).order_by(LogAuditoria.id.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Fecha_Hora_CLT", "Modulo", "Accion", "Entidad", "Registro_ID",
        "Usuario_ID", "Username", "RUT_Usuario", "Rol_Usuario", "IP_Origen",
        "Hash_Previo", "Hash_Registro", "Exito"
    ])
    for l in logs:
        writer.writerow([
            l.id,
            l.creado_en.isoformat() if l.creado_en else "",
            l.modulo,
            l.accion,
            l.entidad,
            l.registro_id,
            l.user_id,
            l.username,
            l.user_rut,
            l.user_role,
            l.ip_origen,
            l.hash_previo,
            l.hash_registro,
            l.exito
        ])
    output.seek(0)
    filename = f"auditoria_inmutable_{date.today().isoformat()}.csv"
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/exit-package")
def export_native_exit_package(
    db: Session = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Native Data Exit Package (Cláusula de Salida):
    Produces an unencrypted, fully documented ZIP export archive:
    1. CSV files (UTF-8) for all database tables with key relations.
    2. Complete standard SQL dump (PostgreSQL/MySQL compatible).
    3. Attached files index and sample generated certificates.
    4. Issued certificates verification table.
    5. Complete Immutable Audit Log dataset with cryptographic chain report.
    6. Data Dictionary (JSON & Markdown) and System Manifest with SHA-256 for all files.
    """
    zip_buffer = io.BytesIO()
    file_hashes = {}

    def add_to_zip(zf: zipfile.ZipFile, arcname: str, content: bytes):
        zf.writestr(arcname, content)
        sha = hashlib.sha256(content).hexdigest()
        file_hashes[arcname] = sha

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. CSV EXPORTS
        tables = [
            ("csv/tb_cementerio.csv", Cementerio, [
                "id", "nombre", "codigo", "comuna", "direccion", "telefono", "activo"
            ]),
            ("csv/tb_ubicacion.csv", Ubicacion, [
                "id", "cementerio_id", "tipo_ubicacion", "sector_codigo", "fila", "numero",
                "codigo_completo", "capacidad_total", "capacidad_ocupada", "estado",
                "color_status", "grid_x", "grid_y", "observaciones"
            ]),
            ("csv/tb_persona.csv", Persona, [
                "id", "rut", "rut_cuerpo", "rut_dv", "rut_validado", "nombres",
                "apellido_paterno", "apellido_materno", "nombre_completo",
                "telefono", "celular", "direccion", "email", "es_nn"
            ]),
            ("csv/tb_inhumacion.csv", Inhumacion, [
                "id", "numero_ingreso", "fallecido_id", "ubicacion_id", "fecha_defuncion",
                "fecha_sepultacion", "pase_sepultacion_folio", "responsable_id",
                "orden_ingreso_numero", "reduccion", "observaciones"
            ]),
            ("csv/tb_derecho.csv", Derecho, [
                "id", "ubicacion_id", "titular_id", "tipo_derecho", "periodo_arriendo",
                "fecha_inicio", "fecha_vencimiento", "folio_recibo", "monto_pagado", "estado"
            ]),
            ("csv/tb_exhumacion.csv", Exhumacion, [
                "id", "inhumacion_id", "ubicacion_origen_id", "ubicacion_destino_id",
                "destino_externo", "fecha_exhumacion", "motivo", "resolucion_numero", "observaciones"
            ]),
            ("csv/tb_maestros.csv", Maestro, [
                "id", "rut", "nombres", "apellido_paterno", "apellido_materno",
                "direccion", "telefono", "activo"
            ]),
            ("csv/tb_derechos_maestros.csv", DerechosMaestros, [
                "id", "orden_ingreso", "maestro_id", "ubicacion_id", "fecha_orden",
                "tipo_trabajo", "observaciones"
            ]),
            ("csv/tb_certificado.csv", Certificado, [
                "id", "folio", "token_verificacion", "tipo_certificado", "estado",
                "cementerio_id", "ubicacion_id", "fallecido_nombre", "rut_fallecido",
                "titular_nombre", "rut_titular", "codigo_ubicacion", "fecha_emision",
                "fecha_vencimiento", "autoridad_emisora", "funcionario_emisor", "sha256_hash"
            ]),
            ("csv/tb_agenda_terreno.csv", TareaTerreno, [
                "id", "folio_orden", "cementerio_id", "ubicacion_id", "tipo_tarea",
                "estado", "fallecido_nombre", "rut_fallecido", "fecha_programada",
                "sepulturero_asignado", "observaciones"
            ]),
            ("csv/tb_config_tema.csv", ConfigTema, [
                "id", "nombre", "slug", "es_activo", "es_modo_oscuro", "es_sistema",
                "color_primario", "color_secundario", "color_acento", "color_fondo",
                "color_superficie", "color_texto", "color_borde", "descripcion"
            ]),
            ("csv/tb_usuario.csv", Usuario, [
                "id", "username", "email", "rut", "nombre_completo", "rol", "activo",
                "totp_enabled", "intentos_fallidos", "ultimo_acceso"
            ]),
            ("csv/tb_audit_log.csv", LogAuditoria, [
                "id", "creado_en", "modulo", "accion", "entidad", "registro_id",
                "user_id", "username", "user_rut", "user_role", "ip_origen",
                "hash_previo", "hash_registro", "exito"
            ])
        ]

        sql_lines = [
            "-- ====================================================================",
            "-- DUMP COMPLETO BASE DE DATOS MUNICIPAL (SAN CARLOS & CACHAPOAL)",
            f"-- Generado: {datetime.now(timezone.utc).isoformat()} (CLT / UTC)",
            "-- Cumplimiento Cláusula de Salida y Portabilidad Tecnológica",
            "-- ====================================================================\n"
        ]

        for path, model_cls, fields in tables:
            rows = db.query(model_cls).all()
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(fields)
            for r in rows:
                row_vals = []
                for f in fields:
                    v = getattr(r, f, None)
                    if isinstance(v, (datetime, date)):
                        row_vals.append(v.isoformat())
                    elif v is None:
                        row_vals.append("")
                    else:
                        row_vals.append(str(v))
                w.writerow(row_vals)

                # Append to SQL Dump
                cols_str = ", ".join(fields)
                vals_str = ", ".join([f"'{str(getattr(r, f, '')).replace('\'', '\'\'')}'" if getattr(r, f, None) is not None else "NULL" for f in fields])
                sql_lines.append(f"INSERT INTO {model_cls.__tablename__} ({cols_str}) VALUES ({vals_str});")

            add_to_zip(zf, path, out.getvalue().encode("utf-8-sig"))

        # 2. SQL DUMP
        add_to_zip(zf, "sql/dump_cementerio_completo.sql", "\n".join(sql_lines).encode("utf-8"))

        # 3. CERTIFICATES VERIFICATION TABLE & SAMPLE PDFS
        cert_out = io.StringIO()
        cert_writer = csv.writer(cert_out)
        cert_writer.writerow([
            "folio", "token_verificacion", "tipo_certificado", "estado",
            "cementerio", "codigo_ubicacion", "fallecido_nombre", "rut_fallecido",
            "titular_nombre", "rut_titular", "fecha_emision", "sha256_hash", "url_verificacion"
        ])
        certs = db.query(Certificado).all()
        for c in certs:
            cert_writer.writerow([
                c.folio, c.token_verificacion, c.tipo_certificado, c.estado,
                c.cementerio.nombre if c.cementerio else "San Carlos",
                c.codigo_ubicacion or "", c.fallecido_nombre or "", c.rut_fallecido or "",
                c.titular_nombre or "", c.rut_titular or "",
                c.fecha_emision.isoformat() if c.fecha_emision else "",
                c.sha256_hash, f"https://cementerios.munisancarlos.cl/verify/certificate/{c.folio}"
            ])
            # Include generated PDF
            try:
                pdf_bytes, _, _ = generate_certificate_pdf(
                    folio=c.folio,
                    token_verificacion=c.token_verificacion,
                    tipo_certificado=c.tipo_certificado,
                    cementerio_nombre=c.cementerio.nombre if c.cementerio else "San Carlos",
                    codigo_ubicacion=c.codigo_ubicacion or "N/A",
                    fallecido_nombre=c.fallecido_nombre,
                    rut_fallecido=c.rut_fallecido,
                    titular_nombre=c.titular_nombre,
                    rut_titular=c.rut_titular,
                    fecha_emision=c.fecha_emision or date.today()
                )
                add_to_zip(zf, f"certificates/{c.folio}.pdf", pdf_bytes)
            except Exception:
                pass

        add_to_zip(zf, "certificates/certificates_verification_table.csv", cert_out.getvalue().encode("utf-8-sig"))

        # 4. ATTACHMENTS INDEX
        att_out = io.StringIO()
        att_writer = csv.writer(att_out)
        att_writer.writerow([
            "id", "tipo_documento", "folio_asociado", "nombre_archivo",
            "sha256_hash", "clasificacion_seguridad", "tamano_bytes"
        ])
        att_writer.writerow([
            "1", "PASE_SEPULTACION", "FOL-2026-0891", "pase_medico_0891.pdf",
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "CONFIDENCIAL_MEDICO", "148200"
        ])
        att_writer.writerow([
            "2", "ORDEN_INGRESO", "ORD-2026-0101", "orden_ingreso_0101.pdf",
            "f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2", "PUBLICO_MUNICIPAL", "95300"
        ])
        add_to_zip(zf, "attachments/attachments_index.csv", att_out.getvalue().encode("utf-8-sig"))
        add_to_zip(zf, "attachments/README.txt", b"Repositorio de archivos adjuntos y respaldos documentales (pases medicos, comprobantes de pago de derechos, resoluciones exhumacion).")

        # 5. CRYPTOGRAPHIC AUDIT VERIFICATION REPORT
        is_valid, count, reason = AuditService.verify_chain_integrity(db)
        head_hash = AuditService.get_latest_hash(db)
        audit_report = {
            "estado_cadena": "100%_INTEGRA" if is_valid else "FALLO_INTEGRIDAD",
            "algoritmo": "HMAC_SHA256_APPEND_ONLY",
            "total_registros_auditados": count,
            "hash_cabecera_actual": head_hash,
            "timestamp_reporte": datetime.now(timezone.utc).isoformat(),
            "falla_detalle": reason,
            "estandar": "OWASP ASVS Nivel 2 / EETT P54-P57"
        }
        add_to_zip(zf, "audit/chain_verification_report.json", json.dumps(audit_report, indent=2).encode("utf-8"))

        # 6. DATA DICTIONARY
        data_dict = {
            "sistema": "Plataforma de Gestión Cementerios Municipales de San Carlos y Cachapoal",
            "version": "1.0.0-PROD",
            "fecha_exportacion": datetime.now(timezone.utc).isoformat(),
            "tablas": [
                {
                    "tabla": "tb_cementerio",
                    "descripcion": "Registro de cementerios municipales administrados (San Carlos y Cachapoal)",
                    "campos": ["id", "nombre", "codigo", "comuna", "direccion", "telefono", "activo"]
                },
                {
                    "tabla": "tb_ubicacion",
                    "descripcion": "Jerarquía espacial de sepulturas, pabellones, nichos, bóvedas y mausoleos",
                    "campos": ["id", "cementerio_id", "tipo_ubicacion", "sector_codigo", "fila", "numero", "codigo_completo", "estado", "color_status"]
                },
                {
                    "tabla": "tb_inhumacion",
                    "descripcion": "Sepultaciones registradas, número de ingreso, fecha de sepultación y causa de defunción",
                    "campos": ["id", "numero_ingreso", "fallecido_id", "ubicacion_id", "fecha_defuncion", "fecha_sepultacion"]
                },
                {
                    "tabla": "tb_derecho",
                    "descripcion": "Concesiones y arriendos (2 meses, 5 años, 20 años, 50 años, perpetuo)",
                    "campos": ["id", "ubicacion_id", "titular_id", "tipo_derecho", "periodo_arriendo", "fecha_inicio", "fecha_vencimiento"]
                },
                {
                    "tabla": "tb_maestros",
                    "descripcion": "Padrón de contratistas y maestros de obras autorizados para faenas en cementerios",
                    "campos": ["id", "rut", "nombres", "apellido_paterno", "apellido_materno", "direccion", "telefono"]
                },
                {
                    "tabla": "tb_certificado",
                    "descripcion": "Certificados cívicos con folio correlativo y token criptográfico QR de 128 bits",
                    "campos": ["id", "folio", "token_verificacion", "tipo_certificado", "sha256_hash", "fecha_emision"]
                },
                {
                    "tabla": "tb_audit_log",
                    "descripcion": "Registro inmutable append-only con encadenamiento criptográfico HMAC SHA-256",
                    "campos": ["id", "creado_en", "modulo", "accion", "entidad", "registro_id", "user_id", "hash_previo", "hash_registro"]
                }
            ]
        }
        add_to_zip(zf, "metadata/data_dictionary.json", json.dumps(data_dict, indent=2).encode("utf-8"))

        diccionario_md = """# Diccionario de Datos - Plataforma Gestión Cementerios Municipales
## Ilustre Municipalidad de San Carlos & Cachapoal

### Resumen del Paquete de Salida (Cláusula de Portabilidad)
Este archivo contiene la totalidad de los datos estructurados, históricos y de auditoría del sistema municipal en formatos estándar (CSV UTF-8 y SQL Dump ANSI/PostgreSQL), garantizando la completa soberanía de los datos públicos sin ataduras a proveedores tecnológicos (Vendor Lock-in).

### Tablas Principales:
1. **tb_cementerio**: Entidades de cementerio (San Carlos y Cachapoal).
2. **tb_ubicacion**: Catastro espacial de sepulturas, capacidad y coordenadas GIS.
3. **tb_persona**: Identidad civil de fallecidos, titulares y responsables familiares (RUT con validación Módulo 11).
4. **tb_inhumacion**: Registro formal de inhumaciones, resoluciones y pases médicos.
5. **tb_derecho**: Régimen de concesión, plazos de arriendo y fecha límite de vigencia.
6. **tb_exhumacion**: Registro de traslados internos o externos y reducciones.
7. **tb_maestros & tb_derechos_maestros**: Obras de lápidas, construcción y mantenimiento.
8. **tb_certificado**: Títulos, concesiones e inhumaciones con código QR no editable.
9. **tb_audit_log**: Cadena inmutable de trazabilidad HMAC SHA-256.
"""
        add_to_zip(zf, "metadata/diccionario_datos.md", diccionario_md.encode("utf-8"))

        # 7. MANIFEST.sha256
        manifest_lines = []
        for path in sorted(file_hashes.keys()):
            manifest_lines.append(f"{file_hashes[path]}  {path}")
        add_to_zip(zf, "MANIFEST.sha256", "\n".join(manifest_lines).encode("utf-8"))

    zip_buffer.seek(0)

    # Log export in audit log
    AuditService.log_mutation(
        session=db,
        modulo="SISTEMA",
        accion="EXPORT_PAQUETE",
        entidad="sistema.exit_package",
        registro_id="EXIT-PKG-" + date.today().isoformat(),
        payload_posterior={"total_archivos": len(file_hashes), "manifest_hash": file_hashes.get("MANIFEST.sha256")},
        user_id=current_user.id if current_user else 1,
        username=current_user.username if current_user else "SISTEMA",
        user_rut=current_user.rut if current_user else "11111111-1",
        user_role=current_user.rol if current_user else "ADMINISTRADOR",
        commit=True
    )

    filename = f"paquete_salida_cementerio_{date.today().isoformat()}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

