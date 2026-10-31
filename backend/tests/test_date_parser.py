import pytest
from datetime import date
from etl.date_parser import parse_date_value, SENTINEL_DATE


def test_parse_date_strings():
    d, is_unknown, is_invalid, orig = parse_date_value("2005-04-09")
    assert d == date(2005, 4, 9)
    assert is_unknown is False
    assert is_invalid is False

    d, is_unknown, is_invalid, orig = parse_date_value("09/04/2005")
    assert d == date(2005, 4, 9)

    d, is_unknown, is_invalid, orig = parse_date_value("09-04-1989")
    assert d == date(1989, 4, 9)


def test_parse_excel_serial():
    # Excel serial 38450 is 2005-04-08
    d, is_unknown, is_invalid, orig = parse_date_value(38450)
    assert d == date(2005, 4, 8)


def test_sentinel_date_1901():
    # Rule R3 / R11 sentinel date 1901-01-01 should return None with is_unknown=True
    d, is_unknown, is_invalid, orig = parse_date_value("1901-01-01", is_birth_date=True)
    assert d is None
    assert is_unknown is True
    assert is_invalid is False


def test_invalid_date_boundary():
    # Dates before 1900 or uninterpretable
    d, is_unknown, is_invalid, orig = parse_date_value("1850-01-01")
    assert d is None
    assert is_invalid is True
