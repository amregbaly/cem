import pytest
from etl.name_parser import parse_chilean_name, is_unidentified


def test_is_unidentified():
    assert is_unidentified("NN") is True
    assert is_unidentified("N.N.") is True
    assert is_unidentified("no identificado") is True
    assert is_unidentified("RESTOS NN") is True
    assert is_unidentified("JUAN PEREZ") is False


def test_parse_chilean_name_separated():
    res = parse_chilean_name("JUAN CARLOS", "PEREZ", "GONZALEZ")
    assert res["nombres"] == "JUAN CARLOS"
    assert res["apellido_paterno"] == "PEREZ"
    assert res["apellido_materno"] == "GONZALEZ"
    assert res["nombre_completo"] == "JUAN CARLOS PEREZ GONZALEZ"
    assert res["es_nn"] is False


def test_parse_chilean_name_compound_particles():
    # Single string with compound particles 'DE LA' and 'SAN'
    res = parse_chilean_name("CARMEN GLORIA DE LA FUENTE SAN MARTIN")
    assert res["nombres"] == "CARMEN GLORIA"
    assert res["apellido_paterno"] == "DE LA FUENTE"
    assert res["apellido_materno"] == "SAN MARTIN"
    assert res["nombre_completo"] == "CARMEN GLORIA DE LA FUENTE SAN MARTIN"
    assert res["es_nn"] is False


def test_parse_chilean_name_nn():
    res = parse_chilean_name("NN", "NN", "NN")
    assert res["es_nn"] is True
    assert "NN" in res["nombre_completo"]
