import re
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.infrastructure.db.session import get_db
from app.domain.models import Inhumacion, Ubicacion, Persona, Usuario, RolUsuario
from app.api.deps import get_current_user_optional
from etl.char_repair import repair_corrupted_characters

router = APIRouter()


def clean_query_term(term: str) -> str:
    """Repairs corrupt chars (? -> Ñ) and normalizes search term."""
    repaired, _, _ = repair_corrupted_characters(term)
    return repaired or term


@router.get("/autocomplete")
def instant_search(
    q: str = Query(..., min_length=1, description="Search term for instant lookup (text >= 2 chars, digits >= 1)"),
    cementerio_id: Optional[int] = Query(None),
    limit: int = Query(15, le=50),
    db: Session = Depends(get_db),
    user: Optional[Usuario] = Depends(get_current_user_optional)
):
    """
    Sub-second bidirectional instant autocomplete search (<1s SLA):
    1. By Deceased: Name, paternal/maternal surname, RUT (with/without dots/dash), death date.
    2. By Location: Cemetery, Sector/Pabellón, Row, Number.
    Includes grid coordinates (grid_x, grid_y) for instant map pan/zoom.
    """
    raw_term = q.strip()
    if len(raw_term) == 0:
        return {"query": "", "total_results": 0, "results": []}

    is_digit = raw_term.replace("-", "").replace(".", "").isdigit()
    if not is_digit and len(raw_term) < 2:
        return {"query": raw_term, "total_results": 0, "results": []}

    is_staff = user and user.rol in {RolUsuario.ADMINISTRADOR.value, RolUsuario.ADMINISTRATIVO.value}
    repaired_term = clean_query_term(raw_term)
    rut_clean = re.sub(r"[^0-9kK]", "", raw_term).upper()

    search_pattern = f"%{repaired_term}%"
    items = []

    # 1. Search Inhumations (Deceased Name, RUT, Ingress Number, Death Date)
    inh_query = db.query(Inhumacion).join(Inhumacion.fallecido).join(Inhumacion.ubicacion)
    if cementerio_id:
        inh_query = inh_query.filter(Ubicacion.cementerio_id == cementerio_id)

    filters = [
        Persona.nombre_completo.ilike(search_pattern),
        Persona.apellido_paterno.ilike(search_pattern),
        Persona.apellido_materno.ilike(search_pattern),
        Inhumacion.numero_ingreso.ilike(search_pattern),
        Ubicacion.sector_codigo.ilike(search_pattern),
        Ubicacion.numero.ilike(search_pattern)
    ]

    if rut_clean and len(rut_clean) >= 1:
        filters.append(Persona.rut.ilike(f"%{rut_clean}%"))

    inh_results = inh_query.filter(or_(*filters)).limit(limit).all()

    for inh in inh_results:
        u = inh.ubicacion
        items.append({
            "tipo": "INHUMADO",
            "id": inh.id,
            "titulo": inh.fallecido.nombre_completo,
            "subtitulo": f"RUT: {inh.fallecido.rut or 'Sin RUT'} | Sepultado: {inh.fecha_sepultacion}",
            "ubicacion": u.codigo_completo,
            "ubicacion_id": u.id,
            "cementerio_id": u.cementerio_id,
            "cementerio": u.cementerio.nombre,
            "sector_codigo": u.sector_codigo,
            "fila": u.fila,
            "numero": u.numero,
            "grid_x": u.grid_x,
            "grid_y": u.grid_y,
            "color_status": u.color_status,
            "fecha_defuncion": inh.fecha_defuncion.isoformat() if inh.fecha_defuncion else None,
            "fecha_sepultacion": inh.fecha_sepultacion.isoformat() if inh.fecha_sepultacion else None,
            "causa_fallecimiento": inh.causa_fallecimiento if is_staff else "[CONFIDENCIAL LEY 20.584]"
        })

    # 2. Search Locations directly (by Sector, Row, Number)
    if len(items) < limit:
        remaining = limit - len(items)
        ubic_query = db.query(Ubicacion)
        if cementerio_id:
            ubic_query = ubic_query.filter(Ubicacion.cementerio_id == cementerio_id)

        loc_filters = [
            Ubicacion.sector_codigo.ilike(search_pattern),
            Ubicacion.numero.ilike(search_pattern),
            Ubicacion.fila.ilike(search_pattern)
        ]

        ubic_results = ubic_query.filter(or_(*loc_filters)).limit(remaining).all()
        for u in ubic_results:
            # Avoid duplicate if already added via inh
            if any(it.get("ubicacion_id") == u.id and it.get("tipo") == "INHUMADO" for it in items):
                continue

            titular = u.derechos[-1].titular.nombre_completo if u.derechos else None

            items.append({
                "tipo": "UBICACION",
                "id": u.id,
                "titulo": f"Sepultura {u.codigo_completo}",
                "subtitulo": f"Sector: {u.sector_codigo} | Estado: {u.estado} | {('Titular: ' + titular) if titular else 'Sin titular activo'}",
                "ubicacion": u.codigo_completo,
                "ubicacion_id": u.id,
                "cementerio_id": u.cementerio_id,
                "cementerio": u.cementerio.nombre,
                "sector_codigo": u.sector_codigo,
                "fila": u.fila,
                "numero": u.numero,
                "grid_x": u.grid_x,
                "grid_y": u.grid_y,
                "color_status": u.color_status
            })

    return {
        "query": raw_term,
        "total_results": len(items),
        "results": items[:limit]
    }
