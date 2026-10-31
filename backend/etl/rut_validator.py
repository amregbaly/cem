import re
from typing import Tuple, Optional


def clean_rut(raw_rut: Optional[str]) -> Optional[str]:
    """Removes dots, spaces, hyphens, and normalizes 'k' to uppercase 'K'."""
    if not raw_rut:
        return None
    cleaned = str(raw_rut).strip().replace(".", "").replace(" ", "").replace("-", "").upper()
    return cleaned if cleaned else None


def compute_dv(cuerpo: int) -> str:
    """Computes Chilean RUT verification digit using Modulo 11 algorithm."""
    s = str(cuerpo)
    multipliers = [2, 3, 4, 5, 6, 7]
    total = 0
    m_idx = 0

    for digit in reversed(s):
        total += int(digit) * multipliers[m_idx]
        m_idx = (m_idx + 1) % len(multipliers)

    remainder = total % 11
    result = 11 - remainder

    if result == 11:
        return "0"
    elif result == 10:
        return "K"
    else:
        return str(result)


def validate_and_format_rut(
    raw_cuerpo: Optional[str or int],
    raw_dv: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[int], Optional[str]]:
    """
    Validates and formats a Chilean RUT according to Rule R1:
    - Formatted string: '12345678-K' (no dots, uppercase K)
    - Validates Modulo 11 check digit.
    
    Returns:
        (is_valid: bool, formatted_rut: Optional[str], cuerpo: Optional[int], dv: Optional[str])
    """
    if raw_cuerpo is None and raw_dv is None:
        return False, None, None, None

    # If raw_dv is provided separately (common in legacy tables like VEN_RUTN, VEN_RUTD)
    if raw_dv is not None:
        c_str = str(raw_cuerpo).strip().replace(".", "").replace("-", "") if raw_cuerpo is not None else ""
        d_str = str(raw_dv).strip().upper()
        if not c_str:
            return False, None, None, None
    else:
        combined = clean_rut(str(raw_cuerpo))
        if not combined or len(combined) < 2:
            return False, combined, None, None
        c_str = combined[:-1]
        d_str = combined[-1]

    # Validate that cuerpo is numeric
    if not c_str.isdigit():
        formatted_invalid = f"{c_str}-{d_str}" if c_str else None
        return False, formatted_invalid, None, d_str

    cuerpo_num = int(c_str)
    expected_dv = compute_dv(cuerpo_num)
    is_valid = (expected_dv == d_str)
    formatted_rut = f"{cuerpo_num}-{d_str}"

    return is_valid, formatted_rut, cuerpo_num, d_str
