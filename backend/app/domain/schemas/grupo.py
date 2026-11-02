from typing import Optional, List
from pydantic import BaseModel, Field
from app.domain.models.grupo import ModuloSistema, NivelAcceso


class PermisoItem(BaseModel):
    modulo: str = Field(..., description="Nombre del módulo funcional (ej: INHUMACIONES, ARRIENDOS)")
    acceso: str = Field("READ", description="Nivel de acceso: NONE, READ, WRITE")


class GrupoCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=80, description="Nombre del grupo o rol municipal")
    descripcion: Optional[str] = Field(None, max_length=255, description="Descripción funcional de los privilegios del grupo")
    permisos: List[PermisoItem] = Field(default_factory=list, description="Matriz de permisos por módulo funcional")


class GrupoUpdateRequest(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=80)
    descripcion: Optional[str] = Field(None, max_length=255)
    permisos: Optional[List[PermisoItem]] = None


class GrupoResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    es_sistema: bool
    permisos: List[PermisoItem]
    total_usuarios: int = 0

    class Config:
        from_attributes = True


class AsignarGrupoRequest(BaseModel):
    grupo_id: Optional[int] = Field(None, description="ID del grupo a asignar (o null para desvincular)")
