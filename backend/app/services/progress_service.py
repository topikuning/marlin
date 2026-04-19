from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Contract, WeeklyReport, WeeklyProgressItem, BOQItem,
    Facility, Location, DeviationStatus, EarlyWarning
)
from app.schemas.schemas import SCurvePoint, SCurveResponse


def get_deviation_status(deviation_pct: float) -> DeviationStatus:
    if deviation_pct > 0.05:
        return DeviationStatus.FAST
    elif deviation_pct >= -0.05:
        return DeviationStatus.NORMAL
    elif deviation_pct >= -0.10:
        return DeviationStatus.WARNING
    else:
        return DeviationStatus.CRITICAL


def calculate_spi(actual: float, planned: float) -> Optional[float]:
    if planned <= 0:
        return None
    return round(actual / planned, 4)


def calculate_progress_from_items(
    db: Session, weekly_report_id: str
) -> Tuple[float, float]:
    """
    Hitung actual_weekly_pct dan actual_cumulative_pct
    dari detail progress item dalam satu laporan.
    Returns: (weekly_pct, cumulative_pct)
    """
    items = db.query(WeeklyProgressItem).filter(
        WeeklyProgressItem.weekly_report_id == weekly_report_id
    ).all()

    weekly_total = sum(
        float(item.progress_this_week_pct or 0) * float(item.boq_item.weight_pct or 0)
        for item in items
        if item.boq_item and item.boq_item.is_active
    )
    cumulative_total = sum(
        float(item.progress_cumulative_pct or 0) * float(item.boq_item.weight_pct or 0)
        for item in items
        if item.boq_item and item.boq_item.is_active
    )

    return round(weekly_total, 8), round(cumulative_total, 8)


def update_progress_item_calculations(
    db: Session,
    progress_item: WeeklyProgressItem,
    boq_item: BOQItem
) -> WeeklyProgressItem:
    """
    Hitung progress_this_week_pct, progress_cumulative_pct, weighted_progress_pct
    dari volume yang diinput.
    """
    if boq_item.volume and float(boq_item.volume) > 0:
        progress_item.progress_this_week_pct = Decimal(str(
            float(progress_item.volume_this_week) / float(boq_item.volume)
        ))
        progress_item.progress_cumulative_pct = Decimal(str(
            float(progress_item.volume_cumulative) / float(boq_item.volume)
        ))
    else:
        # Jika volume BOQ 0 (item lumpsum), progress diisi langsung sebagai %
        progress_item.progress_this_week_pct = Decimal("0")
        progress_item.progress_cumulative_pct = Decimal("0")

    progress_item.weighted_progress_pct = Decimal(str(
        float(progress_item.progress_cumulative_pct) * float(boq_item.weight_pct or 0)
    ))
    return progress_item


def build_planned_scurve(db: Session, contract: Contract) -> List[dict]:
    """
    Bangun kurva S rencana dari planned_start_week dan planned_duration_weeks
    setiap item BOQ aktif dalam kontrak ini.
    """
    total_weeks = max(contract.duration_days // 7, 1)

    # Ambil semua item BOQ aktif untuk kontrak ini
    boq_items = (
        db.query(BOQItem)
        .join(Facility)
        .join(Location)
        .filter(
            Location.contract_id == contract.id,
            BOQItem.is_active == True,
            BOQItem.planned_start_week != None,
            BOQItem.planned_duration_weeks != None,
            float(BOQItem.weight_pct or 0) > 0,
        )
        .all()
    )

    # Distribusi bobot per minggu (linear)
    weekly_planned = [0.0] * (total_weeks + 2)
    for item in boq_items:
        if not item.planned_start_week or not item.planned_duration_weeks:
            continue
        weekly_weight = float(item.weight_pct) / item.planned_duration_weeks
        start = item.planned_start_week
        end = start + item.planned_duration_weeks
        for w in range(start, min(end, total_weeks + 1)):
            if w < len(weekly_planned):
                weekly_planned[w] += weekly_weight

    # Kumulatif
    result = []
    cumulative = 0.0
    for w in range(1, total_weeks + 1):
        cumulative += weekly_planned[w]
        result.append({
            "week": w,
            "planned_weekly": weekly_planned[w],
            "planned_cumulative": min(cumulative, 1.0),
        })
    return result


def get_scurve_data(db: Session, contract_id: str) -> SCurveResponse:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    # Planned dari BOQ
    planned_data = build_planned_scurve(db, contract)

    # Actual dari laporan mingguan
    reports = (
        db.query(WeeklyReport)
        .filter(WeeklyReport.contract_id == contract_id)
        .order_by(WeeklyReport.week_number)
        .all()
    )
    actual_map = {r.week_number: r for r in reports}

    # Minggu addendum
    addendum_weeks = []
    for adm in contract.addenda:
        if adm.effective_date and contract.start_date:
            delta = (adm.effective_date - contract.start_date).days
            week_num = (delta // 7) + 1
            addendum_weeks.append(week_num)

    total_weeks = max(contract.duration_days // 7, 1)
    current_week = 0
    if contract.start_date:
        today = date.today()
        elapsed = (today - contract.start_date).days
        current_week = max(1, min(elapsed // 7 + 1, total_weeks + 5))

    points = []
    latest_actual = 0.0
    latest_planned = 0.0
    latest_deviation = 0.0

    for pd in planned_data:
        w = pd["week"]
        report = actual_map.get(w)
        actual_cum = float(report.actual_cumulative_pct) if report else None
        dev = (actual_cum - pd["planned_cumulative"]) if actual_cum is not None else None
        status = get_deviation_status(dev).value if dev is not None else None
        spi = calculate_spi(actual_cum, pd["planned_cumulative"]) if actual_cum is not None else None

        # Tanggal periode
        period_start = None
        period_end = None
        if contract.start_date:
            period_start = contract.start_date + timedelta(weeks=w - 1)
            period_end = period_start + timedelta(days=6)

        if report:
            latest_actual = actual_cum
            latest_planned = pd["planned_cumulative"]
            latest_deviation = dev
            current_week = w

        points.append(SCurvePoint(
            week=w,
            period_start=period_start,
            period_end=period_end,
            planned_cumulative=round(pd["planned_cumulative"] * 100, 4),
            actual_cumulative=round(actual_cum * 100, 4) if actual_cum is not None else None,
            deviation=round(dev * 100, 4) if dev is not None else None,
            deviation_status=status,
            spi=spi,
        ))

    # Forecast keterlambatan
    forecast_week = None
    forecast_delay = None
    if latest_actual < 1.0 and latest_planned > 0:
        spi_val = latest_actual / latest_planned
        if spi_val < 0.99:
            remaining_work = 1.0 - latest_actual
            if spi_val > 0:
                remaining_weeks = remaining_work / (latest_actual / current_week) if current_week > 0 else None
                if remaining_weeks:
                    forecast_week = current_week + int(remaining_weeks) + 1
                    forecast_delay = max(0, forecast_week - total_weeks) * 7

    return SCurveResponse(
        contract_id=str(contract.id),
        contract_number=contract.contract_number,
        contract_name=contract.contract_name,
        total_weeks=total_weeks,
        current_week=current_week,
        latest_actual=round(latest_actual * 100, 2),
        latest_planned=round(latest_planned * 100, 2),
        latest_deviation=round(latest_deviation * 100, 2),
        forecast_completion_week=forecast_week,
        forecast_delay_days=forecast_delay,
        points=points,
        addendum_weeks=addendum_weeks,
    )


def run_early_warning_check(db: Session, contract_id: str) -> List[EarlyWarning]:
    """
    Jalankan semua pengecekan early warning untuk satu kontrak.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        return []

    warnings = []
    latest_report = (
        db.query(WeeklyReport)
        .filter(WeeklyReport.contract_id == contract_id)
        .order_by(WeeklyReport.week_number.desc())
        .first()
    )

    if not latest_report:
        return warnings

    # 1. Cek deviasi
    deviation = float(latest_report.deviation_pct or 0)
    if deviation <= -0.10:
        warnings.append(EarlyWarning(
            contract_id=contract_id,
            weekly_report_id=str(latest_report.id),
            warning_type="deviation",
            severity="critical",
            message=f"Deviasi kumulatif {deviation*100:.2f}% melebihi batas kritis -10%",
            parameter_name="deviation_pct",
            parameter_value=Decimal(str(deviation)),
            threshold_value=Decimal("-0.10"),
        ))
    elif deviation <= -0.05:
        warnings.append(EarlyWarning(
            contract_id=contract_id,
            weekly_report_id=str(latest_report.id),
            warning_type="deviation",
            severity="warning",
            message=f"Deviasi kumulatif {deviation*100:.2f}% melewati batas peringatan -5%",
            parameter_name="deviation_pct",
            parameter_value=Decimal(str(deviation)),
            threshold_value=Decimal("-0.05"),
        ))

    # 2. Cek SPI
    if latest_report.spi and float(latest_report.spi) < 0.85:
        warnings.append(EarlyWarning(
            contract_id=contract_id,
            weekly_report_id=str(latest_report.id),
            warning_type="spi",
            severity="critical",
            message=f"SPI {float(latest_report.spi):.3f} di bawah 0.85 — proyek sangat terlambat",
            parameter_name="spi",
            parameter_value=latest_report.spi,
            threshold_value=Decimal("0.85"),
        ))
    elif latest_report.spi and float(latest_report.spi) < 0.92:
        warnings.append(EarlyWarning(
            contract_id=contract_id,
            weekly_report_id=str(latest_report.id),
            warning_type="spi",
            severity="warning",
            message=f"SPI {float(latest_report.spi):.3f} di bawah 0.92",
            parameter_name="spi",
            parameter_value=latest_report.spi,
            threshold_value=Decimal("0.92"),
        ))

    # 3. Cek sisa waktu vs sisa pekerjaan
    if latest_report.days_remaining > 0:
        remaining_work = 1.0 - float(latest_report.actual_cumulative_pct or 0)
        total_days = contract.duration_days or 1
        time_ratio = remaining_work / (latest_report.days_remaining / total_days) if total_days > 0 else 1
        if time_ratio > 1.30:
            warnings.append(EarlyWarning(
                contract_id=contract_id,
                weekly_report_id=str(latest_report.id),
                warning_type="time_work_ratio",
                severity="critical",
                message=f"Sisa pekerjaan {remaining_work*100:.1f}% tidak sebanding dengan sisa waktu {latest_report.days_remaining} hari",
                parameter_name="time_work_ratio",
                parameter_value=Decimal(str(round(time_ratio, 4))),
                threshold_value=Decimal("1.30"),
            ))

    # Simpan warning ke DB (yang belum ada)
    saved = []
    for w in warnings:
        existing = db.query(EarlyWarning).filter(
            EarlyWarning.contract_id == contract_id,
            EarlyWarning.warning_type == w.warning_type,
            EarlyWarning.is_resolved == False,
        ).first()
        if not existing:
            db.add(w)
            saved.append(w)
    db.commit()
    return saved
