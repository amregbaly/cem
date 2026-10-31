import re
from typing import Tuple, Optional

# Municipal-validated dictionary of common Chilean surnames and given names containing 'Ñ'
CHILEAN_SURNAME_DICT = {
    "MU?OZ": "MUÑOZ",
    "MUNOZ": "MUÑOZ",
    "NU?EZ": "NUÑEZ",
    "NUNEZ": "NUÑEZ",
    "PE?A": "PEÑA",
    "PENA": "PEÑA",
    "IBA?EZ": "IBÁÑEZ",
    "IBANEZ": "IBÁÑEZ",
    "YA?EZ": "YÁÑEZ",
    "YANEZ": "YÁÑEZ",
    "ACU?A": "ACUÑA",
    "ACUNA": "ACUÑA",
    "ZU?IGA": "ZÚÑIGA",
    "ZUNIGA": "ZÚÑIGA",
    "CAI?AS": "CAIÑAS",
    "CAINAS": "CAIÑAS",
    "ORDO?EZ": "ORDOÑEZ",
    "ORDONEZ": "ORDOÑEZ",
    "QUI?ONES": "QUIÑONES",
    "QUINONES": "QUIÑONES",
    "CASTA?EDA": "CASTAÑEDA",
    "CASTANEDA": "CASTAÑEDA",
    "BOLA?OS": "BOLAÑOS",
    "BOLANOS": "BOLAÑOS",
    "BRI?ONES": "BRIONES",
    "CABA?AS": "CABAÑAS",
    "CABANAS": "CABAÑAS",
    "MONTA?A": "MONTAÑA",
    "MONTANA": "MONTAÑA",
    "PI?A": "PIÑA",
    "PINA": "PIÑA",
    "VI?A": "VIÑA",
    "VINA": "VIÑA",
    "SE?ORET": "SEÑORET",
    "SENORET": "SEÑORET",
    "A?ASCO": "AÑASCO",
    "ANASCO": "AÑASCO",
    "BEGO?A": "BEGOÑA",
    "BEGONA": "BEGOÑA",
    "ESPA?A": "ESPAÑA",
    "ESPANA": "ESPAÑA",
    "CARRE?O": "CARREÑO",
    "CARRENO": "CARREÑO",
    "GAETE": "GAETE",
    "LOBOS": "LOBOS",
}


def repair_corrupted_characters(text: Optional[str]) -> Tuple[Optional[str], bool, bool]:
    """
    Repairs text encoding and restores corrupted 'Ñ' characters (Rule R8).
    
    Returns:
        (repaired_text: Optional[str], was_modified: bool, has_unresolved_question_mark: bool)
    """
    if not text:
        return None, False, False

    raw = str(text).strip()
    if not raw:
        return None, False, False

    # Normalize whitespace
    original = re.sub(r"\s+", " ", raw)
    repaired_tokens = []
    modified = False

    for token in original.split():
        clean_token = token.upper()
        # Direct dictionary match
        if clean_token in CHILEAN_SURNAME_DICT:
            repaired_tokens.append(CHILEAN_SURNAME_DICT[clean_token])
            modified = True
        elif "?" in clean_token:
            # Pattern heuristic for embedded question marks e.g. "MU?OZ"
            matched = False
            for corrupt_pattern, replacement in CHILEAN_SURNAME_DICT.items():
                if "?" in corrupt_pattern and clean_token == corrupt_pattern:
                    repaired_tokens.append(replacement)
                    modified = True
                    matched = True
                    break
            if not matched:
                # If single ? between letters, frequently an Ñ in Spanish (e.g. PE?A, ACU?A)
                heuristic = re.sub(r"([A-Z])\?([A-Z])", r"\1Ñ\2", clean_token)
                repaired_tokens.append(heuristic)
                modified = True
        else:
            repaired_tokens.append(token)

    result_text = " ".join(repaired_tokens)
    has_unresolved = "?" in result_text

    return result_text, modified, has_unresolved
