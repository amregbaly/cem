import re
from typing import Tuple, Optional, Dict

COMPOUND_PREFIXES = {
    "DE LA", "DE LOS", "DE LAS", "DE EL", "DEL", "DE",
    "SAN", "SANTA", "VDA. DE", "VDA DE", "Y"
}


def is_unidentified(text: Optional[str]) -> bool:
    """Checks if text indicates an unidentified person (NN)."""
    if not text:
        return False
    t = str(text).strip().upper()
    return t in {"NN", "N.N.", "NO IDENTIFICADO", "DESCONOCIDO", "RESTOS NN", "FETO NN", "PARVULO NN"}


def clean_text(text: Optional[str]) -> Optional[str]:
    """Trims whitespace and collapses multiple spaces."""
    if text is None:
        return None
    cleaned = re.sub(r"\s+", " ", str(text).strip())
    return cleaned if cleaned else None


def parse_chilean_name(
    raw_name: Optional[str],
    raw_paterno: Optional[str] = None,
    raw_materno: Optional[str] = None
) -> Dict[str, Optional[str] or bool]:
    """
    Parses and standardizes Chilean names into first_names, apellido_paterno, apellido_materno.
    Applies Rule R2 (respects compound particles like 'de', 'del', 'de la', 'San').
    Applies Rule R11 (detects 'NN' unidentified records).
    
    Returns:
        {
            "nombres": Optional[str],
            "apellido_paterno": Optional[str],
            "apellido_materno": Optional[str],
            "nombre_completo": str,
            "es_nn": bool,
            "es_ambiguo": bool
        }
    """
    raw_n = clean_text(raw_name)
    raw_p = clean_text(raw_paterno)
    raw_m = clean_text(raw_materno)

    # Check NN
    all_combined = " ".join(filter(None, [raw_n, raw_p, raw_m])).upper()
    if is_unidentified(all_combined) or is_unidentified(raw_n):
        return {
            "nombres": "NN",
            "apellido_paterno": "NN",
            "apellido_materno": None,
            "nombre_completo": "NN (PERSONA NO IDENTIFICADA)",
            "es_nn": True,
            "es_ambiguo": False
        }

    # Case 1: Paterno and Materno are already given separately
    if raw_p is not None:
        paterno = raw_p.upper()
        materno = raw_m.upper() if raw_m else None
        nombres = raw_n.upper() if raw_n else None
        
        parts = []
        if nombres:
            parts.append(nombres)
        if paterno:
            parts.append(paterno)
        if materno:
            parts.append(materno)
            
        full = " ".join(parts)
        return {
            "nombres": nombres,
            "apellido_paterno": paterno,
            "apellido_materno": materno,
            "nombre_completo": full,
            "es_nn": False,
            "es_ambiguo": False
        }

    # Case 2: Full name is in a single string and needs parsing
    if not raw_n:
        return {
            "nombres": None,
            "apellido_paterno": None,
            "apellido_materno": None,
            "nombre_completo": "SIN DATO EN ORIGEN",
            "es_nn": False,
            "es_ambiguo": True
        }

    tokens = raw_n.upper().split()
    if len(tokens) == 1:
        return {
            "nombres": tokens[0],
            "apellido_paterno": None,
            "apellido_materno": None,
            "nombre_completo": tokens[0],
            "es_nn": False,
            "es_ambiguo": True
        }

    # Helper to group compound surname particles backwards
    idx = len(tokens) - 1
    
    # Try to extract materno
    materno_tokens = []
    if idx > 1:
        # Check if preceding token is a particle
        if idx >= 2 and f"{tokens[idx-2]} {tokens[idx-1]}" in COMPOUND_PREFIXES:
            materno_tokens = [tokens[idx-2], tokens[idx-1], tokens[idx]]
            idx -= 3
        elif idx >= 1 and tokens[idx-1] in COMPOUND_PREFIXES:
            materno_tokens = [tokens[idx-1], tokens[idx]]
            idx -= 2
        else:
            materno_tokens = [tokens[idx]]
            idx -= 1

    # Extract paterno
    paterno_tokens = []
    if idx >= 2 and f"{tokens[idx-2]} {tokens[idx-1]}" in COMPOUND_PREFIXES:
        paterno_tokens = [tokens[idx-2], tokens[idx-1], tokens[idx]]
        idx -= 3
    elif idx >= 1 and tokens[idx-1] in COMPOUND_PREFIXES:
        paterno_tokens = [tokens[idx-1], tokens[idx]]
        idx -= 2
    elif idx >= 0:
        paterno_tokens = [tokens[idx]]
        idx -= 1

    # Remaining tokens are first names
    nombres_tokens = tokens[:idx + 1]
    if not nombres_tokens and paterno_tokens:
        # If all tokens were consumed into surnames, swap
        nombres_tokens = [paterno_tokens.pop(0)]

    nombres_str = " ".join(nombres_tokens) if nombres_tokens else None
    paterno_str = " ".join(paterno_tokens) if paterno_tokens else None
    materno_str = " ".join(materno_tokens) if materno_tokens else None

    parts = [p for p in [nombres_str, paterno_str, materno_str] if p]
    nombre_completo = " ".join(parts)

    return {
        "nombres": nombres_str,
        "apellido_paterno": paterno_str,
        "apellido_materno": materno_str,
        "nombre_completo": nombre_completo,
        "es_nn": False,
        "es_ambiguo": (len(tokens) < 3)
    }
