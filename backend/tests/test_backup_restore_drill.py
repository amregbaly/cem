from scripts.backup import create_backup
from scripts.restore_drill import run_restore_drill


def test_backup_and_disaster_recovery_drill():
    """
    EETT Section 11 & REQ-6, A2-32:
    Verifies that backup creates valid archive with SHA-256 manifest
    and restore drill completes with PRAGMA integrity_check == ok and all hashes matched.
    """
    backup_res = create_backup("daily")
    assert backup_res["status"] == "SUCCESS"
    assert "sha256_archive" in backup_res
    archive_file = backup_res["backup_file"]

    drill_rep = run_restore_drill(archive_file)
    assert drill_rep["status"] == "DRILL_PASSED_INTEGRITY_VERIFIED"
    assert drill_rep["all_hashes_matched"] is True
    assert drill_rep["rto_compliant"] is True
    assert drill_rep["database_checks"]["cem_core.db"]["healthy"] is True
    assert drill_rep["database_checks"]["cem_audit.db"]["healthy"] is True
