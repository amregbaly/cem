from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.infrastructure.db.session import get_db
from app.domain.models import Cementerio, Ubicacion, Inhumacion, Derecho

router = APIRouter()


@router.get("")
def list_cementerios(db: Session = Depends(get_db)):
    """List all municipal cemeteries with summary statistics."""
    cementerios = db.query(Cementerio).filter(Cementerio.activo == True).all()
    results = []

    for cem in cementerios:
        total_ubicaciones = db.query(func.count(Ubicacion.id)).filter(Ubicacion.cementerio_id == cem.id).scalar() or 0
        total_ocupadas = db.query(func.count(Ubicacion.id)).filter(
            Ubicacion.cementerio_id == cem.id,
            Ubicacion.estado == "OCUPADO"
        ).scalar() or 0
        total_disponibles = db.query(func.count(Ubicacion.id)).filter(
            Ubicacion.cementerio_id == cem.id,
            Ubicacion.estado == "DISPONIBLE"
        ).scalar() or 0
        total_inhumaciones = db.query(func.count(Inhumacion.id)).join(Inhumacion.ubicacion).filter(
            Ubicacion.cementerio_id == cem.id
        ).scalar() or 0

        results.append({
            "id": cem.id,
            "codigo": cem.codigo,
            "nombre": cem.nombre,
            "comuna": cem.comuna,
            "region": cem.region,
            "direccion": cem.direccion,
            "stats": {
                "total_sepulturas": total_ubicaciones,
                "ocupadas": total_ocupadas,
                "disponibles": total_disponibles,
                "total_inhumados": total_inhumaciones
            }
        })

    return results
