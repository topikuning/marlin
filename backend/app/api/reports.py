from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
import tempfile, os
from datetime import date, timedelta
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import (
    WeeklyReport, WeeklyProgressItem, BOQItem,
    Facility, Location, Contract, DeviationStatus
)
from app.schemas.schemas import WeeklyReportCreate, WeeklyReportOut, ExcelImportResult
from app.services.progress_service import (
    get_deviation_status, calculate_spi,
    update_progress_item_calculations, run_early_warning_check
)
from app.services.excel_service import parse_progress_xlsx

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{contract_id}", response_model=List[dict])
def list_reports(
    contract_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id
    ).order_by(WeeklyReport.week_number).all()
    return [_report_to_dict(r) for r in reports]


@router.post("/{contract_id}", response_model=dict)
def create_report(
    contract_id: str,
    data: WeeklyReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Cek duplikat
    existing = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == data.week_number,
    ).first()
    if existing:
        raise HTTPException(400, f"Laporan minggu {data.week_number} sudah ada")

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Kontrak tidak ditemukan")

    # Hitung waktu
    days_elapsed = (data.period_end - contract.start_date).days + 1 if contract.start_date else 0
    days_remaining = (contract.end_date - data.period_end).days if contract.end_date else 0

    report = WeeklyReport(
        contract_id=contract_id,
        week_number=data.week_number,
        period_start=data.period_start,
        period_end=data.period_end,
        report_date=data.report_date or data.period_end,
        planned_weekly_pct=data.planned_weekly_pct or Decimal("0"),
        planned_cumulative_pct=data.planned_cumulative_pct or Decimal("0"),
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        manpower_count=data.manpower_count,
        manpower_skilled=data.manpower_skilled,
        manpower_unskilled=data.manpower_unskilled,
        rain_days=data.rain_days,
        obstacles=data.obstacles,
        solutions=data.solutions,
        submitted_by=data.submitted_by or current_user.full_name,
        import_source="manual",
    )
    db.add(report)
    db.flush()

    # Simpan progress items
    actual_weighted_cumulative = Decimal("0")
    for item_data in data.progress_items:
        boq_item = db.query(BOQItem).filter(BOQItem.id == item_data.boq_item_id).first()
        if not boq_item:
            continue

        pi = WeeklyProgressItem(
            weekly_report_id=str(report.id),
            boq_item_id=str(item_data.boq_item_id),
            volume_this_week=item_data.volume_this_week,
            volume_cumulative=item_data.volume_cumulative,
            notes=item_data.notes,
        )
        pi = update_progress_item_calculations(db, pi, boq_item)
        db.add(pi)
        actual_weighted_cumulative += pi.weighted_progress_pct

    # Update header report
    report.actual_cumulative_pct = actual_weighted_cumulative
    prev_report = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == data.week_number - 1,
    ).first()
    prev_cumulative = prev_report.actual_cumulative_pct if prev_report else Decimal("0")
    report.actual_weekly_pct = actual_weighted_cumulative - prev_cumulative

    deviation = float(actual_weighted_cumulative) - float(report.planned_cumulative_pct)
    report.deviation_pct = Decimal(str(deviation))
    report.deviation_status = get_deviation_status(deviation)
    report.spi = Decimal(str(calculate_spi(float(actual_weighted_cumulative), float(report.planned_cumulative_pct)) or 0))

    db.commit()

    # Jalankan early warning check
    run_early_warning_check(db, contract_id)

    return {"id": str(report.id), "week_number": report.week_number, "success": True}


@router.get("/{contract_id}/week/{week_number}", response_model=dict)
def get_report_detail(
    contract_id: str,
    week_number: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    report = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == week_number,
    ).first()
    if not report:
        raise HTTPException(404, f"Laporan minggu {week_number} tidak ditemukan")
    return _report_to_dict(report, detail=True)


@router.post("/{contract_id}/import-excel", response_model=ExcelImportResult)
async def import_excel_report(
    contract_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Import laporan progress dari file Excel konsultan."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "File harus berformat .xlsx atau .xls")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parsed = parse_progress_xlsx(tmp_path)
    finally:
        os.unlink(tmp_path)

    if not parsed["success"] and parsed["errors"]:
        return ExcelImportResult(
            success=False,
            errors=parsed["errors"],
            warnings=parsed["warnings"],
            items_imported=0,
            items_skipped=0,
        )

    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Kontrak tidak ditemukan")

    week_num = parsed.get("week_number")
    if not week_num:
        return ExcelImportResult(
            success=False,
            errors=["Nomor minggu tidak ditemukan dalam file"],
            items_imported=0,
            items_skipped=0,
        )

    # Cek duplikat
    existing = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.week_number == week_num,
    ).first()
    if existing:
        return ExcelImportResult(
            success=False,
            errors=[f"Laporan minggu {week_num} sudah ada. Hapus dulu sebelum import ulang."],
            items_imported=0,
            items_skipped=0,
        )

    period_start = parsed.get("period_start") or contract.start_date + timedelta(weeks=week_num - 1)
    period_end = parsed.get("period_end") or period_start + timedelta(days=6)

    days_elapsed = parsed.get("days_elapsed") or (period_end - contract.start_date).days
    days_remaining = parsed.get("days_remaining") or (contract.end_date - period_end).days

    report = WeeklyReport(
        contract_id=contract_id,
        week_number=week_num,
        period_start=period_start,
        period_end=period_end,
        planned_weekly_pct=Decimal(str(parsed.get("planned_weekly_pct") or 0)),
        planned_cumulative_pct=Decimal(str(parsed.get("planned_cumulative_pct") or 0)),
        actual_weekly_pct=Decimal(str(parsed.get("actual_weekly_pct") or 0)),
        actual_cumulative_pct=Decimal(str(parsed.get("actual_cumulative_pct") or 0)),
        deviation_pct=Decimal(str(parsed.get("deviation_pct") or 0)),
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        manpower_count=parsed.get("manpower_count") or 0,
        obstacles=parsed.get("obstacles") or "",
        solutions=parsed.get("solutions") or "",
        submitted_by=current_user.full_name,
        import_source="excel_import",
        source_filename=file.filename,
    )
    actual_pct = float(parsed.get("actual_cumulative_pct") or 0)
    planned_pct = float(parsed.get("planned_cumulative_pct") or 0)
    deviation = actual_pct - planned_pct
    report.deviation_status = get_deviation_status(deviation)
    report.spi = Decimal(str(calculate_spi(actual_pct, planned_pct) or 0))

    db.add(report)
    db.commit()
    db.refresh(report)

    run_early_warning_check(db, contract_id)

    return ExcelImportResult(
        success=True,
        contract_id=contract_id,
        week_number=week_num,
        items_imported=len(parsed.get("progress_items") or []),
        items_skipped=0,
        warnings=parsed.get("warnings") or [],
        errors=[],
    )


def _report_to_dict(r: WeeklyReport, detail: bool = False) -> dict:
    d = {
        "id": str(r.id),
        "week_number": r.week_number,
        "period_start": str(r.period_start),
        "period_end": str(r.period_end),
        "planned_weekly_pct": float(r.planned_weekly_pct or 0),
        "planned_cumulative_pct": float(r.planned_cumulative_pct or 0),
        "actual_weekly_pct": float(r.actual_weekly_pct or 0),
        "actual_cumulative_pct": float(r.actual_cumulative_pct or 0),
        "deviation_pct": float(r.deviation_pct or 0),
        "deviation_status": r.deviation_status,
        "days_elapsed": r.days_elapsed,
        "days_remaining": r.days_remaining,
        "spi": float(r.spi or 0),
        "manpower_count": r.manpower_count,
        "rain_days": r.rain_days,
        "obstacles": r.obstacles,
        "solutions": r.solutions,
        "import_source": r.import_source,
        "submitted_by": r.submitted_by,
        "created_at": str(r.created_at),
    }
    if detail and r.progress_items:
        d["items"] = [{
            "boq_item_id": str(pi.boq_item_id),
            "description": pi.boq_item.description if pi.boq_item else "",
            "unit": pi.boq_item.unit if pi.boq_item else "",
            "weight_pct": float(pi.boq_item.weight_pct or 0) if pi.boq_item else 0,
            "volume_this_week": float(pi.volume_this_week or 0),
            "volume_cumulative": float(pi.volume_cumulative or 0),
            "progress_cumulative_pct": float(pi.progress_cumulative_pct or 0),
        } for pi in r.progress_items]
    return d
