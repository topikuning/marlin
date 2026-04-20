from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import (
    Contract, WeeklyReport, Location, Facility,
    EarlyWarning, ContractStatus, DeviationStatus
)
from app.services.progress_service import get_scurve_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ─── STATS ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    fiscal_year: Optional[int] = None,
):
    q = db.query(Contract)
    if fiscal_year:
        q = q.filter(Contract.fiscal_year == fiscal_year)
    contracts = q.all()
    ids = [c.id for c in contracts]

    total_value = sum(float(c.current_value or 0) for c in contracts)
    total_locations = db.query(func.count(Location.id)).filter(
        Location.contract_id.in_(ids), Location.is_active == True
    ).scalar() or 0

    on_track = warning_c = critical_c = completed_c = 0
    progress_list = []
    planned_list  = []

    for c in contracts:
        if c.status == ContractStatus.COMPLETED:
            completed_c += 1
            progress_list.append(1.0)
            planned_list.append(1.0)
            continue

        latest = db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == c.id
        ).order_by(WeeklyReport.week_number.desc()).first()

        if not latest:
            on_track += 1
            continue

        progress_list.append(float(latest.actual_cumulative_pct  or 0))
        planned_list.append( float(latest.planned_cumulative_pct or 0))

        if latest.deviation_status == DeviationStatus.CRITICAL:
            critical_c += 1
        elif latest.deviation_status == DeviationStatus.WARNING:
            warning_c += 1
        else:
            on_track += 1

    active_warnings = db.query(func.count(EarlyWarning.id)).filter(
        EarlyWarning.contract_id.in_(ids),
        EarlyWarning.is_resolved == False,
    ).scalar() or 0

    avg_progress = sum(progress_list) / len(progress_list) if progress_list else 0.0
    avg_planned  = sum(planned_list)  / len(planned_list)  if planned_list  else 0.0

    return {
        "total_contracts":      len(contracts),
        "total_locations":      total_locations,
        "total_value":          total_value,
        "avg_progress":         avg_progress,
        "avg_planned":          avg_planned,
        "contracts_on_track":   on_track,
        "contracts_warning":    warning_c,
        "contracts_critical":   critical_c,
        "contracts_completed":  completed_c,
        "active_warnings":      active_warnings,
    }


# ─── CONTRACTS SUMMARY ────────────────────────────────────────────────────────

@router.get("/contracts-summary")
def get_contracts_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    fiscal_year: Optional[int] = None,
):
    q = db.query(Contract)
    if fiscal_year:
        q = q.filter(Contract.fiscal_year == fiscal_year)
    contracts = q.order_by(Contract.created_at.desc()).all()

    result = []
    for c in contracts:
        # Latest report
        latest = db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == c.id
        ).order_by(WeeklyReport.week_number.desc()).first()

        # Location count
        loc_count = db.query(func.count(Location.id)).filter(
            Location.contract_id == c.id, Location.is_active == True
        ).scalar() or 0

        # Active warning?
        has_warning = db.query(EarlyWarning).filter(
            EarlyWarning.contract_id == c.id,
            EarlyWarning.is_resolved == False,
        ).first() is not None

        total_weeks = max(c.duration_days // 7, 1) if c.duration_days else 0

        actual   = float(latest.actual_cumulative_pct  or 0) * 100 if latest else 0.0
        planned  = float(latest.planned_cumulative_pct or 0) * 100 if latest else 0.0
        dev_stat = (latest.deviation_status.value if latest else "normal") if latest else "normal"
        spi      = float(latest.spi or 0) if latest else None

        result.append({
            "id":               str(c.id),
            "contract_number":  c.contract_number,
            "contract_name":    c.contract_name,
            "company_name":     c.company.name  if c.company else "",
            "ppk_name":         c.ppk.name      if c.ppk     else "",
            "ppk_satker":       c.ppk.satker    if c.ppk     else "",
            "city":             c.city,
            "province":         c.province,
            "fiscal_year":      c.fiscal_year,
            "status":           c.status.value if hasattr(c.status, 'value') else c.status,
            "start_date":       str(c.start_date),
            "end_date":         str(c.end_date),
            "current_week":     latest.week_number if latest else 0,
            "total_weeks":      total_weeks,
            "actual_cumulative":  actual,
            "planned_cumulative": planned,
            "deviation":        actual - planned,
            "deviation_status": dev_stat,
            "spi":              spi,
            "days_remaining":   latest.days_remaining if latest else c.duration_days,
            "location_count":   loc_count,
            "contract_value":   float(c.current_value  or 0),
            "current_value":    float(c.current_value  or 0),
            "original_value":   float(c.original_value or 0),
            "has_active_warning": has_warning,
            "last_report_week": latest.week_number if latest else None,
        })

    return result


# ─── S-CURVE ──────────────────────────────────────────────────────────────────

@router.get("/scurve/{contract_id}")
def get_scurve(
    contract_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    try:
        return get_scurve_data(db, contract_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ─── EARLY WARNINGS ───────────────────────────────────────────────────────────

@router.get("/warnings")
def get_warnings(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    resolved: bool = False,
):
    warnings = db.query(EarlyWarning).filter(
        EarlyWarning.is_resolved == resolved
    ).order_by(EarlyWarning.created_at.desc()).all()

    result = []
    for w in warnings:
        contract = db.query(Contract).filter(Contract.id == w.contract_id).first()
        result.append({
            "id":              str(w.id),
            "contract_id":     str(w.contract_id),
            "contract_number": contract.contract_number if contract else "",
            "contract_name":   contract.contract_name  if contract else "",
            "warning_type":    w.warning_type,
            "severity":        w.severity,
            "message":         w.message,
            "parameter_name":  w.parameter_name,
            "parameter_value": float(w.parameter_value) if w.parameter_value else None,
            "threshold_value": float(w.threshold_value) if w.threshold_value else None,
            "is_resolved":     w.is_resolved,
            "resolved_at":     str(w.resolved_at) if w.resolved_at else None,
            "resolved_by":     w.resolved_by,
            "created_at":      str(w.created_at),
        })
    return result


@router.post("/warnings/{warning_id}/resolve")
def resolve_warning(
    warning_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    w = db.query(EarlyWarning).filter(EarlyWarning.id == warning_id).first()
    if not w:
        raise HTTPException(404, "Warning tidak ditemukan")
    from datetime import datetime
    w.is_resolved = True
    w.resolved_at = datetime.utcnow()
    w.resolved_by = current_user.full_name
    db.commit()
    return {"success": True}


# ─── MASTER WORK CODES ────────────────────────────────────────────────────────

@router.get("/master-work-codes")
def get_master_work_codes(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from app.models.models import MasterWorkCode
    codes = db.query(MasterWorkCode).filter(MasterWorkCode.is_active == True).all()
    return [{
        "code":         c.code,
        "category":     c.category.value if hasattr(c.category, 'value') else c.category,
        "sub_category": c.sub_category,
        "description":  c.description,
        "default_unit": c.default_unit,
    } for c in codes]