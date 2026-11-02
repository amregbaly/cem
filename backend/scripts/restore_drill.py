#!/usr/bin/env python3
"""
Automated Disaster Recovery Restore Drill (EETT Section 11, REQ-6 & A2-32).
Executes isolated restore test into a sandbox directory, validates SHA-256 digests,
executes PRAGMA integrity_check on databases, counts core records, and verifies RTO <= 8 hours.
"""

import os
import sys
import json
import time
import shutil
import sqlite3
import hashlib
import tarfile
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(BASE_DIR, "backups", "automated")
DRILL_DIR = os.path.join(BASE_DIR, "backups", "restore_drill_sandbox")


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def run_restore_drill(archive_path: str = None) -> dict:
    start_time = time.perf_counter()
    timestamp_drill = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")

    if not archive_path:
        # Find latest backup in BACKUP_DIR
        backups = [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.endswith(".tar.gz")]
        if not backups:
            raise FileNotFoundError("No backup archive found to run drill.")
        archive_path = max(backups, key=os.path.getmtime)

    # 1. Clean and setup sandbox
    if os.path.exists(DRILL_DIR):
        shutil.rmtree(DRILL_DIR)
    os.makedirs(DRILL_DIR, exist_ok=True)

    # 2. Extract archive into sandbox
    with tarfile.open(archive_path, "r:gz") as tar:
        tar.extractall(path=DRILL_DIR)

    # Find the extracted root folder
    extracted_contents = os.listdir(DRILL_DIR)
    bundle_root = DRILL_DIR
    if len(extracted_contents) == 1 and os.path.isdir(os.path.join(DRILL_DIR, extracted_contents[0])):
        bundle_root = os.path.join(DRILL_DIR, extracted_contents[0])

    manifest_file = os.path.join(bundle_root, "manifest.json")
    if not os.path.exists(manifest_file):
        raise ValueError("Backup archive is corrupted: manifest.json missing.")

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 3. Verify file hashes against manifest
    integrity_results = {}
    all_hashes_matched = True

    for fname, meta in manifest.get("files", {}).items():
        if fname == "uploads":
            continue
        restored_path = os.path.join(bundle_root, fname)
        if not os.path.exists(restored_path):
            integrity_results[fname] = {"status": "MISSING"}
            all_hashes_matched = False
            continue

        calc_hash = compute_sha256(restored_path)
        expected_hash = meta.get("sha256")
        match = calc_hash == expected_hash
        if not match:
            all_hashes_matched = False
        integrity_results[fname] = {
            "status": "VALID" if match else "HASH_MISMATCH",
            "sha256_match": match
        }

    # 4. Execute SQLite PRAGMA integrity_check and query counts
    db_checks = {}
    core_db = os.path.join(bundle_root, "cem_core.db")
    if os.path.exists(core_db):
        conn = sqlite3.connect(core_db)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        check_res = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tb_ubicacion;")
        count_ubic = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tb_inhumacion;")
        count_inh = cursor.fetchone()[0]
        conn.close()
        db_checks["cem_core.db"] = {
            "integrity_check": check_res,
            "tb_ubicacion_count": count_ubic,
            "tb_inhumacion_count": count_inh,
            "healthy": check_res == "ok"
        }

    audit_db = os.path.join(bundle_root, "cem_audit.db")
    if os.path.exists(audit_db):
        conn = sqlite3.connect(audit_db)
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        check_audit = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM tb_log_auditoria;")
        count_audit = cursor.fetchone()[0]
        conn.close()
        db_checks["cem_audit.db"] = {
            "integrity_check": check_audit,
            "tb_log_auditoria_count": count_audit,
            "healthy": check_audit == "ok"
        }

    elapsed_seconds = time.perf_counter() - start_time
    rto_limit_seconds = 8 * 3600  # 8 hours maximum
    rto_compliant = elapsed_seconds <= rto_limit_seconds

    drill_success = all_hashes_matched and all(c["healthy"] for c in db_checks.values()) and rto_compliant

    report = {
        "drill_id": f"DRILL-{timestamp_drill}",
        "timestamp_utc": timestamp_drill,
        "archive_tested": os.path.basename(archive_path),
        "status": "DRILL_PASSED_INTEGRITY_VERIFIED" if drill_success else "FAILED",
        "all_hashes_matched": all_hashes_matched,
        "elapsed_recovery_seconds": round(elapsed_seconds, 4),
        "rto_target_hours": 8,
        "rto_compliant": rto_compliant,
        "integrity_results": integrity_results,
        "database_checks": db_checks
    }

    # Save formal drill report
    report_path = os.path.join(BACKUP_DIR, f"restore_drill_report_{timestamp_drill}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Clean sandbox after successful drill
    shutil.rmtree(DRILL_DIR)

    return report


if __name__ == "__main__":
    rep = run_restore_drill()
    print(json.dumps(rep, indent=2))
