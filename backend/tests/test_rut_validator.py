import pytest
from etl.rut_validator import validate_and_format_rut, compute_dv, clean_rut


def test_clean_rut():
    assert clean_rut(" 12.345.678-k ") == "12345678K"
    assert clean_rut("11.111.111-1") == "111111111"
    assert clean_rut(None) is None


def test_compute_dv():
    # Known valid Chilean RUTs
    assert compute_dv(11111111) == "1"
    assert compute_dv(12345678) == "5"
    assert compute_dv(10000013) == "K"
    assert compute_dv(76458231) == "4"


def test_validate_and_format_rut_valid():
    is_valid, formatted, cuerpo, dv = validate_and_format_rut("12.345.678-5")
    assert is_valid is True
    assert formatted == "12345678-5"
    assert cuerpo == 12345678
    assert dv == "5"

    is_valid, formatted, cuerpo, dv = validate_and_format_rut("10000013", "k")
    assert is_valid is True
    assert formatted == "10000013-K"
    assert dv == "K"


def test_validate_and_format_rut_invalid():
    # Wrong DV: 12345678-9 (correct is 5)
    is_valid, formatted, cuerpo, dv = validate_and_format_rut("12.345.678-9")
    assert is_valid is False
    assert formatted == "12345678-9"
    assert cuerpo == 12345678
    assert dv == "9"


def test_validate_and_format_rut_none():
    is_valid, formatted, cuerpo, dv = validate_and_format_rut(None, None)
    assert is_valid is False
    assert formatted is None
