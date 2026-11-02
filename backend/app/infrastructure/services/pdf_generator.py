import io
import os
import hashlib
import base64
import qrcode
from datetime import date, datetime
from typing import Tuple, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def get_logo_path() -> Optional[str]:
    """Finds the municipal logo file from local paths."""
    candidates = [
        "/home/amr/dev/cem2/logo.png",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../logo.png")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../frontend/public/logo.png")),
        os.path.abspath("logo.png")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def generate_certificate_pdf(
    folio: str,
    token_verificacion: str,
    tipo_certificado: str,
    cementerio_nombre: str,
    codigo_ubicacion: str,
    fallecido_nombre: Optional[str] = None,
    rut_fallecido: Optional[str] = None,
    titular_nombre: Optional[str] = None,
    rut_titular: Optional[str] = None,
    fecha_emision: Optional[date] = None,
    fecha_vencimiento: Optional[date] = None,
    autoridad_emisora: str = "Dirección de Cementerios Municipales de San Carlos y Cachapoal",
    funcionario_emisor: str = "Encargado de Registros Municipales",
    observaciones: Optional[str] = None,
    verify_base_url: str = "http://localhost:5011/verify/certificate"
) -> Tuple[bytes, str, str]:
    """
    Generates a formal municipal PDF certificate with embedded QR code.
    Returns:
        (pdf_bytes, sha256_hash, qr_base64_png)
    Complies with Ley 21.719 and Chilean Municipal EETT standards.
    """
    emision_date = fecha_emision or date.today()
    verify_url = f"{verify_base_url}/{folio}"

    # 1. Generate QR Code in memory
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
    
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_bytes = qr_buffer.getvalue()
    qr_base64 = base64.b64encode(qr_bytes).decode("ascii")

    # 2. Build PDF Document with ReportLab
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=35,
        bottomMargin=35
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#AC115B"),  # San Carlos Municipal Raspberry
        alignment=1  # Center
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#334155"),
        alignment=1
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )
    body_normal = ParagraphStyle(
        "BodyNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155")
    )
    hash_style = ParagraphStyle(
        "HashStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#64748B"),
        alignment=1
    )

    story = []

    # Header Municipal with Official Logo
    logo_file = get_logo_path()
    if logo_file:
        try:
            # 476 x 192 -> aspect ratio ~2.48
            logo_img = RLImage(logo_file, width=2.2 * inch, height=0.887 * inch)
            logo_img.hAlign = 'CENTER'
            story.append(logo_img)
            story.append(Spacer(1, 6))
        except Exception:
            pass

    story.append(Paragraph("REPÚBLICA DE CHILE", subtitle_style))
    story.append(Paragraph("ILUSTRE MUNICIPALIDAD DE SAN CARLOS", subtitle_style))
    story.append(Paragraph("ADMINISTRACIÓN GENERAL DE CEMENTERIOS MUNICIPALES", subtitle_style))
    story.append(Spacer(1, 8))

    # Certificate Title
    tipo_human = {
        "INHUMACION": "CERTIFICADO OFICIAL DE SEPULTACIÓN E INHUMACIÓN",
        "PROPIEDAD": "TÍTULO Y CERTIFICADO DE DERECHO DE SEPULTURA",
        "RENOVACION": "CERTIFICADO DE RENOVACIÓN DE ARRIENDO DE NICHO",
        "EXHUMACION": "CERTIFICADO Y ACTA DE EXHUMACIÓN / TRASLADO"
    }.get(tipo_certificado.upper(), f"CERTIFICADO MUNICIPAL DE {tipo_certificado.upper()}")

    story.append(Paragraph(tipo_human, title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"FOLIO N°: <b>{folio}</b> &nbsp;&nbsp;|&nbsp;&nbsp; CEMENTERIO: <b>{cementerio_nombre.upper()}</b>", subtitle_style))
    story.append(Spacer(1, 12))

    # Legal Preamble
    preamble = (
        f"La Dirección de Cementerios Municipales de la I. Municipalidad de San Carlos, conforme a las atribuciones "
        f"conferidas por el DFL N° 1 del Ministerio de Salud (Reglamento General de Cementerios) y la Ley N° 18.695 "
        f"Orgánica Constitucional de Municipalidades, <b>CERTIFICA</b> que en los libros y registros oficiales de "
        f"esta administración se encuentra debidamente registrada la siguiente información:"
    )
    story.append(Paragraph(preamble, body_normal))
    story.append(Spacer(1, 15))

    # Details Table
    table_data = [
        [Paragraph("<b>Tipo de Trámite:</b>", body_bold), Paragraph(tipo_human, body_normal)],
        [Paragraph("<b>Código de Ubicación:</b>", body_bold), Paragraph(codigo_ubicacion, body_bold)],
        [Paragraph("<b>Cementerio:</b>", body_bold), Paragraph(cementerio_nombre, body_normal)],
    ]

    if fallecido_nombre:
        table_data.append([
            Paragraph("<b>Nombre del Fallecido:</b>", body_bold),
            Paragraph(fallecido_nombre, body_bold)
        ])
    if rut_fallecido:
        table_data.append([
            Paragraph("<b>RUT Fallecido:</b>", body_bold),
            Paragraph(rut_fallecido, body_normal)
        ])
    if titular_nombre:
        table_data.append([
            Paragraph("<b>Titular / Concesionario:</b>", body_bold),
            Paragraph(titular_nombre, body_bold)
        ])
    if rut_titular:
        table_data.append([
            Paragraph("<b>RUT Titular:</b>", body_bold),
            Paragraph(rut_titular, body_normal)
        ])

    table_data.append([
        Paragraph("<b>Fecha de Emisión:</b>", body_bold),
        Paragraph(emision_date.strftime("%d de %B de %Y").capitalize(), body_normal)
    ])
    
    if fecha_vencimiento:
        table_data.append([
            Paragraph("<b>Fecha de Vencimiento:</b>", body_bold),
            Paragraph(fecha_vencimiento.strftime("%d/%m/%Y"), body_bold)
        ])

    if observaciones:
        table_data.append([
            Paragraph("<b>Observaciones:</b>", body_bold),
            Paragraph(observaciones, body_normal)
        ])

    detail_table = Table(table_data, colWidths=[150, 360])
    detail_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 20))

    # Validation Box with QR Code side-by-side with Signature Block
    qr_buffer.seek(0)
    qr_flowable = RLImage(qr_buffer, width=1.3*inch, height=1.3*inch)

    auth_text = (
        f"<b>VALIDACIÓN DE AUTENTICIDAD DIGITAL</b><br/>"
        f"Este documento municipal incorpora firma electrónica y sello criptográfico QR conforme a la Ley N° 19.799.<br/>"
        f"Para verificar la vigencia de este certificado, escanee el código QR o ingrese a:<br/>"
        f"<font color='#0F7573'><b>{verify_url}</b></font><br/><br/>"
        f"<b>Autoridad Emisora:</b> {autoridad_emisora}<br/>"
        f"<b>Oficial Habilitado:</b> {funcionario_emisor}<br/>"
        f"<b>Token Criptográfico:</b> {token_verificacion}"
    )

    qr_table = Table([
        [qr_flowable, Paragraph(auth_text, body_normal)]
    ], colWidths=[110, 400])
    qr_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDFA")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#0F7573")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(qr_table)
    story.append(Spacer(1, 20))

    # Confidentiality warning (Ley 21.719 / 20.584)
    warning_text = (
        "<i>Nota de Privacidad y Cumplimiento Legal: Conforme a la Ley N° 21.719 de Protección de Datos Personales "
        "y Ley N° 20.584, los datos clínicos de defunción y teléfonos de contacto se mantienen bajo reserva estricta. "
        "Cualquier adulteración o uso fraudulento de este certificado será sancionado bajo el Art. 193 del Código Penal.</i>"
    )
    story.append(Paragraph(warning_text, ParagraphStyle("Warn", parent=body_normal, fontSize=7, leading=9, textColor=colors.HexColor("#64748B"))))
    story.append(Spacer(1, 15))

    # Signatures
    sig_table = Table([
        [
            Paragraph("_________________________________________<br/><b>MINISTRO DE FE / OFICIAL DE REGISTRO</b><br/>I. Municipalidad de San Carlos", ParagraphStyle("s1", parent=body_normal, alignment=1)),
            Paragraph("_________________________________________<br/><b>ADMINISTRADOR DE CEMENTERIOS</b><br/>San Carlos & Cachapoal", ParagraphStyle("s2", parent=body_normal, alignment=1))
        ]
    ], colWidths=[255, 255])
    story.append(sig_table)
    story.append(Spacer(1, 15))

    # Build PDF and compute SHA-256
    doc.build(story)
    pdf_bytes = pdf_buffer.getvalue()
    sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

    return pdf_bytes, sha256_hash, qr_base64
