from typing import Optional
from pydantic import BaseModel, ConfigDict


class PortalConfigResponse(BaseModel):
    id: int
    permitir_lista_fallecidos: bool
    permitir_busqueda_publica: bool
    titulo_portal: str
    mensaje_portal: str
    actualizado_por: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PortalConfigUpdateRequest(BaseModel):
    permitir_lista_fallecidos: bool
    permitir_busqueda_publica: Optional[bool] = False
    titulo_portal: Optional[str] = None
    mensaje_portal: Optional[str] = None
