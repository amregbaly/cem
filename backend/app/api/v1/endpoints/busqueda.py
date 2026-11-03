import re
import unicodedata
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.infrastructure.db.session import get_db
from app.domain.models import Inhumacion, Ubicacion, Persona, Usuario, RolUsuario, Exhumacion, ConfigPortal
from app.api.deps import get_current_user_optional
from etl.char_repair import repair_corrupted_characters

router = APIRouter()


def normalize_search_text(term: str) -> str:
    """
    Normalizes search query:
    - Strips accents/diacritics (é -> e, ü -> u)
    - Maps ñ -> n
    - Lowercases
    """
    if not term:
        return ""
    repaired, _, _ = repair_corrupted_characters(term)
    val = repaired or term
    nfkd = unicodedata.normalize("NFKD", val)
    clean = "".join(c for c in nfkd if not unicodedata.combining(c))
    return clean.lower().replace("ñ", "n").strip()


@router.get("/autocomplete")
def instant_search(
    q: str = Query(..., min_length=1, description="Search term for instant lookup (text >= 2 chars, digits >= 1)"),
    cementerio_id: Optional[int] = Query(None),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Sub-second bidirectional instant autocomplete search (EETT 3.12, 9 & A2-18, A2-19, A2-20, A2-21):
    1. By Deceased: Name, paternal/maternal surname (accent/ñ insensitive, e.g. Muñoz ≈ munoz ≈ MUÑOZ).
    2. RUT: With and without dots/hyphen.
    3. Exhumed/Transferred: Included with explicit status and current destination location.
    4. By Location: Sector, Row, Number with bidirectional list of all buried deceased persons.
    """
    raw_term = q.strip()
    if len(raw_term) == 0:
        return {"query": "", "total_results": 0, "results": []}

    is_digit = raw_term.replace("-", "").replace(".", "").isdigit()
    if not is_digit and len(raw_term) < 2:
        return {"query": raw_term, "total_results": 0, "results": []}

    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    if not is_staff:
        portal_cfg = db.query(ConfigPortal).first()
        if portal_cfg and not portal_cfg.permitir_busqueda_publica:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La búsqueda pública está deshabilitada por configuración de seguridad municipal."
            )

    norm_term = normalize_search_text(raw_term)
    rut_clean = re.sub(r"[^0-9kK]", "", raw_term).upper()

    search_raw = f"%{raw_term}%"
    search_norm = f"%{norm_term}%"
    items = []

    # 1. Search Inhumations (Deceased Name, RUT, Ingress Number, Death Date)
    inh_query = db.query(Inhumacion).join(Inhumacion.fallecido).join(Inhumacion.ubicacion)
    if cementerio_id:
        inh_query = inh_query.filter(Ubicacion.cementerio_id == cementerio_id)

    # Dialect-aware accent/ñ normalization
    is_sqlite = db.bind and "sqlite" in str(db.bind.url)
    if is_sqlite:
        filters = [
            Persona.nombre_completo.ilike(search_raw),
            Persona.apellido_paterno.ilike(search_raw),
            Persona.apellido_materno.ilike(search_raw),
            func.unaccent_sql(Persona.nombre_completo).like(search_norm),
            func.unaccent_sql(Persona.apellido_paterno).like(search_norm),
            func.unaccent_sql(Persona.apellido_materno).like(search_norm),
            Inhumacion.numero_ingreso.ilike(search_raw),
            Ubicacion.sector_codigo.ilike(search_raw),
            Ubicacion.numero.ilike(search_raw)
        ]
    else:
        filters = [
            Persona.nombre_completo.ilike(search_raw),
            Persona.apellido_paterno.ilike(search_raw),
            Persona.apellido_materno.ilike(search_raw),
            func.unaccent(func.lower(Persona.nombre_completo)).like(search_norm),
            Inhumacion.numero_ingreso.ilike(search_raw),
            Ubicacion.sector_codigo.ilike(search_raw),
            Ubicacion.numero.ilike(search_raw)
        ]

    if rut_clean and len(rut_clean) >= 1:
        filters.append(Persona.rut.ilike(f"%{rut_clean}%"))
        if len(rut_clean) >= 7:
            cuerpo = rut_clean[:-1]
            dv = rut_clean[-1]
            filters.append(Persona.rut.ilike(f"%{cuerpo}-{dv}%"))
            try:
                cuerpo_int = int(cuerpo)
                dotted = f"{cuerpo_int:,}".replace(",", ".") + f"-{dv}"
                filters.append(Persona.rut.ilike(f"%{dotted}%"))
            except ValueError:
                pass

    inh_results = inh_query.filter(or_(*filters)).limit(limit).all()

    for inh in inh_results:
        u = inh.ubicacion
        fall = inh.fallecido

        # Check movement history (A2-19: exhumed/transferred persons stay searchable with status and current location)
        exhumaciones = db.query(Exhumacion).filter(Exhumacion.inhumacion_id == inh.id).order_by(Exhumacion.fecha_exhumacion.desc()).all()
        if exhumaciones:
            latest_exh = exhumaciones[0]
            estado_movimiento = "EXHUMADO"
            ubicacion_actual_codigo = latest_exh.ubicacion_destino.codigo_completo if latest_exh.ubicacion_destino else (latest_exh.destino_externo or "Destino Externo")
            subtitulo = f"ESTADO: EXHUMADO/TRASLADADO | Ubicación actual: {ubicacion_actual_codigo} | Fecha: {latest_exh.fecha_exhumacion}"
        else:
            estado_movimiento = "SEPULTADO"
            ubicacion_actual_codigo = u.codigo_completo
            subtitulo = f"RUT: {fall.rut or 'Sin RUT'} | Sepultado: {inh.fecha_sepultacion} | N° Ingreso: {inh.numero_ingreso}"

        items.append({
            "tipo": "INHUMADO",
            "id": inh.id,
            "titulo": fall.nombre_completo,
            "subtitulo": subtitulo,
            "estado_movimiento": estado_movimiento,
            "ubicacion_actual": ubicacion_actual_codigo,
            "ubicacion_original": u.codigo_completo,
            "ubicacion": u.codigo_completo,
            "ubicacion_id": u.id,
            "cementerio_id": u.cementerio_id,
            "cementerio": u.cementerio.nombre,
            "sector_codigo": u.sector_codigo,
            "fila": u.fila,
            "numero": u.numero,
            "numero_ingreso": inh.numero_ingreso,
            "grid_x": u.grid_x,
            "grid_y": u.grid_y,
            "color_status": u.color_status,
            "fecha_defuncion": inh.fecha_defuncion.isoformat() if inh.fecha_defuncion else None,
            "fecha_sepultacion": inh.fecha_sepultacion.isoformat() if inh.fecha_sepultacion else None,
            "causa_fallecimiento": inh.causa_fallecimiento if is_staff else "[CONFIDENCIAL LEY 20.584]"
        })

    # 2. Search Locations directly (bidirectional lookup with all buried deceased)
    if len(items) < limit:
        remaining = limit - len(items)
        ubic_query = db.query(Ubicacion)
        if cementerio_id:
            ubic_query = ubic_query.filter(Ubicacion.cementerio_id == cementerio_id)

        loc_filters = [
            Ubicacion.sector_codigo.ilike(search_raw),
            Ubicacion.numero.ilike(search_raw),
            Ubicacion.fila.ilike(search_raw)
        ]

        ubic_results = ubic_query.filter(or_(*loc_filters)).limit(remaining).all()
        for u in ubic_results:
            # Skip duplicate if already returned via deceased
            if any(it.get("ubicacion_id") == u.id and it.get("tipo") == "INHUMADO" for it in items):
                continue

            titular = u.derechos[-1].titular.nombre_completo if u.derechos else None
            titular_str = (titular if is_staff else "[CONFIDENCIAL LEY 21.719]") if titular else "Sin titular activo"
            # Bidirectional deceased listing
            fallecidos_en_ubicacion = [inh.fallecido.nombre_completo for inh in u.inhumaciones]

            items.append({
                "tipo": "UBICACION",
                "id": u.id,
                "titulo": f"Sepultura {u.codigo_completo}",
                "subtitulo": f"Sector: {u.sector_codigo} | Estado: {u.estado} | {('Titular: ' + titular_str) if titular else 'Sin titular activo'}",
                "ubicacion": u.codigo_completo,
                "ubicacion_id": u.id,
                "cementerio_id": u.cementerio_id,
                "cementerio": u.cementerio.nombre,
                "sector_codigo": u.sector_codigo,
                "fila": u.fila,
                "numero": u.numero,
                "fallecidos_sepultados": fallecidos_en_ubicacion,
                "capacidad_total": u.capacidad_total,
                "capacidad_ocupada": u.capacidad_ocupada,
                "grid_x": u.grid_x,
                "grid_y": u.grid_y,
                "color_status": u.color_status
            })

    return {
        "query": raw_term,
        "total_results": len(items),
        "results": items[:limit]
    }
