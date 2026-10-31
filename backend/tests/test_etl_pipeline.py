import os
import pytest
from etl.migrate_excel import ExcelMigrator
from etl.reconciliation_report import generate_reconciliation_report
from app.domain.models import Ubicacion, Persona, Inhumacion, Derecho

SAMPLE_EXCEL_PATH = "/home/amr/Downloads/Anexo 1_Muestra_Enmascarada_Base_Cementerio..xlsx"


def test_excel_migration_on_sample(test_db):
    if not os.path.exists(SAMPLE_EXCEL_PATH):
        pytest.skip("Sample Excel file not found on disk")

    migrator = ExcelMigrator(SAMPLE_EXCEL_PATH, test_db)
    stats = migrator.migrate_all()

    assert "INHUMACIONES" in stats
    assert "PROPIEDADES" in stats
    assert "tb_ubicacion" in stats

    # Verify database has imported records
    ubicaciones_count = test_db.query(Ubicacion).count()
    assert ubicaciones_count > 0

    personas_count = test_db.query(Persona).count()
    assert personas_count > 0

    inhumaciones_count = test_db.query(Inhumacion).count()
    assert inhumaciones_count > 0

    # Verify reconciliation report
    report = generate_reconciliation_report(test_db)
    assert report["resumen"]["total_filas_origen"] > 0
    assert report["resumen"]["total_migrados"] > 0
