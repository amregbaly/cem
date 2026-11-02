from datetime import date, datetime, timedelta
from typing import Optional, Tuple, Any

EXCEL_EPOCH = date(1899, 12, 30)  # Excel 1900 date system accounting for 1900 leap year bug
SENTINEL_DATE = date(1901, 1, 1)
CUTOFF_DATE = date(2026, 3, 31)
MIN_VALID_YEAR = 1900


def parse_date_value(
    raw_val: Any,
    is_birth_date: bool = False,
    allow_future: bool = False
) -> Tuple[Optional[date], bool, bool, Optional[str]]:
    """
    Parses dates from Excel serial floats/ints, datetime objects, or string representations.
    Applies Rule R3 and Rule R11.
    
    Returns:
        (parsed_date: Optional[date], is_unknown: bool, is_invalid: bool, original_text: Optional[str])
    """
    if raw_val is None:
        return None, False, False, None

    orig_str = str(raw_val).strip()
    if not orig_str or orig_str in {"-", "0", "None", "NULL", "null", "s/d", "S/D"}:
        return None, False, False, orig_str

    parsed: Optional[date] = None

    # Case 1: Already datetime/date
    if isinstance(raw_val, datetime):
        parsed = raw_val.date()
    elif isinstance(raw_val, date):
        parsed = raw_val

    # Case 2: Numeric Excel serial date (e.g. 38450)
    elif isinstance(raw_val, (int, float)) or (isinstance(raw_val, str) and raw_val.replace(".", "", 1).isdigit()):
        try:
            num = float(raw_val)
            if num <= 0:
                return None, True, False, orig_str
            # Excel serial number conversion
            parsed = EXCEL_EPOCH + timedelta(days=int(num))
        except (ValueError, OverflowError):
            pass

    # Case 3: Text parsing
    if parsed is None and isinstance(raw_val, str):
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y",
            "%Y/%m/%d", "%d.%m.%Y", "%Y-%m-%d %H:%M:%S",
            "%d/%m/%y", "%d-%m-%y"
        ]
        clean_text_val = orig_str.split()[0]  # Take date part if time included
        for fmt in formats:
            try:
                dt = datetime.strptime(clean_text_val, fmt)
                # Handle 2-digit years
                if dt.year < 100:
                    year = dt.year + (1900 if dt.year >= 20 else 2000)
                    parsed = date(year, dt.month, dt.day)
                else:
                    parsed = dt.date()
                break
            except ValueError:
                continue

    if parsed is None:
        # Date could not be interpreted
        return None, False, True, orig_str

    # Rule R11: Sentinel date 1901-01-01
    if parsed == SENTINEL_DATE:
        return None, True, False, orig_str

    # Rule R11: Dates before 1900 or after cut-off date (unless allow_future=True for lease expiration)
    if parsed.year < MIN_VALID_YEAR or (not allow_future and parsed > CUTOFF_DATE):
        return None, False, True, orig_str

    return parsed, False, False, orig_str
