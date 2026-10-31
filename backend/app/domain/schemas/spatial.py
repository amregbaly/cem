from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class MapSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cementerio_id: int
    codigo_completo: str
    sector_codigo: str
    fila: str
    numero: str
    tipo_ubicacion: str
    estado: str
    color_status: str  # DISPONIBLE, OCUPADO, RESERVADO, ARRIENDO_VENCIDO, BLOQUEADO
    grid_x: Optional[int] = None
    grid_y: Optional[int] = None
    capacidad_total: int = 1
    capacidad_ocupada: int = 0
    ocupante_principal: Optional[str] = None
    rut_ocupante: Optional[str] = None
    titular_nombre: Optional[str] = None
    rut_titular: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    dias_para_vencer: Optional[int] = None


class SectorSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cemetery_id: int
    cemetery_name: str
    sector_codigo: str
    sector_nombre: str
    tipo_ubicacion: str
    total_slots: int
    slots_disponibles: int
    slots_ocupados: int
    slots_arriendo_vencido: int
    slots_reservados: int
    slots_bloqueados: int
    grid_cols: int
    grid_rows: int


class MapGridResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cemetery_id: int
    cemetery_name: str
    sector_codigo: str
    sector_nombre: str
    grid_cols: int
    grid_rows: int
    total_slots: int
    slots: List[MapSlotResponse]
