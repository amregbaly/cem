"""
AST-05: Read-only tool layer for the AI assistant.

Design principle:
- Each tool function runs AS the logged-in user's session with existing DB.
- Whitelisted fields only — NO RUT, cause of death, contact details, free-text
  observations, attachments, audit data, or user accounts exposed to the model.
- All tools are synchronous wrappers; the endpoint calls them before sending
  the results to the LLM.
- Tools NEVER receive credentials or DB session objects; they receive only
  the pre-filtered result dicts.

TOOL REGISTRY (used by the endpoint to interpret function_calls from LLM):
  buscar_sepulturas(q, cementerio_id?)
  estado_ubicacion(ubicacion_id)
  resumen_arriendos_vencimientos()
  contar_inhumaciones_recientes(dias?)
  consultar_disponibilidad_nichos(cementerio_id, tipo_derecho?)
"""
from __future__ import annotations
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, timedelta


# ─── Whitelisted field sets ───────────────────────────────────────────────────
# NEVER add: rut, causa_fallecimiento, observaciones, telefono, email,
#            direccion, datos_judiciales, adjuntos, hashed_password

_INHUMACION_PUBLIC_FIELDS = {
    "nombre_fallecido", "fecha_defuncion", "fecha_inhumacion",
    "estado", "tipo_sepultura", "cementerio_nombre",
}

_UBICACION_PUBLIC_FIELDS = {
    "id", "tipo_derecho", "estado", "pabellon", "fila", "numero",
    "cementerio_nombre", "capacidad", "ocupados",
}

_ARRIENDO_PUBLIC_FIELDS = {
    "folio", "tipo_derecho", "pabellon", "numero",
    "fecha_vencimiento", "dias_para_vencer", "estado_alerta",
}


# ─── Tool implementations ────────────────────────────────────────────────────

def buscar_sepulturas(db: Session, q: str, cementerio_id: Optional[int] = None) -> list[dict]:
    """
    Search inhumaciones by name fragment (no RUT, no cause of death).
    Returns at most 10 results with whitelisted fields only.
    """
    from app.domain.models.inhumacion import Inhumacion
    from app.domain.models.persona import Persona
    from app.domain.models.ubicacion import Ubicacion

    q_clean = q.strip()[:80]  # cap query length
    if len(q_clean) < 2:
        return [{"error": "La búsqueda debe tener al menos 2 caracteres"}]

    query = (
        db.query(Inhumacion, Persona, Ubicacion)
        .join(Persona, Inhumacion.fallecido_persona_id == Persona.id)
        .join(Ubicacion, Inhumacion.ubicacion_id == Ubicacion.id)
    )
    if cementerio_id:
        query = query.filter(Ubicacion.cementerio_id == cementerio_id)

    # Case-insensitive search on nombre_completo (no RUT)
    query = query.filter(
        func.lower(Persona.nombre_completo).contains(func.lower(q_clean))
    ).limit(10)

    results = []
    for inh, per, ub in query.all():
        results.append({
            "nombre": per.nombre_completo,
            "fecha_defuncion": str(inh.fecha_defuncion) if inh.fecha_defuncion else None,
            "fecha_sepultacion": str(inh.fecha_sepultacion) if inh.fecha_sepultacion else None,
            "pabellon": getattr(ub, "pabellon", None),
            "numero": getattr(ub, "numero", None),
            "tipo_derecho": getattr(ub, "tipo_derecho", None),
        })

    return results if results else [{"info": f"No se encontraron sepulturas con '{q_clean}'"}]


def estado_ubicacion(db: Session, ubicacion_id: int) -> dict:
    """
    Return whitelisted location status.
    """
    from app.domain.models.ubicacion import Ubicacion
    from app.domain.models.cementerio import Cementerio

    ub = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ub:
        return {"error": f"Ubicación {ubicacion_id} no encontrada"}

    return {
        "id": ub.id,
        "tipo_derecho": getattr(ub, "tipo_derecho", None),
        "estado": getattr(ub, "estado", None),
        "pabellon": getattr(ub, "pabellon", None),
        "fila": getattr(ub, "fila", None),
        "numero": getattr(ub, "numero", None),
    }


def resumen_arriendos_vencimientos(db: Session) -> dict:
    """
    Aggregate summary of lease expirations — no personal data.
    """
    from app.domain.models.derecho import Derecho

    today = date.today()
    in_30 = today + timedelta(days=30)
    in_90 = today + timedelta(days=90)

    try:
        vencidos = (
            db.query(func.count(Derecho.id))
            .filter(Derecho.fecha_vencimiento < today)
            .scalar() or 0
        )
        proximos_30 = (
            db.query(func.count(Derecho.id))
            .filter(Derecho.fecha_vencimiento.between(today, in_30))
            .scalar() or 0
        )
        proximos_90 = (
            db.query(func.count(Derecho.id))
            .filter(Derecho.fecha_vencimiento.between(today, in_90))
            .scalar() or 0
        )
        return {
            "vencidos_total": vencidos,
            "proximos_a_vencer_30_dias": proximos_30,
            "proximos_a_vencer_90_dias": proximos_90,
            "fecha_consulta": str(today),
        }
    except Exception as e:
        return {"error": f"No se pudo obtener resumen de arriendos: {str(e)[:100]}"}


def contar_inhumaciones_recientes(db: Session, dias: int = 30) -> dict:
    """
    Count of inhumaciones in the last N days (aggregate only, no personal data).
    """
    from app.domain.models.inhumacion import Inhumacion

    dias = max(1, min(dias, 365))
    cutoff = date.today() - timedelta(days=dias)
    try:
        total = (
            db.query(func.count(Inhumacion.id))
            .filter(Inhumacion.fecha_inhumacion >= cutoff)
            .scalar() or 0
        )
        return {
            "periodo_dias": dias,
            "total_inhumaciones": total,
            "desde": str(cutoff),
            "hasta": str(date.today()),
        }
    except Exception as e:
        return {"error": f"No se pudo contar inhumaciones: {str(e)[:100]}"}


def consultar_disponibilidad_nichos(
    db: Session, cementerio_id: int, tipo_derecho: Optional[str] = None
) -> dict:
    """
    Availability counts per type for a cemetery. No personal data.
    """
    from app.domain.models.ubicacion import Ubicacion

    try:
        query = db.query(Ubicacion).filter(Ubicacion.cementerio_id == cementerio_id)
        if tipo_derecho:
            query = query.filter(Ubicacion.tipo_derecho == tipo_derecho)

        total = query.count()
        disponibles = query.filter(Ubicacion.estado == "DISPONIBLE").count()
        ocupados = query.filter(Ubicacion.estado == "OCUPADO").count()

        return {
            "cementerio_id": cementerio_id,
            "tipo_derecho": tipo_derecho or "todos",
            "total": total,
            "disponibles": disponibles,
            "ocupados": ocupados,
        }
    except Exception as e:
        return {"error": f"No se pudo consultar disponibilidad: {str(e)[:100]}"}


# ─── Tool dispatcher ─────────────────────────────────────────────────────────

AVAILABLE_TOOLS = {
    "buscar_sepulturas",
    "estado_ubicacion",
    "resumen_arriendos_vencimientos",
    "contar_inhumaciones_recientes",
    "consultar_disponibilidad_nichos",
}


def dispatch_tool(db: Session, tool_name: str, args: dict) -> dict | list:
    """
    Safe dispatcher for tool calls.
    Only allowed tool names are accepted; unknown tools return an error.
    """
    if tool_name not in AVAILABLE_TOOLS:
        return {"error": f"Herramienta '{tool_name}' no disponible"}

    try:
        if tool_name == "buscar_sepulturas":
            return buscar_sepulturas(db, args.get("q", ""), args.get("cementerio_id"))
        elif tool_name == "estado_ubicacion":
            return estado_ubicacion(db, int(args.get("ubicacion_id", 0)))
        elif tool_name == "resumen_arriendos_vencimientos":
            return resumen_arriendos_vencimientos(db)
        elif tool_name == "contar_inhumaciones_recientes":
            return contar_inhumaciones_recientes(db, int(args.get("dias", 30)))
        elif tool_name == "consultar_disponibilidad_nichos":
            return consultar_disponibilidad_nichos(
                db,
                int(args.get("cementerio_id", 0)),
                args.get("tipo_derecho"),
            )
    except Exception as e:
        return {"error": f"Error ejecutando herramienta: {str(e)[:150]}"}

    return {"error": "dispatch error"}
