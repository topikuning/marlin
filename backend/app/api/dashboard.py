from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import (
    Contract, WeeklyReport, Location, Facility,
    EarlyWarning, ContractStatus, DeviationStatus
)
from app.schemas.schemas import SCurveResponse, DashboardStats
from app.services.progress_service import get_scurve_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=dict)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    fiscal_year: Optional[int] = None,
):
    q = db.query(Contract)
    if fiscal_year:
        q = q.filter(Contract.fiscal_year == fiscal_year)
    contracts = q.all()

    total_value = sum(float(c.current_value or 0) for c in contracts)
    location_count = db.query(func.count(Location.id)).filter(
        Location.contract_id.in_([c.id for c in contracts])
    ).scalar() or 0

    # Hitung status dari laporan terbaru tiap kontrak
    on_track = warning = critical = completed = 0
    avg_progress_list = []

    for c in contracts:
        if c.status == ContractStatus.COMPLETED:
            completed += 1
            avg_progress_list.append(100.0)
            continue

        latest = db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == c.id
        ).order_by(WeeklyReport.week_number.desc()).first()

        if latest:
            avg_progress_list.append(float(latest.actual_cumulative_pct or 0) * 100)
            if latest.deviation_status == DeviationStatus.WARNING:
                warning += 1
            elif latest.deviation_status == DeviationStatus.CRITICAL:
                critical += 1
            else:
                on_track += 1
        else:
            on_track += 1
            avg_progress_list.append(0.0)

    active_warnings = db.query(func.count(EarlyWarning.id)).filter(
        EarlyWarning.is_resolved == False
    ).scalar() or 0

    return {
        "total_contracts": len(contracts),
        "total_locations": location_count,
        "total_value": total_value,
        "avg_progress": round(sum(avg_progress_list) / len(avg_progress_list), 2) if avg_progress_list else 0,
        "contracts_on_track": on_track,
        "contracts_warning": warning,
        "contracts_critical": critical,
        "contracts_completed": completed,
        "active_warnings": active_warnings,
    }


@router.get("/contracts-summary", response_model=List[dict])
def get_contracts_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    fiscal_year: Optional[int] = None,
    province: Optional[str] = None,
):
    q = db.query(Contract)
    if fiscal_year:
        q = q.filter(Contract.fiscal_year == fiscal_year)
    contracts = q.all()

    result = []
    for c in contracts:
        latest = db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == c.id
        ).order_by(WeeklyReport.week_number.desc()).first()

        loc_count = db.query(func.count(Location.id)).filter(
            Location.contract_id == c.id
        ).scalar() or 0

        has_warning = db.query(EarlyWarning).filter(
            EarlyWarning.contract_id == c.id,
            EarlyWarning.is_resolved == False,
        ).first() is not None

        # Ambil kota/provinsi dari lokasi pertama
        first_loc = db.query(Location).filter(Location.contract_id == c.id).first()

        result.append({
            "id": str(c.id),
            "contract_number": c.contract_number,
            "contract_name": c.contract_name,
            "company_name": c.company.name if c.company else "",
            "ppk_name": c.ppk.name if c.ppk else "",
            "city": first_loc.city if first_loc else "",
            "province": first_loc.province if first_loc else "",
            "fiscal_year": c.fiscal_year,
            "status": c.status,
            "current_week": latest.week_number if latest else 0,
            "total_weeks": c.duration_days // 7,
            "actual_cumulative": float(latest.actual_cumulative_pct or 0) * 100 if latest else 0,
            "planned_cumulative": float(latest.planned_cumulative_pct or 0) * 100 if latest else 0,
            "deviation": float(latest.deviation_pct or 0) * 100 if latest else 0,
            "deviation_status": latest.deviation_status if latest else "normal",
            "spi": float(latest.spi or 0) if latest else None,
            "days_remaining": latest.days_remaining if latest else c.duration_days,
            "location_count": loc_count,
            "contract_value": float(c.current_value or 0),
            "has_active_warning": has_warning,
            "last_report_week": latest.week_number if latest else None,
        })

    return result


@router.get("/scurve/{contract_id}", response_model=SCurveResponse)
def get_scurve(
    contract_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    try:
        return get_scurve_data(db, contract_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/warnings", response_model=List[dict])
def get_warnings(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    resolved: bool = False,
):
    warnings = db.query(EarlyWarning).filter(
        EarlyWarning.is_resolved == resolved
    ).order_by(EarlyWarning.created_at.desc()).limit(100).all()

    result = []
    for w in warnings:
        contract = db.query(Contract).filter(Contract.id == w.contract_id).first()
        result.append({
            "id": str(w.id),
            "contract_id": str(w.contract_id),
            "contract_number": contract.contract_number if contract else "",
            "contract_name": contract.contract_name if contract else "",
            "warning_type": w.warning_type,
            "severity": w.severity,
            "message": w.message,
            "parameter_name": w.parameter_name,
            "parameter_value": float(w.parameter_value or 0),
            "threshold_value": float(w.threshold_value or 0),
            "is_resolved": w.is_resolved,
            "created_at": str(w.created_at),
        })
    return result


@router.post("/warnings/{warning_id}/resolve")
def resolve_warning(
    warning_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from datetime import datetime
    w = db.query(EarlyWarning).filter(EarlyWarning.id == warning_id).first()
    if not w:
        raise HTTPException(404, "Warning tidak ditemukan")
    w.is_resolved = True
    w.resolved_at = datetime.utcnow()
    w.resolved_by = current_user.full_name
    db.commit()
    return {"success": True}


@router.get("/master-work-codes", response_model=List[dict])
def get_master_work_codes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.models import MasterWorkCode
    codes = db.query(MasterWorkCode).filter(MasterWorkCode.is_active == True).all()
    return [{"code": c.code, "category": c.category, "sub_category": c.sub_category,
             "description": c.description, "unit": c.default_unit} for c in codes]
