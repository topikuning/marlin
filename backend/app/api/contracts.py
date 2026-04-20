from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import (
    Contract, ContractAddendum, Location, Facility, BOQItem,
    Company, PPK, ContractStatus, User
)
from app.schemas.schemas import (
    ContractCreate, AddendumCreate,
    LocationCreate, FacilityCreate,
    BOQItemCreate, BOQItemUpdate,
)

router = APIRouter(prefix="/contracts", tags=["contracts"])


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _company_dict(c: Company, db: Session) -> dict:
    count = db.query(func.count(Contract.id)).filter(Contract.company_id == c.id).scalar() or 0
    return {
        "id": str(c.id), "name": c.name, "npwp": c.npwp,
        "address": c.address, "contact_person": c.contact_person,
        "phone": c.phone, "email": c.email,
        "is_active": c.is_active, "contract_count": count,
    }

def _ppk_dict(p: PPK, db: Session) -> dict:
    count = db.query(func.count(Contract.id)).filter(Contract.ppk_id == p.id).scalar() or 0
    return {
        "id": str(p.id), "name": p.name, "nip": p.nip,
        "jabatan": p.jabatan, "satker": p.satker,
        "phone": p.phone, "email": p.email,
        "is_active": p.is_active, "contract_count": count,
    }

def _contract_dict(c: Contract, db: Session) -> dict:
    loc_count = db.query(func.count(Location.id)).filter(Location.contract_id == c.id).scalar() or 0
    add_count = db.query(func.count(ContractAddendum.id)).filter(ContractAddendum.contract_id == c.id).scalar() or 0

    # Progress terbaru dari laporan mingguan
    from app.models.models import WeeklyReport, DeviationStatus
    latest = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == c.id
    ).order_by(WeeklyReport.week_number.desc()).first()

    actual   = float(latest.actual_cumulative_pct  or 0) if latest else 0.0
    planned  = float(latest.planned_cumulative_pct or 0) if latest else 0.0
    dev_stat = latest.deviation_status if latest else DeviationStatus.NORMAL

    return {
        "id":               str(c.id),
        "contract_number":  c.contract_number,
        "contract_name":    c.contract_name,
        "fiscal_year":      c.fiscal_year,
        "start_date":       str(c.start_date),
        "end_date":         str(c.end_date),
        "duration_days":    c.duration_days,
        "original_value":   float(c.original_value or 0),
        "current_value":    float(c.current_value  or 0),
        "status":           c.status,
        "province":         c.province,
        "city":             c.city,
        "description":      c.description,
        "company_id":       str(c.company_id),
        "company_name":     c.company.name  if c.company else None,
        "ppk_id":           str(c.ppk_id),
        "ppk_name":         c.ppk.name     if c.ppk     else None,
        "ppk_satker":       c.ppk.satker   if c.ppk     else None,
        "location_count":   loc_count,
        "addendum_count":   add_count,
        "actual_cumulative":  actual,
        "planned_cumulative": planned,
        "deviation_status": dev_stat,
        "created_at":       str(c.created_at),
    }


# ─── COMPANY ──────────────────────────────────────────────────────────────────

@router.get("/companies")
def list_companies(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(Company).filter(Company.is_active == True).order_by(Company.name).all()
    return [_company_dict(c, db) for c in rows]

@router.post("/companies")
def create_company(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    data.pop("id", None)
    c = Company(**{k: v for k, v in data.items() if hasattr(Company, k)})
    db.add(c); db.commit(); db.refresh(c)
    return _company_dict(c, db)

@router.put("/companies/{company_id}")
def update_company(company_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c: raise HTTPException(404, "Perusahaan tidak ditemukan")
    for k, v in data.items():
        if k not in ("id", "created_at") and hasattr(c, k):
            setattr(c, k, v)
    db.commit(); db.refresh(c)
    return _company_dict(c, db)


# ─── PPK ──────────────────────────────────────────────────────────────────────

@router.get("/ppk")
def list_ppk(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(PPK).filter(PPK.is_active == True).order_by(PPK.name).all()
    return [_ppk_dict(p, db) for p in rows]

@router.post("/ppk")
def create_ppk(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    data.pop("id", None)
    # NIP unik — hapus jika kosong agar tidak conflict
    if not data.get("nip"):
        data.pop("nip", None)
    p = PPK(**{k: v for k, v in data.items() if hasattr(PPK, k)})
    db.add(p); db.commit(); db.refresh(p)
    return _ppk_dict(p, db)

@router.put("/ppk/{ppk_id}")
def update_ppk(ppk_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(PPK).filter(PPK.id == ppk_id).first()
    if not p: raise HTTPException(404, "PPK tidak ditemukan")
    for k, v in data.items():
        if k not in ("id", "created_at") and hasattr(p, k):
            setattr(p, k, v)
    db.commit(); db.refresh(p)
    return _ppk_dict(p, db)


# ─── CONTRACTS ────────────────────────────────────────────────────────────────

@router.get("")
def list_contracts(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    status: Optional[str] = None,
):
    q = db.query(Contract)
    if status:
        q = q.filter(Contract.status == status)
    contracts = q.order_by(Contract.created_at.desc()).all()
    return [_contract_dict(c, db) for c in contracts]

@router.get("/{contract_id}")
def get_contract(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c: raise HTTPException(404, "Kontrak tidak ditemukan")
    return _contract_dict(c, db)

@router.post("")
def create_contract(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Validasi company & ppk exist
    if not db.query(Company).filter(Company.id == data.get("company_id")).first():
        raise HTTPException(400, "Perusahaan tidak ditemukan. Tambah dulu di Data Master.")
    if not db.query(PPK).filter(PPK.id == data.get("ppk_id")).first():
        raise HTTPException(400, "PPK tidak ditemukan. Tambah dulu di Data Master.")

    # Cek duplikat nomor kontrak
    if db.query(Contract).filter(Contract.contract_number == data.get("contract_number")).first():
        raise HTTPException(400, f"Nomor kontrak '{data['contract_number']}' sudah ada.")

    allowed = {
        "company_id", "ppk_id", "contract_number", "contract_name",
        "fiscal_year", "start_date", "end_date", "duration_days",
        "original_value", "province", "city", "description",
    }
    c = Contract(
        **{k: v for k, v in data.items() if k in allowed},
        current_value=data.get("original_value"),
        original_duration_days=data.get("duration_days"),
    )
    db.add(c); db.commit(); db.refresh(c)
    return _contract_dict(c, db)


# ─── ADDENDA ──────────────────────────────────────────────────────────────────

@router.get("/{contract_id}/addenda")
def list_addenda(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(ContractAddendum).filter(
        ContractAddendum.contract_id == contract_id
    ).order_by(ContractAddendum.effective_date).all()
    return [{
        "id": str(a.id), "addendum_number": a.addendum_number,
        "addendum_type": a.addendum_type, "effective_date": str(a.effective_date),
        "extension_days": a.extension_days, "new_end_date": str(a.new_end_date) if a.new_end_date else None,
        "old_contract_value": float(a.old_contract_value or 0),
        "new_contract_value": float(a.new_contract_value or 0) if a.new_contract_value else None,
        "description": a.description, "created_at": str(a.created_at),
    } for a in rows]

@router.post("/{contract_id}/addenda")
def create_addendum(
    contract_id: str, data: dict,
    db: Session = Depends(get_db), _=Depends(get_current_user),
):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c: raise HTTPException(404, "Kontrak tidak ditemukan")

    from datetime import date, timedelta
    ext_days = int(data.get("extension_days") or 0)
    new_val  = data.get("new_contract_value")

    a = ContractAddendum(
        contract_id=contract_id,
        addendum_number=data["addendum_number"],
        addendum_type=data.get("addendum_type", "cco"),
        effective_date=data.get("effective_date") or str(date.today()),
        extension_days=ext_days,
        old_contract_value=c.current_value,
        new_contract_value=Decimal(str(new_val)) if new_val else None,
        description=data.get("description"),
    )

    # Update kontrak
    if ext_days > 0:
        c.duration_days += ext_days
        c.end_date = c.end_date + timedelta(days=ext_days)
        if not c.original_duration_days:
            c.original_duration_days = c.duration_days - ext_days
    if new_val:
        c.current_value = Decimal(str(new_val))
    c.status = ContractStatus.ADDENDUM

    db.add(a); db.commit(); db.refresh(a)
    return {"id": str(a.id), "success": True}


# ─── LOCATIONS ────────────────────────────────────────────────────────────────

@router.get("/{contract_id}/locations")
def list_locations(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(Location).filter(
        Location.contract_id == contract_id, Location.is_active == True
    ).order_by(Location.location_code).all()
    return [{
        "id": str(loc.id), "location_code": loc.location_code, "name": loc.name,
        "village": loc.village, "district": loc.district,
        "city": loc.city, "province": loc.province,
        "latitude": float(loc.latitude or 0), "longitude": float(loc.longitude or 0),
        "facility_count": len(loc.facilities),
        "is_active": loc.is_active, "created_at": str(loc.created_at),
    } for loc in rows]

@router.post("/{contract_id}/locations")
def create_location(contract_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Location).filter(Location.location_code == data.get("location_code")).first():
        raise HTTPException(400, f"Kode lokasi '{data['location_code']}' sudah ada.")
    loc = Location(
        contract_id=contract_id,
        location_code=data["location_code"],
        name=data["name"],
        village=data.get("village"), district=data.get("district"),
        city=data.get("city"), province=data.get("province"),
        latitude=data.get("latitude") or None,
        longitude=data.get("longitude") or None,
    )
    db.add(loc); db.commit(); db.refresh(loc)
    return {"id": str(loc.id), "name": loc.name, "success": True}


# ─── FACILITIES ───────────────────────────────────────────────────────────────

@router.get("/locations/{location_id}/facilities")
def list_facilities(location_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(Facility).filter(
        Facility.location_id == location_id, Facility.is_active == True
    ).order_by(Facility.display_order, Facility.facility_name).all()
    return [{
        "id": str(f.id), "facility_type": f.facility_type, "facility_name": f.facility_name,
        "display_order": f.display_order, "total_value": float(f.total_value or 0),
        "notes": f.notes, "boq_imported_at": str(f.boq_imported_at) if f.boq_imported_at else None,
        "boq_source_file": f.boq_source_file, "is_active": f.is_active,
    } for f in rows]

@router.post("/locations/{location_id}/facilities")
def create_facility(location_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    fac = Facility(
        location_id=location_id,
        facility_type=data["facility_type"],
        facility_name=data["facility_name"],
        display_order=int(data.get("display_order") or 0),
        notes=data.get("notes"),
    )
    db.add(fac); db.commit(); db.refresh(fac)
    return {"id": str(fac.id), "facility_name": fac.facility_name, "success": True}

@router.put("/facilities/{facility_id}")
def update_facility(facility_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    fac = db.query(Facility).filter(Facility.id == facility_id).first()
    if not fac: raise HTTPException(404)
    for k, v in data.items():
        if hasattr(fac, k) and k not in ("id", "location_id", "created_at"):
            setattr(fac, k, v)
    db.commit()
    return {"success": True}


# ─── BOQ ──────────────────────────────────────────────────────────────────────

@router.get("/facilities/{facility_id}/boq")
def list_boq(facility_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    items = db.query(BOQItem).filter(
        BOQItem.facility_id == facility_id
    ).order_by(BOQItem.sort_order, BOQItem.original_code).all()

    result = []
    for item in items:
        # Progress terbaru item ini
        from app.models.models import WeeklyProgressItem
        latest_prog = db.query(WeeklyProgressItem).filter(
            WeeklyProgressItem.boq_item_id == item.id
        ).order_by(WeeklyProgressItem.id.desc()).first()

        result.append({
            "id": str(item.id),
            "facility_id": str(item.facility_id),
            "master_work_code": item.master_work_code,
            "original_code": item.original_code,
            "parent_code": item.parent_code,
            "level": item.level,
            "sort_order": item.sort_order,
            "description": item.description,
            "unit": item.unit,
            "volume": float(item.volume or 0),
            "unit_price": float(item.unit_price or 0),
            "total_price": float(item.total_price or 0),
            "weight_pct": float(item.weight_pct or 0),
            "planned_start_week": item.planned_start_week,
            "planned_duration_weeks": item.planned_duration_weeks,
            "planned_end_week": item.planned_end_week,
            "version": item.version,
            "is_active": item.is_active,
            "is_addendum_item": item.is_addendum_item,
            "latest_progress_pct": float(latest_prog.progress_cumulative_pct or 0) if latest_prog else 0.0,
            "latest_volume_cumulative": float(latest_prog.volume_cumulative or 0) if latest_prog else 0.0,
        })
    return result

@router.post("/facilities/{facility_id}/boq")
def create_boq_item(facility_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    fac = db.query(Facility).filter(Facility.id == facility_id).first()
    if not fac: raise HTTPException(404, "Fasilitas tidak ditemukan")

    weight = float(data.get("weight_pct") or 0)
    total  = float(data.get("total_price") or 0)
    vol    = float(data.get("volume") or 0)
    harga  = float(data.get("unit_price") or 0)
    if total == 0 and vol > 0 and harga > 0:
        total = vol * harga

    item = BOQItem(
        facility_id=facility_id,
        master_work_code=data.get("master_work_code"),
        original_code=data.get("original_code"),
        parent_code=data.get("parent_code"),
        level=int(data.get("level") or 1),
        sort_order=int(data.get("sort_order") or 0),
        description=data["description"],
        unit=data.get("unit"),
        volume=vol,
        unit_price=harga,
        total_price=total,
        weight_pct=weight,
        planned_start_week=data.get("planned_start_week"),
        planned_duration_weeks=data.get("planned_duration_weeks"),
        notes=data.get("notes"),
    )
    db.add(item); db.commit(); db.refresh(item)

    # Update total_value fasilitas
    total_fac = db.query(func.sum(BOQItem.total_price)).filter(
        BOQItem.facility_id == facility_id, BOQItem.is_active == True, BOQItem.level > 0
    ).scalar() or 0
    fac.total_value = total_fac
    db.commit()

    return {"id": str(item.id), "success": True}

@router.post("/facilities/{facility_id}/boq/bulk")
def bulk_create_boq(facility_id: str, items: list, db: Session = Depends(get_db), _=Depends(get_current_user)):
    fac = db.query(Facility).filter(Facility.id == facility_id).first()
    if not fac: raise HTTPException(404)
    created = 0
    for data in items:
        item = BOQItem(
            facility_id=facility_id,
            **{k: v for k, v in data.items() if hasattr(BOQItem, k) and k not in ("id",)},
        )
        db.add(item)
        created += 1
    db.commit()
    # Update total_value
    total_fac = db.query(func.sum(BOQItem.total_price)).filter(
        BOQItem.facility_id == facility_id, BOQItem.is_active == True, BOQItem.level > 0
    ).scalar() or 0
    fac.total_value = total_fac
    db.commit()
    return {"created": created, "success": True}

@router.put("/boq/{item_id}")
def update_boq_item(item_id: str, data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(BOQItem).filter(BOQItem.id == item_id).first()
    if not item: raise HTTPException(404)
    for k, v in data.items():
        if hasattr(item, k) and k not in ("id", "facility_id", "created_at"):
            setattr(item, k, v)
    db.commit()
    return {"success": True}

@router.delete("/boq/{item_id}")
def delete_boq_item(item_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    item = db.query(BOQItem).filter(BOQItem.id == item_id).first()
    if not item: raise HTTPException(404)
    item.is_active = False
    db.commit()
    return {"success": True}