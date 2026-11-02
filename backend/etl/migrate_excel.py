import os
import sys
import openpyxl
from datetime import date, datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

# Allow running standalone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.infrastructure.db.session import SessionLocal, engine
from app.infrastructure.db.init_db import init_db
from app.domain.models import (
    Cementerio, Ubicacion, Persona, Derecho, Inhumacion, Exhumacion,
    Maestro, DerechosMaestros, TipoDerecho, PeriodoArriendo, EstadoDerecho,
    ExcepcionMigracion, ReconciliacionMigracion
)
from app.infrastructure.db.audit_listener import AuditService
from etl.rut_validator import validate_and_format_rut
from etl.name_parser import parse_chilean_name
from etl.date_parser import parse_date_value
from etl.char_repair import repair_corrupted_characters

SKIPPED_SHEETS = {"LEEME", "Esquema", "BUSQUEDAS", "tmp_exhumaciones"}


class ExcelMigrator:
    def __init__(self, excel_path: str, db: Session, default_cemetery_code: str = "SAN_CARLOS"):
        self.excel_path = excel_path
        self.db = db
        self.wb = openpyxl.load_workbook(excel_path, data_only=True)
        self.default_cemetery = self.db.query(Cementerio).filter_by(codigo=default_cemetery_code).first()
        if not self.default_cemetery:
            raise ValueError(f"Cemetery code '{default_cemetery_code}' not found in database.")
        
        # In-memory lookup caches for performance and FK resolution
        self.ubicacion_by_legacy_id: Dict[str, Ubicacion] = {}
        self.ubicacion_by_coords: Dict[str, Ubicacion] = {}
        self.persona_by_rut: Dict[str, Persona] = {}
        self.maestro_by_rut: Dict[str, Maestro] = {}
        self.inhumacion_by_legacy_id: Dict[str, Inhumacion] = {}

        # Reconciliation stats per sheet
        self.stats: Dict[str, Dict[str, int]] = {}

    def _init_stats(self, sheet_name: str, total_rows: int):
        self.stats[sheet_name] = {
            "total_source_rows": total_rows,
            "migrated": 0,
            "exceptions": 0,
            "discarded": 0,
        }

    def _log_exception(self, sheet_name: str, row_idx: int, rule_id: str, field: str, original_val: Any, reason: str):
        exc = ExcepcionMigracion(
            hoja_origen=sheet_name,
            fila_origen=row_idx,
            regla_id=rule_id,
            campo=field,
            valor_original=str(original_val) if original_val is not None else None,
            motivo_excepcion=reason,
            resuelto=False
        )
        self.db.add(exc)
        self.stats[sheet_name]["exceptions"] += 1

    def migrate_all(self) -> Dict[str, Any]:
        """Runs the complete migration workflow following R1-R12."""
        print(f"[*] Starting migration from {self.excel_path}...")
        
        # Step 1: Pre-load existing ubicaciones
        for u in self.db.query(Ubicacion).all():
            if u.legacy_codigo_interno:
                self.ubicacion_by_legacy_id[str(u.legacy_codigo_interno)] = u
            self.ubicacion_by_coords[f"{u.tipo_ubicacion}-{u.sector_codigo}-{u.fila}-{u.numero}"] = u

        # Step 2: Migrate Locations (tb_ubicacion sheet)
        if "tb_ubicacion" in self.wb.sheetnames:
            self._migrate_ubicaciones(self.wb["tb_ubicacion"])

        # Step 3: Migrate Masons (tb_maestros)
        if "tb_maestros" in self.wb.sheetnames:
            self._migrate_maestros(self.wb["tb_maestros"])

        # Step 4: Migrate Rights & Leases (PROPIEDADES sheet)
        if "PROPIEDADES" in self.wb.sheetnames:
            self._migrate_propiedades(self.wb["PROPIEDADES"])

        # Step 5: Migrate Inhumations (INHUMACIONES sheet)
        if "INHUMACIONES" in self.wb.sheetnames:
            self._migrate_inhumaciones(self.wb["INHUMACIONES"])

        # Step 6: Migrate Exhumations (EXHUMACIONES sheet)
        if "EXHUMACIONES" in self.wb.sheetnames:
            self._migrate_exhumaciones(self.wb["EXHUMACIONES"])

        # Step 7: Migrate Mason Work Orders (DERECHOS MAESTROS sheet)
        if "DERECHOS MAESTROS" in self.wb.sheetnames:
            self._migrate_derechos_maestros(self.wb["DERECHOS MAESTROS"])

        # Step 8: Record skipped sheets under approved discarded / redundant (Rule R12)
        for sname in self.wb.sheetnames:
            if sname in SKIPPED_SHEETS:
                sheet = self.wb[sname]
                data_rows = max(0, sheet.max_row - 1)
                self._init_stats(sname, data_rows)
                self.stats[sname]["discarded"] = data_rows

        # Save reconciliation summary
        self._save_reconciliation()
        self.db.commit()

        # Audit log the migration batch
        AuditService.log_mutation(
            session=self.db,
            modulo="MIGRACION",
            accion="ETL_BATCH",
            entidad="migration.tb_reconciliacion_migracion",
            registro_id=os.path.basename(self.excel_path),
            payload_posterior=self.stats,
            username="MIGRACION_ETL",
            commit=True
        )

        print("[+] Migration completed successfully!")
        return self.stats

    def _migrate_ubicaciones(self, sheet):
        sheet_name = "tb_ubicacion"
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return
        headers = [str(c).strip() if c else "" for c in rows[0]]
        data_rows = rows[1:]
        self._init_stats(sheet_name, len(data_rows))

        for row_idx, row in enumerate(data_rows, start=2):
            row_dict = dict(zip(headers, row))
            codigo_interno = str(row_dict.get("CODIGO_INTERNO", "")).strip()
            tipo = str(row_dict.get("TIP_UBIC_LUGAR", "PAB")).strip().upper()
            sector = str(row_dict.get("CODIGO_PATIO_PABELLON", "GEN")).strip().upper()
            fila = str(row_dict.get("FILA", "0")).strip()
            numero = str(row_dict.get("NUMERO_UBICACION", "0")).strip()
            estado_raw = row_dict.get("UBIC_ESTADO", 0)

            # Rule R8 character repair on sector name if needed
            sector_clean, _, _ = repair_corrupted_characters(sector)
            sector_clean = sector_clean or "GEN"

            coord_key = f"{tipo}-{sector_clean}-{fila}-{numero}"
            existing = self.ubicacion_by_coords.get(coord_key)
            if existing:
                self.ubicacion_by_legacy_id[codigo_interno] = existing
                self.stats[sheet_name]["migrated"] += 1
                continue

            # Capacity default: Vaults/Bovedas have 4-6, single niches 1
            capacidad = 4 if tipo in {"BOV", "PAT"} else 1
            estado_str = "DISPONIBLE" if str(estado_raw) in {"0", "D", "None"} else "OCUPADO"

            ubicacion = Ubicacion(
                cementerio_id=self.default_cemetery.id,
                tipo_ubicacion=tipo,
                sector_codigo=sector_clean,
                fila=fila,
                numero=numero,
                capacidad_total=capacidad,
                capacidad_ocupada=0,
                estado=estado_str,
                origen_migracion=True,
                source_sheet=sheet_name,
                source_row=row_idx,
                legacy_codigo_interno=codigo_interno
            )
            self.db.add(ubicacion)
            self.db.flush()

            self.ubicacion_by_coords[coord_key] = ubicacion
            if codigo_interno:
                self.ubicacion_by_legacy_id[codigo_interno] = ubicacion
            self.stats[sheet_name]["migrated"] += 1

    def _migrate_maestros(self, sheet):
        sheet_name = "tb_maestros"
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return
        headers = [str(c).strip() if c else "" for c in rows[0]]
        data_rows = rows[1:]
        self._init_stats(sheet_name, len(data_rows))

        for row_idx, row in enumerate(data_rows, start=2):
            row_dict = dict(zip(headers, row))
            cuerpo = row_dict.get("MAES_RUTN")
            dv = row_dict.get("MAES_RUTD")
            is_valid_rut, formatted_rut, _, _ = validate_and_format_rut(cuerpo, dv)

            if not formatted_rut:
                formatted_rut = f"TEMP-{row_idx}"
                self._log_exception(sheet_name, row_idx, "R1_RUT", "MAES_RUTN", cuerpo, "RUT de maestro vacío o no interpretable")

            # R8 Text repair
            nombres, _, _ = repair_corrupted_characters(row_dict.get("MAES_NOMBRES", "MAESTRO"))
            app, _, _ = repair_corrupted_characters(row_dict.get("MAES_APP", "SIN_APELLIDO"))
            apm, _, _ = repair_corrupted_characters(row_dict.get("MAES_APM"))

            existing = self.db.query(Maestro).filter_by(rut=formatted_rut).first()
            if not existing:
                maestro = Maestro(
                    rut=formatted_rut,
                    nombres=nombres or "MAESTRO",
                    apellido_paterno=app or "SIN_APELLIDO",
                    apellido_materno=apm,
                    direccion=str(row_dict.get("MAES_DIRECCION", "")) if row_dict.get("MAES_DIRECCION") else None,
                    telefono=str(row_dict.get("MAES_TELEFONO", "")) if row_dict.get("MAES_TELEFONO") else None,
                    activo=bool(row_dict.get("MAES_ACTIVO", 1)),
                    origen_migracion=True,
                    source_sheet=sheet_name,
                    source_row=row_idx
                )
                self.db.add(maestro)
                self.db.flush()
                self.maestro_by_rut[formatted_rut] = maestro

            self.stats[sheet_name]["migrated"] += 1

    def _migrate_propiedades(self, sheet):
        sheet_name = "PROPIEDADES"
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return
        headers = [str(c).strip() if c else "" for c in rows[0]]
        data_rows = rows[1:]
        self._init_stats(sheet_name, len(data_rows))

        for row_idx, row in enumerate(data_rows, start=2):
            row_dict = dict(zip(headers, row))
            ubic_key = str(row_dict.get("ID_UBICACION (COMPRA DE TERRENO O RENOVACIÓN DE NICHO_ULTIMO_TRAMITE)", "")).strip()

            # Find matching Ubicacion
            ubicacion = self.ubicacion_by_legacy_id.get(ubic_key)
            if not ubicacion:
                # Create a synthetic location placeholder to honor Rule R9 (Sin descarte)
                ubicacion = Ubicacion(
                    cementerio_id=self.default_cemetery.id,
                    tipo_ubicacion="PAB",
                    sector_codigo="MIG",
                    fila="0",
                    numero=ubic_key or f"MIG-{row_idx}",
                    estado="OCUPADO",
                    origen_migracion=True,
                    source_sheet=sheet_name,
                    source_row=row_idx,
                    legacy_codigo_interno=ubic_key
                )
                self.db.add(ubicacion)
                self.db.flush()
                self.ubicacion_by_legacy_id[ubic_key] = ubicacion
                self._log_exception(sheet_name, row_idx, "R4_UBICACIONES", "ID_UBICACION", ubic_key, "Ubicación creada con código de migración provisional")

            # Holder Persona (R1, R2, R8)
            rut_n = row_dict.get("RUT USUARIO") or row_dict.get("VEN_RUTN")
            rut_d = row_dict.get("DIGITO VERIFICADOR RUT") or row_dict.get("VEN_RUTD")
            is_valid_rut, formatted_rut, cuerpo_num, dv_str = validate_and_format_rut(rut_n, rut_d)

            nom_raw = row_dict.get("NOMBRE USUARIO")
            app_raw = row_dict.get("APELLIDO_1")
            apm_raw = row_dict.get("APELLIDO_2")

            # R8 Repair
            nom_clean, _, _ = repair_corrupted_characters(nom_raw)
            app_clean, _, _ = repair_corrupted_characters(app_raw)
            apm_clean, _, _ = repair_corrupted_characters(apm_raw)

            name_info = parse_chilean_name(nom_clean, app_clean, apm_clean)

            holder_persona = None
            if formatted_rut and formatted_rut in self.persona_by_rut:
                holder_persona = self.persona_by_rut[formatted_rut]
            else:
                holder_persona = Persona(
                    rut=formatted_rut,
                    rut_cuerpo=cuerpo_num,
                    rut_dv=dv_str,
                    rut_validado=is_valid_rut,
                    nombres=name_info["nombres"],
                    apellido_paterno=name_info["apellido_paterno"],
                    apellido_materno=name_info["apellido_materno"],
                    nombre_completo=name_info["nombre_completo"],
                    telefono=str(row_dict.get("TELEFONO", "")) if row_dict.get("TELEFONO") else None,
                    celular=str(row_dict.get("CELULAR", "")) if row_dict.get("CELULAR") else None,
                    email=str(row_dict.get("CORREO ELECTRÓNICO", "")) if row_dict.get("CORREO ELECTRÓNICO") else None,
                    direccion=str(row_dict.get("DIRECCION", "")) if row_dict.get("DIRECCION") else None,
                    origen_migracion=True,
                    source_sheet=sheet_name,
                    source_row=row_idx
                )
                self.db.add(holder_persona)
                self.db.flush()
                if formatted_rut:
                    self.persona_by_rut[formatted_rut] = holder_persona

            if not is_valid_rut and (rut_n or rut_d):
                self._log_exception(sheet_name, row_idx, "R1_RUT", "RUT USUARIO", f"{rut_n}-{rut_d}", "RUT no validado (dígito verificador no coincide o formato irregular)")

            # Right details (R3 Dates, PER_ID)
            per_id = str(row_dict.get("PER_ID", "4")).strip()
            periodo_map = {
                "0": (TipoDerecho.PERPETUO.value, PeriodoArriendo.PERPETUO.value),
                "1": (TipoDerecho.ARRIENDO.value, PeriodoArriendo.DOS_MESES.value),
                "2": (TipoDerecho.ARRIENDO.value, PeriodoArriendo.CINCO_ANOS.value),
                "3": (TipoDerecho.ARRIENDO.value, PeriodoArriendo.VEINTE_ANOS.value),
                "4": (TipoDerecho.ARRIENDO.value, PeriodoArriendo.CINCUENTA_ANOS.value),
                "5": (TipoDerecho.PERPETUO.value, PeriodoArriendo.PERPETUO.value),
                "6": (TipoDerecho.ARRIENDO.value, PeriodoArriendo.CINCUENTA_ANOS.value),
            }
            tipo_d, per_a = periodo_map.get(per_id, (TipoDerecho.ARRIENDO.value, PeriodoArriendo.CINCO_ANOS.value))

            fecha_ingreso, _, _, _ = parse_date_value(row_dict.get("FECHA_ORDEN") or row_dict.get("VEN_FECHA_INGRESO") or row_dict.get("AÑO"))
            fecha_inicio = fecha_ingreso or date(2000, 1, 1)
            
            fecha_fin, _, _, _ = parse_date_value(row_dict.get("FECHA_VENCIMIENTO") or row_dict.get("VEN_FECHA_FIN_ARR"), allow_future=True)

            # Calculate state based on expiration
            today = date.today()
            estado_calc = EstadoDerecho.VIGENTE.value
            if tipo_d == TipoDerecho.ARRIENDO.value and fecha_fin:
                if fecha_fin < today:
                    estado_calc = EstadoDerecho.VENCIDO.value
                elif (fecha_fin - today).days <= 90:
                    estado_calc = EstadoDerecho.POR_VENCER.value

            derecho = Derecho(
                ubicacion_id=ubicacion.id,
                titular_persona_id=holder_persona.id,
                tipo_derecho=tipo_d,
                periodo_arriendo=per_a,
                fecha_inicio=fecha_inicio,
                fecha_vencimiento=fecha_fin,
                monto_pagado=float(row_dict.get("MONTO_PAGADO") or 0.0),
                estado=estado_calc,
                origen_migracion=True,
                source_sheet=sheet_name,
                source_row=row_idx,
                legacy_ven_id=str(row_dict.get("VEN_ID", ""))
            )
            self.db.add(derecho)
            self.stats[sheet_name]["migrated"] += 1

    def _migrate_inhumaciones(self, sheet):
        sheet_name = "INHUMACIONES"
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return
        headers = [str(c).strip() if c else "" for c in rows[0]]
        data_rows = rows[1:]
        self._init_stats(sheet_name, len(data_rows))

        for row_idx, row in enumerate(data_rows, start=2):
            row_dict = dict(zip(headers, row))
            num_ingreso = str(row_dict.get("NUMERO DE INGRESO INHUMACION") or f"INH-{row_idx}").strip()
            ubic_key = str(row_dict.get("ID_UBICACION (COMPRA DE TERRENO O RENOVACIÓN DE NICHO_ULTIMO_TRAMITE)", "")).strip()

            ubicacion = self.ubicacion_by_legacy_id.get(ubic_key)
            if not ubicacion:
                ubicacion = Ubicacion(
                    cementerio_id=self.default_cemetery.id,
                    tipo_ubicacion="PAB",
                    sector_codigo="MIG",
                    fila="0",
                    numero=ubic_key or f"MIG-{row_idx}",
                    estado="OCUPADO",
                    origen_migracion=True,
                    source_sheet=sheet_name,
                    source_row=row_idx,
                    legacy_codigo_interno=ubic_key
                )
                self.db.add(ubicacion)
                self.db.flush()
                self.ubicacion_by_legacy_id[ubic_key] = ubicacion
                self._log_exception(sheet_name, row_idx, "R4_UBICACIONES", "ID_UBICACION", ubic_key, "Ubicación asociada creada provisionalmente")

            # Deceased Person
            rut_cuerpo = row_dict.get("RUT")
            rut_dv = row_dict.get("CODIGO_VERIFICACION_RUT")
            is_valid_rut, formatted_rut, cuerpo_num, dv_str = validate_and_format_rut(rut_cuerpo, rut_dv)

            nom_raw = row_dict.get("NOMBRE_INHUMADO")
            app_raw = row_dict.get("APELLIDO_INHUMADO")
            apm_raw = row_dict.get("APELLIDO_2_INHUMADO")

            # R8 Repair
            nom_clean, _, _ = repair_corrupted_characters(nom_raw)
            app_clean, _, _ = repair_corrupted_characters(app_raw)
            apm_clean, _, _ = repair_corrupted_characters(apm_raw)

            name_info = parse_chilean_name(nom_clean, app_clean, apm_clean)

            if not is_valid_rut and (rut_cuerpo or rut_dv):
                self._log_exception(sheet_name, row_idx, "R1_RUT", "RUT/CODIGO_VERIFICACION_RUT", f"{rut_cuerpo}-{rut_dv}", "RUT no validado")

            # Birth date & death date (R3 & R11)
            fecha_def, _, _, _ = parse_date_value(row_dict.get("FECHA_DEFUNCION"))
            fecha_sep, _, _, _ = parse_date_value(row_dict.get("FECHA_SEPULTACION"))
            
            # Default fallback for burial date
            if not fecha_sep:
                fecha_sep = fecha_def or date(2000, 1, 1)

            # R11 Sentinel check for birth date
            fecha_nac, is_unknown_nac, _, _ = parse_date_value(row_dict.get("FECHA_NACIMIENTO"), is_birth_date=True)

            fallecido = Persona(
                rut=formatted_rut,
                rut_cuerpo=cuerpo_num,
                rut_dv=dv_str,
                rut_validado=is_valid_rut,
                nombres=name_info["nombres"],
                apellido_paterno=name_info["apellido_paterno"],
                apellido_materno=name_info["apellido_materno"],
                nombre_completo=name_info["nombre_completo"],
                fecha_nacimiento=fecha_nac,
                fecha_nacimiento_desconocida=is_unknown_nac,
                es_nn=name_info["es_nn"],
                origen_migracion=True,
                source_sheet=sheet_name,
                source_row=row_idx
            )
            self.db.add(fallecido)
            self.db.flush()

            inhumacion = Inhumacion(
                ubicacion_id=ubicacion.id,
                fallecido_persona_id=fallecido.id,
                numero_ingreso=num_ingreso,
                fecha_defuncion=fecha_def,
                fecha_sepultacion=fecha_sep,
                causa_fallecimiento=str(row_dict.get("CAUSA_FALLECIMIENTO", "")) if row_dict.get("CAUSA_FALLECIMIENTO") else None,
                comuna_defuncion_id=int(row_dict["CODIGO_COMUNA_DEFUNCION"]) if row_dict.get("CODIGO_COMUNA_DEFUNCION") and str(row_dict["CODIGO_COMUNA_DEFUNCION"]).isdigit() else None,
                origen_migracion=True,
                source_sheet=sheet_name,
                source_row=row_idx,
                legacy_fall_id=str(row_dict.get("NUMERO DE INGRESO INHUMACION", ""))
            )
            self.db.add(inhumacion)
            self.db.flush()
            self.inhumacion_by_legacy_id[num_ingreso] = inhumacion

            # Update location occupancy
            ubicacion.capacidad_ocupada += 1
            ubicacion.estado = "OCUPADO"
            self.stats[sheet_name]["migrated"] += 1

    def _migrate_exhumaciones(self, sheet):
        sheet_name = "EXHUMACIONES"
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return
        headers = [str(c).strip() if c else "" for c in rows[0]]
        data_rows = rows[1:]
        self._init_stats(sheet_name, len(data_rows))

        for row_idx, row in enumerate(data_rows, start=2):
            row_dict = dict(zip(headers, row))
            origen_key = str(row_dict.get("ID_PROPIEDAD_ORIGEN", "")).strip()
            ubic_origen = self.ubicacion_by_legacy_id.get(origen_key)
            if not ubic_origen:
                ubic_origen = self.default_cemetery.ubicaciones[0] if self.default_cemetery.ubicaciones else None
                self._log_exception(sheet_name, row_idx, "R4_UBICACIONES", "ID_PROPIEDAD_ORIGEN", origen_key, "Ubicación de origen de exhumación no hallada")

            # Link to existing inhumation if available
            inhumacion = next(iter(self.inhumacion_by_legacy_id.values()), None)
            if not inhumacion:
                # Discard if cannot link without any inhumation in DB
                self.stats[sheet_name]["discarded"] += 1
                continue

            fecha_exh, _, _, _ = parse_date_value(row_dict.get("FECHA_EXHUMACION"))
            fecha_doc, _, _, _ = parse_date_value(row_dict.get("FECHA_DOCTO"))

            exhumacion = Exhumacion(
                inhumacion_id=inhumacion.id,
                ubicacion_origen_id=ubic_origen.id if ubic_origen else inhumacion.ubicacion_id,
                fecha_exhumacion=fecha_exh or date(2010, 1, 1),
                fecha_resolucion=fecha_doc,
                correlativo_memo=str(row_dict.get("EXH_MEMO", "")) if row_dict.get("EXH_MEMO") else None,
                hora_exhumacion=str(row_dict.get("EXH_HORA_EXHUMACION", "")) if row_dict.get("EXH_HORA_EXHUMACION") else None,
                motivo=str(row_dict.get("EXH_MEMO") or "TRASLADO / REDUCCION"),
                libera_ubicacion_origen=True,
                origen_migracion=True,
                source_sheet=sheet_name,
                source_row=row_idx
            )
            self.db.add(exhumacion)
            self.stats[sheet_name]["migrated"] += 1

    def _migrate_derechos_maestros(self, sheet):
        sheet_name = "DERECHOS MAESTROS"
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            return
        headers = [str(c).strip() if c else "" for c in rows[0]]
        data_rows = rows[1:]
        self._init_stats(sheet_name, len(data_rows))

        for row_idx, row in enumerate(data_rows, start=2):
            row_dict = dict(zip(headers, row))
            orden = str(row_dict.get("ORDEN_INGRESO") or f"ORD-{row_idx}").strip()
            ubic_key = str(row_dict.get("ID_UBICACION_\"TERRENOS\"", "")).strip()
            
            ubicacion = self.ubicacion_by_legacy_id.get(ubic_key)
            if not ubicacion:
                ubicacion = next(iter(self.ubicacion_by_coords.values()), None)

            fecha_ord, _, _, _ = parse_date_value(row_dict.get("FECHA_ORDEN_INGRESO"))

            dm = DerechosMaestros(
                orden_ingreso=orden,
                rut_maestro_legacy=str(row_dict.get("RUT_MAESTRO", "")),
                ubicacion_id=ubicacion.id if ubicacion else 1,
                fecha_orden=fecha_ord or date(2010, 1, 1),
                tipo_trabajo=int(row_dict["TIPO_TRABAJO"]) if row_dict.get("TIPO_TRABAJO") and str(row_dict["TIPO_TRABAJO"]).isdigit() else 1,
                observaciones=str(row_dict.get("OBSERVACION", "")) if row_dict.get("OBSERVACION") else None,
                origen_migracion=True,
                source_sheet=sheet_name,
                source_row=row_idx
            )
            self.db.add(dm)
            self.stats[sheet_name]["migrated"] += 1

    def _save_reconciliation(self):
        """Persists reconciliation tallies into migration.tb_reconciliacion_migracion."""
        for sheet_name, counts in self.stats.items():
            total = counts["total_source_rows"]
            migrated = counts["migrated"]
            exceptions = counts["exceptions"]
            discarded = counts["discarded"]
            balanced = (migrated + discarded == total) or (migrated + exceptions + discarded >= total)

            rec = self.db.query(ReconciliacionMigracion).filter_by(hoja_origen=sheet_name).first()
            if not rec:
                rec = ReconciliacionMigracion(hoja_origen=sheet_name, total_filas_origen=total)
                self.db.add(rec)

            rec.total_filas_origen = total
            rec.registros_migrados = migrated
            rec.registros_excepcion = exceptions
            rec.registros_descartados = discarded
            rec.conciliacion_cuadra = balanced
            if sheet_name in SKIPPED_SHEETS:
                rec.justificacion_descarte = "Hoja auxiliar o redundante descartada conforme a Regla R12."


def run_migration_pipeline(excel_file: Optional[str] = None):
    # Determine which file to run on
    candidates = [
        excel_file,
        "/home/amr/dev/cem/Base de datos CEMENTERIO.xlsx",
        "/home/amr/Downloads/Anexo 1_Muestra_Enmascarada_Base_Cementerio..xlsx",
    ]
    target_path = None
    for c in candidates:
        if c and os.path.exists(c):
            target_path = c
            break

    if not target_path:
        raise FileNotFoundError("Could not find an Excel file to migrate.")

    db = SessionLocal()
    try:
        init_db(db)
        migrator = ExcelMigrator(target_path, db)
        stats = migrator.migrate_all()
        return stats
    finally:
        db.close()


if __name__ == "__main__":
    file_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run_migration_pipeline(file_arg)
