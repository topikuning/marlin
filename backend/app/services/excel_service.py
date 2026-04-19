import pandas as pd
import numpy as np
from typing import Optional, Tuple
from decimal import Decimal
import re
from datetime import date


def safe_float(val) -> float:
    """Konversi nilai apapun (termasuk scientific notation) ke float."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def safe_decimal(val) -> Decimal:
    return Decimal(str(safe_float(val)))


def parse_progress_xlsx(filepath: str) -> dict:
    """
    Parse file Excel laporan progress mingguan dari konsultan.
    Format sesuai file PROGRES_M_18___100__.xlsx yang telah dianalisis.
    Returns dict berisi semua data yang bisa diparse.
    """
    result = {
        "success": False,
        "week_number": None,
        "period_start": None,
        "period_end": None,
        "contract_number": None,
        "contract_value": None,
        "planned_weekly_pct": 0.0,
        "planned_cumulative_pct": 0.0,
        "actual_weekly_pct": 0.0,
        "actual_cumulative_pct": 0.0,
        "deviation_pct": 0.0,
        "days_elapsed": 0,
        "days_remaining": 0,
        "manpower_count": 0,
        "obstacles": "",
        "solutions": "",
        "progress_items": [],
        "warnings": [],
        "errors": [],
    }

    try:
        all_sheets = pd.read_excel(filepath, sheet_name=None, header=None)
    except Exception as e:
        result["errors"].append(f"Tidak bisa membaca file: {str(e)}")
        return result

    # ── 1. Parse sheet pengantar / cover ─────────────────────────────────────
    _parse_cover_sheet(all_sheets, result)

    # ── 2. Parse sheet laporan umum ──────────────────────────────────────────
    _parse_umum_sheet(all_sheets, result)

    # ── 3. Parse sheet kurva S / progress ───────────────────────────────────
    _parse_scurve_sheet(all_sheets, result)

    result["success"] = len(result["errors"]) == 0
    return result


def _parse_cover_sheet(sheets: dict, result: dict):
    """Cari nomor kontrak, nilai kontrak, minggu, dari sheet pertama."""
    for sheet_name, df in sheets.items():
        if df is None or df.empty:
            continue
        text = df.to_string()

        # Nomor kontrak
        contract_match = re.search(
            r'(B\.\d+/DJPT[^/]*/PI\.\d+/PPK/[^/\s]+)',
            text
        )
        if contract_match and not result["contract_number"]:
            result["contract_number"] = contract_match.group(1).strip()

        # Nilai kontrak
        for _, row in df.iterrows():
            for cell in row:
                if isinstance(cell, (int, float)) and not np.isnan(cell if isinstance(cell, float) else 0):
                    v = float(cell)
                    if 5_000_000_000 <= v <= 50_000_000_000:  # Range wajar nilai kontrak
                        result["contract_value"] = v

        # Minggu ke-N
        week_match = re.search(r'[Mm]inggu\s+[Kk]e[- ]?(\d+)', text)
        if week_match and not result["week_number"]:
            result["week_number"] = int(week_match.group(1))

        # Periode
        period_match = re.search(
            r'(\d{1,2})\s+([A-Za-z]+)\s+s/d\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})',
            text
        )
        if period_match:
            try:
                months = {
                    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
                    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
                    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
                }
                d1, m1, d2, m2, yr = period_match.groups()
                m1_num = months.get(m1.lower(), 1)
                m2_num = months.get(m2.lower(), 1)
                result["period_start"] = date(int(yr), m1_num, int(d1))
                result["period_end"] = date(int(yr), m2_num, int(d2))
            except Exception:
                pass


def _parse_umum_sheet(sheets: dict, result: dict):
    """Parse laporan umum untuk deviasi, waktu, hambatan."""
    for sheet_name, df in sheets.items():
        if df is None or df.empty:
            continue
        if "umum" not in sheet_name.lower() and "laporan" not in sheet_name.lower():
            continue

        for i, row in df.iterrows():
            row_str = " ".join(str(v) for v in row if pd.notna(v)).lower()

            if "prestasi dicapai" in row_str or "progress realisasi" in row_str:
                for cell in row:
                    v = safe_float(cell)
                    if 0 < v <= 1.01:
                        result["actual_cumulative_pct"] = v
                        break

            if "prestasi menurut rencana" in row_str or "progress rencana" in row_str:
                for cell in row:
                    v = safe_float(cell)
                    if 0 < v <= 1.01:
                        result["planned_cumulative_pct"] = v
                        break

            if "deviasi" in row_str and "kumulatif" in row_str:
                for cell in row:
                    v = safe_float(cell)
                    if -0.5 <= v <= 0.5 and v != 0:
                        result["deviation_pct"] = v
                        break

            if "waktu yang telah berjalan" in row_str:
                for cell in row:
                    v = safe_float(cell)
                    if 1 <= v <= 1000:
                        result["days_elapsed"] = int(v)
                        break

            if "sisa waktu" in row_str:
                for cell in row:
                    v = safe_float(cell)
                    if -365 <= v <= 1000:
                        result["days_remaining"] = int(v)
                        break

            if "cuaca" in row_str or "hambatan" in row_str or "masalah" in row_str:
                non_null = [str(v) for v in row if pd.notna(v) and str(v).strip()]
                if len(non_null) > 1:
                    result["obstacles"] = (result["obstacles"] + "; " + " ".join(non_null)).strip("; ")

            if "saran" in row_str or "tindak lanjut" in row_str:
                non_null = [str(v) for v in row if pd.notna(v) and str(v).strip()]
                if len(non_null) > 1:
                    result["solutions"] = (result["solutions"] + "; " + " ".join(non_null)).strip("; ")


def _parse_scurve_sheet(sheets: dict, result: dict):
    """Parse sheet kurva S untuk item pekerjaan dan bobot masing-masing."""
    target_sheet = None
    for sheet_name, df in sheets.items():
        sn_lower = sheet_name.lower()
        if "progres" in sn_lower or "kurva" in sn_lower or "ts" in sn_lower:
            if "m1" in sn_lower or "minggu" in sn_lower or "grafik" in sn_lower:
                target_sheet = df
                break

    if target_sheet is None:
        # Coba sheet apapun yang punya kolom "BOBOT"
        for sheet_name, df in sheets.items():
            if df is not None and not df.empty:
                text = df.to_string().upper()
                if "BOBOT" in text and "PEKERJAAN" in text:
                    target_sheet = df
                    break

    if target_sheet is None:
        result["warnings"].append("Sheet kurva S tidak ditemukan, progress item tidak diimport")
        return

    items = []
    for i, row in target_sheet.iterrows():
        row_vals = list(row)
        row_str = " ".join(str(v) for v in row_vals if pd.notna(v))

        # Cari baris yang punya item pekerjaan
        if "PEKERJAAN" not in row_str.upper():
            continue

        # Cari nomor item (kolom pertama numerik atau kode)
        item_code = None
        item_desc = None
        bobot = None
        contract_val = None
        cco_val = None

        for j, cell in enumerate(row_vals):
            if pd.isna(cell):
                continue
            cell_str = str(cell).strip()

            # Kode item
            if re.match(r'^[\d.]+$', cell_str) and not item_code:
                item_code = cell_str

            # Deskripsi pekerjaan
            if "PEKERJAAN" in cell_str.upper() and len(cell_str) > 10:
                item_desc = cell_str

            # Bobot (nilai kecil antara 0 dan 1)
            v = safe_float(cell)
            if 0 < v < 1 and bobot is None and j > 3:
                bobot = v

            # Nilai kontrak (miliar range)
            if 1_000_000 < v < 100_000_000_000 and contract_val is None and j > 2:
                contract_val = v

        if item_desc and bobot:
            items.append({
                "original_code": item_code or str(len(items) + 1),
                "description": item_desc,
                "weight_pct": bobot,
                "contract_value": contract_val or 0,
                "cco_value": cco_val or contract_val or 0,
                "volume_cumulative": 0.0,
                "progress_cumulative_pct": 0.0,
                "notes": "",
            })

    # Parse progress aktual per item dari kolom terakhir
    # (biasanya kolom paling kanan adalah progress kumulatif)
    if items:
        result["progress_items"] = items
        result["warnings"].append(f"Berhasil parse {len(items)} item pekerjaan dari sheet kurva S")
    else:
        result["warnings"].append("Tidak ada item pekerjaan berhasil diparse dari sheet kurva S")
