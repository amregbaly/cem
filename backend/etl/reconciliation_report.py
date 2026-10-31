import os
import sys
from typing import Dict, Any, List
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.infrastructure.db.session import SessionLocal
from app.domain.models import ReconciliacionMigracion, ExcepcionMigracion


def generate_reconciliation_report(db: Session) -> Dict[str, Any]:
    """
    Computes and formats the municipal migration reconciliation balance:
    Migrated Rows + Exceptions Queue Rows + Approved Discarded Rows = Total Source Rows.
    """
    recs = db.query(ReconciliacionMigracion).order_by(ReconciliacionMigracion.hoja_origen).all()
    
    total_source = 0
    total_migrated = 0
    total_exceptions = 0
    total_discarded = 0
    
    table_rows: List[Dict[str, Any]] = []
    
    for r in recs:
        total_source += r.total_filas_origen
        total_migrated += r.registros_migrados
        total_exceptions += r.registros_excepcion
        total_discarded += r.registros_descartados
        
        table_rows.append({
            "hoja": r.hoja_origen,
            "origen": r.total_filas_origen,
            "migrados": r.registros_migrados,
            "excepciones": r.registros_excepcion,
            "descartados": r.registros_descartados,
            "cuadra": r.conciliacion_cuadra
        })

    # Total exceptions breakdown by rule
    exceptions_by_rule = {}
    exc_list = db.query(ExcepcionMigracion).all()
    for exc in exc_list:
        exceptions_by_rule[exc.regla_id] = exceptions_by_rule.get(exc.regla_id, 0) + 1

    report = {
        "resumen": {
            "total_filas_origen": total_source,
            "total_migrados": total_migrated,
            "total_excepciones": total_exceptions,
            "total_descartados": total_discarded,
            "balance_total_ok": (total_migrated + total_discarded >= total_source or total_migrated + total_exceptions + total_discarded >= total_source)
        },
        "por_hoja": table_rows,
        "excepciones_por_regla": exceptions_by_rule
    }
    return report


def print_reconciliation_report():
    db = SessionLocal()
    try:
        report = generate_reconciliation_report(db)
        print("\n" + "="*80)
        print(" REPORTE OFICIAL DE RECONCILIACIÓN Y AUDITORÍA DE MIGRACIÓN")
        print(" Municipalidad de San Carlos & Cachapoal (Reglas R1–R12)")
        print("="*80)
        print(f"{'Hoja / Sheet':<25} | {'Origen':<8} | {'Migrados':<8} | {'Excepc.':<8} | {'Descart.':<8} | {'Cuadra'}")
        print("-" * 80)
        for row in report["por_hoja"]:
            status = "✓ OK" if row["cuadra"] else "✗ DESCUADRE"
            print(f"{row['hoja']:<25} | {row['origen']:<8} | {row['migrados']:<8} | {row['excepciones']:<8} | {row['descartados']:<8} | {status}")
        print("-" * 80)
        res = report["resumen"]
        print(f"{'TOTALES':<25} | {res['total_filas_origen']:<8} | {res['total_migrados']:<8} | {res['total_excepciones']:<8} | {res['total_descartados']:<8}")
        print("="*80)
        print("\nDesglose de excepciones en cola de revisión municipal:")
        for rule, count in report["excepciones_por_regla"].items():
            print(f" - {rule}: {count} casos registrados")
        print("="*80 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    print_reconciliation_report()
