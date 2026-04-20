from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date
import tempfile, os
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import (
    WeeklyReport, WeeklyProgressItem, BOQItem,
    Contract, DeviationStatus, UserRole
)
from app.schemas.schemas import WeeklyReportCreate, ExcelImportResult
from app.services.progress_service import (
    get_deviation_status, calculate_spi, run_early_warning_check
)
from app.services.excel_service import parse_progress_xlsx

router = APIRouter(prefix="/reports", tags=["reports"])


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _parse_date(s):
    if not s:
        return None
    if isinstance(s, date):
        return s
    try:
        return date.fromisoformat(str(s)[:10])
    except Exception:
        return None


def _pct_to_decimal(v):
    """Konversi persen (45.5) ke desimal (0.455). Toleran terhadap kedua format."""
    v = float(v or 0)
    return Decimal(str(v / 100)) if v > 1 else Decimal(str(v))


def _report_dict(r: WeeklyReport, detail: bool = False) -> dict:
    d = {
        "id":                     str(r.id),
        "contract_id":            str(r.contract_id),
        "week_number":            r.week_number,
        "period_start":           str(r.period_start),
        "period_end":             str(r.period_end),
        "report_date":            str(r.report_date) if r.report_date else None,
        "planned_cumulative_pct": float(r.planned_cumulative_pct or 0) * 100,
        "actual_cumulative_pct":  float(r.actual_cumulative_pct  or 0) * 100,
        "planned_weekly_pct":     float(r.planned_weekly_pct     or 0) * 100,
        "actual_weekly_pct":      float(r.actual_weekly_pct      or 0) * 100,
        "deviation_pct":          float(r.deviation_pct          or 0) * 100,
        "deviation_status":       r.deviation_status.value if hasattr(r.deviation_status, "value") else r.deviation_status,
        "spi":                    float(r.spi or 0),
        "days_elapsed":           r.days_elapsed or 0,
        "days_remaining":         r.days_remaining or 0,
        "manpower_count":         r.manpower_count or 0,
        "manpower_skilled":       r.manpower_skilled or 0,
        "manpower_unskilled":     r.manpower_unskilled or 0,
        "rain_days":              r.rain_days or 0,
        "obstacles":              r.obstacles,
        "solutions":              r.solutions,
        "submitted_by":           r.submitted_by,
        "import_source":          r.import_source or "manual",
        "is_locked":              r.is_locked or False,
        "photos":                 [
            {"id": str(p.id), "file_path": p.file_path, "caption": p.caption}
            for p in (r.photos or [])
        ],
        "created_at":             str(r.created_at),
    }
    if detail:
        d["items"] = [{
            "boq_item_id":             str(pi.boq_item_id),
            "description":             pi.boq_item.description if pi.boq_item else "",
            "unit":                    pi.boq_item.unit if pi.boq_item else "",
            "volume":                  float(pi.boq_item.volume or 0) if pi.boq_item else 0,
            "weight_pct":              float(pi.boq_item.weight_pct or 0) * 100 if pi.boq_item else 0,
            "volume_this_week":        float(pi.volume_this_week or 0),
            "volume_cumulative":       float(pi.volume_cumulative or 0),
            "progress_cumulative_pct": float(pi.progress_cumulative_pct or 0) * 100,
        } for pi in (r.progress_items or [])]
    return d


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.get("/{contract_id}")
def list_reports(
    contract_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id
    ).order_by(WeeklyReport.week_number.desc()).all()
    return [_report_dict(r) for r in rows]


@router.get("/{contract_id}/week/{week_number}")
def get_report(
    contract_id: str,
    week_number: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    r = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == week_number,
    ).first()
    if not r:
        raise HTTPException(404, "Laporan tidak ditemukan")
    return _report_dict(r, detail=True)


@router.post("/{contract_id}")
def create_report(
    contract_id: str,
    data: WeeklyReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Cek duplikat
    if db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == data.week_number,
    ).first():
        raise HTTPException(400, f"Laporan minggu {data.week_number} sudah ada")

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Kontrak tidak ditemukan")

    ps = _parse_date(data.period_start)
    pe = _parse_date(data.period_end)
    if not ps or not pe:
        raise HTTPException(422, "Format tanggal tidak valid. Gunakan YYYY-MM-DD")

    days_elapsed   = max(0, (pe - contract.start_date).days + 1) if contract.start_date else 0
    days_remaining = max(0, (contract.end_date - pe).days)       if contract.end_date   else 0

    planned_dec = _pct_to_decimal(data.planned_cumulative_pct)
    actual_dec  = _pct_to_decimal(data.actual_cumulative_pct)

    # Weekly = kumulatif dikurangi minggu sebelumnya
    prev = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == data.week_number - 1,
    ).first()
    prev_actual  = Decimal(str(prev.actual_cumulative_pct  or 0)) if prev else Decimal("0")
    prev_planned = Decimal(str(prev.planned_cumulative_pct or 0)) if prev else Decimal("0")

    deviation = float(actual_dec) - float(planned_dec)

    report = WeeklyReport(
        contract_id=contract_id,
        week_number=data.week_number,
        period_start=ps,
        period_end=pe,
        report_date=_parse_date(data.report_date) or pe,
        planned_cumulative_pct=planned_dec,
        actual_cumulative_pct=actual_dec,
        planned_weekly_pct=planned_dec - prev_planned,
        actual_weekly_pct=actual_dec  - prev_actual,
        deviation_pct=Decimal(str(deviation)),
        deviation_status=get_deviation_status(deviation),
        spi=Decimal(str(calculate_spi(float(actual_dec), float(planned_dec)) or 0)),
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        manpower_count=data.manpower_count or 0,
        manpower_skilled=data.manpower_skilled or 0,
        manpower_unskilled=data.manpower_unskilled or 0,
        rain_days=data.rain_days or 0,
        obstacles=data.obstacles,
        solutions=data.solutions,
        submitted_by=data.submitted_by or current_user.full_name,
        import_source="manual",
    )
    db.add(report)
    db.flush()

    # Progress items per BOQ item
    for item_data in data.progress_items:
        boq = db.query(BOQItem).filter(BOQItem.id == item_data.boq_item_id).first()
        if not boq:
            continue
        vol_plan = float(boq.volume or 0)
        vol_cum  = float(item_data.volume_cumulative or 0)
        vol_wk   = float(item_data.volume_this_week  or 0)
        prog_cum = min(vol_cum / vol_plan, 1.0) if vol_plan > 0 else 0.0
        prog_wk  = min(vol_wk  / vol_plan, 1.0) if vol_plan > 0 else 0.0
        db.add(WeeklyProgressItem(
            weekly_report_id=str(report.id),
            boq_item_id=item_data.boq_item_id,
            volume_this_week=Decimal(str(vol_wk)),
            volume_cumulative=Decimal(str(vol_cum)),
            progress_this_week_pct=Decimal(str(prog_wk)),
            progress_cumulative_pct=Decimal(str(prog_cum)),
            weighted_progress_pct=Decimal(str(prog_cum * float(boq.weight_pct or 0))),
            notes=item_data.notes,
        ))

    db.commit()
    run_early_warning_check(db, contract_id)
    return {"id": str(report.id), "week_number": report.week_number, "success": True}


@router.put("/{contract_id}/week/{week_number}")
def update_report(
    contract_id: str,
    week_number: int,
    data: dict,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    r = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == week_number,
    ).first()
    if not r:
        raise HTTPException(404, "Laporan tidak ditemukan")
    if r.is_locked:
        raise HTTPException(403, "Laporan sudah dikunci, tidak bisa diubah")
    allowed = {"obstacles", "solutions", "manpower_count",
               "manpower_skilled", "manpower_unskilled", "rain_days"}
    for k, v in data.items():
        if k in allowed:
            setattr(r, k, v)
    db.commit()
    return {"success": True}


@router.delete("/{contract_id}/week/{week_number}")
def delete_report(
    contract_id: str,
    week_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in (UserRole.SUPERADMIN, UserRole.PPK):
        raise HTTPException(403, "Hanya Superadmin atau PPK yang bisa hapus laporan")
    r = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == week_number,
    ).first()
    if not r:
        raise HTTPException(404)
    db.delete(r)
    db.commit()
    return {"success": True}


@router.post("/{contract_id}/import-excel", response_model=ExcelImportResult)
async def import_excel(
    contract_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "Hanya file .xlsx yang diterima")

    content = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parsed = parse_progress_xlsx(tmp_path)
    finally:
        os.unlink(tmp_path)

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Kontrak tidak ditemukan")

    week_num = int(parsed.get("week_number") or 0)
    if not week_num:
        return ExcelImportResult(
            success=False,
            errors=["Nomor minggu tidak ditemukan di file Excel"],
        )

    if db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == week_num,
    ).first():
        return ExcelImportResult(
            success=False,
            errors=[f"Laporan minggu {week_num} sudah ada"],
        )

    pe = _parse_date(parsed.get("period_end")) or date.today()
    ps = _parse_date(parsed.get("period_start")) or pe

    actual_dec  = _pct_to_decimal(float(parsed.get("actual_cumulative_pct")  or 0) * 100)
    planned_dec = _pct_to_decimal(float(parsed.get("planned_cumulative_pct") or 0) * 100)
    deviation   = float(actual_dec) - float(planned_dec)

    r = WeeklyReport(
        contract_id=contract_id,
        week_number=week_num,
        period_start=ps, period_end=pe, report_date=pe,
        planned_cumulative_pct=planned_dec,
        actual_cumulative_pct=actual_dec,
        deviation_pct=Decimal(str(deviation)),
        deviation_status=get_deviation_status(deviation),
        spi=Decimal(str(calculate_spi(float(actual_dec), float(planned_dec)) or 0)),
        days_elapsed=int(parsed.get("days_elapsed") or 0),
        days_remaining=int(parsed.get("days_remaining") or 0),
        manpower_count=int(parsed.get("manpower_count") or 0),
        obstacles=str(parsed.get("obstacles") or ""),
        solutions=str(parsed.get("solutions") or ""),
        submitted_by=current_user.full_name,
        import_source="excel_import",
        source_filename=file.filename,
    )
    db.add(r)
    db.commit()
    run_early_warning_check(db, contract_id)

    return ExcelImportResult(
        success=True,
        contract_id=contract_id,
        week_number=week_num,
        items_imported=0,
        warnings=parsed.get("warnings") or [],
    )