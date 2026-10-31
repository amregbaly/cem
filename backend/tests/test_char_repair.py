import pytest
from etl.char_repair import repair_corrupted_characters


def test_repair_corrupted_surnames():
    text, mod, unres = repair_corrupted_characters("MU?OZ")
    assert text == "MUÑOZ"
    assert mod is True
    assert unres is False

    text, mod, unres = repair_corrupted_characters("NU?EZ")
    assert text == "NUÑEZ"
    assert mod is True

    text, mod, unres = repair_corrupted_characters("CARMEN GLORIA PE?A")
    assert text == "CARMEN GLORIA PEÑA"
    assert mod is True

    text, mod, unres = repair_corrupted_characters("BRI?ONES")
    assert text == "BRIONES"
    assert mod is True


def test_clean_unmodified_text():
    text, mod, unres = repair_corrupted_characters("JUAN PEREZ")
    assert text == "JUAN PEREZ"
    assert mod is False
    assert unres is False
