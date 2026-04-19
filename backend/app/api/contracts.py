from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import (
    Contract, ContractAddendum, Location, Facility, BOQItem,
    Company, PPK, ContractStatus, User
)
from app.schemas.schemas import (
    ContractCreate, ContractOut, AddendumCreate, AddendumOut,
    LocationCreate, LocationOut, FacilityCreate, FacilityOut,
    BOQItemCreate, BOQItemOut, BOQItemUpdate
)
from decimal import Decimal
import uuid

router = APIRouter(prefix="/contracts", tags=["contracts"])


# ─── COMPANY ──────────────────────────────────────────────────────────────────

@router.get("/companies", response_model=List[dict])
def list_companies(db: Session = Depends(get_db), _=Depends(get_current_user)):
    companies = db.query(Company).filter(Company.is_active == True).all()
    return [{"id": str(c.id), "name": c.name, "npwp": c.npwp} for c in companies]


@router.post("/companies")
def create_company(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = Company(**data)
    db.add(c); db.commit(); db.refresh(c)
    return {"id": str(c.id), "name": c.name}


# ─── PPK ──────────────────────────────────────────────────────────────────────

@router.get("/ppk", response_model=List[dict])
def list_ppk(db: Session = Depends(get_db), _=Depends(get_current_user)):
    ppk_list = db.query(PPK).filter(PPK.is_active == True).all()
    return [{"id": str(p.id), "name": p.name, "nip": p.nip, "satker": p.satker} for p in ppk_list]


@router.post("/ppk")
def create_ppk(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = PPK(**data)
    db.add(p); db.commit(); db.refresh(p)
    return {"id": str(p.id), "name": p.name}


# ─── CONTRACTS ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[dict])
def list_contracts(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    status: Optional[str] = None,
    company_id: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(Contract).options(
        joinedload(Contract.company),
        joinedload(Contract.ppk),
        joinedload(Contract.locations),
    )
    if status:
        q = q.filter(Contract.status == status)
    if company_id:
        q = q.filter(Contract.company_id == company_id)
    if search:
        q = q.filter(
            Contract.contract_number.ilike(f"%{search}%") |
            Contract.contract_name.ilike(f"%{search}%")
        )
    contracts = q.order_by(Contract.fiscal_year.desc(), Contract.start_date.desc()).all()
    return [_contract_to_dict(c) for c in contracts]


@router.post("", response_model=dict)
def create_contract(data: ContractCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Contract).filter(Contract.contract_number == data.contract_number).first():
        raise HTTPException(400, detail="Nomor kontrak sudah ada")
    contract = Contract(
        **data.model_dump(),
        current_value=data.original_value,
        status=ContractStatus.ACTIVE,
    )
    db.add(contract); db.commit(); db.refresh(contract)
    return {"id": str(contract.id), "contract_number": contract.contract_number}


@router.get("/{contract_id}", response_model=dict)
def get_contract(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Contract).options(
        joinedload(Contract.company),
        joinedload(Contract.ppk),
        joinedload(Contract.locations).joinedload(Location.facilities),
        joinedload(Contract.addenda),
    ).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(404, detail="Kontrak tidak ditemukan")
    return _contract_to_dict(c, detail=True)


# ─── ADDENDUM ─────────────────────────────────────────────────────────────────

@router.post("/{contract_id}/addenda")
def create_addendum(
    contract_id: str,
    data: AddendumCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(404, "Kontrak tidak ditemukan")

    adm = ContractAddendum(
        contract_id=contract_id,
        addendum_number=data.addendum_number,
        addendum_type=data.addendum_type,
        effective_date=data.effective_date,
        extension_days=data.extension_days or 0,
        new_end_date=data.new_end_date,
        old_contract_value=contract.current_value,
        new_contract_value=data.new_contract_value,
        description=data.description,
    )
    db.add(adm)

    # Update kontrak
    if data.new_contract_value:
        contract.current_value = data.new_contract_value
    if data.extension_days and data.extension_days > 0:
        contract.duration_days += data.extension_days
        if data.new_end_date:
            contract.end_date = data.new_end_date
    contract.status = ContractStatus.ADDENDUM

    db.commit(); db.refresh(adm)
    return {"id": str(adm.id), "addendum_number": adm.addendum_number}


@router.get("/{contract_id}/addenda")
def list_addenda(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    addenda = db.query(ContractAddendum).filter(
        ContractAddendum.contract_id == contract_id
    ).order_by(ContractAddendum.effective_date).all()
    return [{"id": str(a.id), "number": a.addendum_number, "type": a.addendum_type,
             "date": str(a.effective_date), "new_value": float(a.new_contract_value or 0),
             "extension_days": a.extension_days} for a in addenda]


# ─── LOCATIONS ────────────────────────────────────────────────────────────────

@router.get("/{contract_id}/locations")
def list_locations(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    locs = db.query(Location).options(joinedload(Location.facilities)).filter(
        Location.contract_id == contract_id, Location.is_active == True
    ).all()
    return [_location_to_dict(l) for l in locs]


@router.post("/{contract_id}/locations")
def create_location(
    contract_id: str, data: LocationCreate,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    if db.query(Location).filter(Location.location_code == data.location_code).first():
        raise HTTPException(400, "Kode lokasi sudah ada")
    loc = Location(**data.model_dump())
    db.add(loc); db.commit(); db.refresh(loc)
    return {"id": str(loc.id), "location_code": loc.location_code}


# ─── FACILITIES ───────────────────────────────────────────────────────────────

@router.post("/locations/{location_id}/facilities")
def create_facility(
    location_id: str, data: FacilityCreate,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    fac = Facility(**data.model_dump())
    db.add(fac); db.commit(); db.refresh(fac)
    return {"id": str(fac.id), "facility_name": fac.facility_name}


# ─── BOQ ITEMS ────────────────────────────────────────────────────────────────

@router.get("/facilities/{facility_id}/boq", response_model=List[dict])
def list_boq_items(facility_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    items = db.query(BOQItem).filter(
        BOQItem.facility_id == facility_id, BOQItem.is_active == True
    ).order_by(BOQItem.original_code).all()
    return [_boq_to_dict(i) for i in items]


@router.post("/facilities/{facility_id}/boq")
def create_boq_item(
    facility_id: str, data: BOQItemCreate,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    if not data.total_price or data.total_price == 0:
        if data.volume and data.unit_price:
            data.total_price = data.volume * data.unit_price

    item = BOQItem(**data.model_dump())
    db.add(item)

    # Hitung ulang bobot semua item dalam facility
    db.flush()
    _recalculate_weights(db, facility_id)
    db.commit()
    db.refresh(item)
    return {"id": str(item.id), "description": item.description}


@router.put("/boq/{item_id}")
def update_boq_item(
    item_id: str, data: BOQItemUpdate,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    from app.models.models import BOQItemVersion
    item = db.query(BOQItem).filter(BOQItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item BOQ tidak ditemukan")

    # Simpan versi lama jika ada addendum
    if data.addendum_id:
        ver = BOQItemVersion(
            boq_item_id=item_id,
            addendum_id=str(data.addendum_id),
            version_number=item.version,
            old_volume=item.volume,
            old_unit_price=item.unit_price,
            old_total_price=item.total_price,
            old_weight_pct=item.weight_pct,
            old_planned_start_week=item.planned_start_week,
            old_planned_duration_weeks=item.planned_duration_weeks,
            old_is_active=item.is_active,
            new_volume=data.volume or item.volume,
            new_unit_price=data.unit_price or item.unit_price,
            new_total_price=data.total_price or item.total_price,
            new_weight_pct=data.weight_pct or item.weight_pct,
            new_is_active=data.is_active if data.is_active is not None else item.is_active,
            change_reason=data.change_reason,
        )
        db.add(ver)
        item.version += 1

    for field, val in data.model_dump(exclude_none=True).items():
        if field not in ("change_reason", "addendum_id") and hasattr(item, field):
            setattr(item, field, val)

    _recalculate_weights(db, str(item.facility_id))
    db.commit()
    return {"id": str(item.id), "version": item.version}


@router.post("/facilities/{facility_id}/boq/bulk")
def bulk_create_boq(
    facility_id: str, items: List[BOQItemCreate],
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    created = []
    for item_data in items:
        item_data.facility_id = uuid.UUID(facility_id)
        if not item_data.total_price or item_data.total_price == 0:
            if item_data.volume and item_data.unit_price:
                item_data.total_price = item_data.volume * item_data.unit_price
        item = BOQItem(**item_data.model_dump())
        db.add(item)
        created.append(item)

    db.flush()
    _recalculate_weights(db, facility_id)
    db.commit()
    return {"created": len(created)}


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _recalculate_weights(db: Session, facility_id: str):
    """Hitung ulang bobot % semua item aktif dalam satu fasilitas."""
    items = db.query(BOQItem).filter(
        BOQItem.facility_id == facility_id,
        BOQItem.is_active == True,
        BOQItem.level > 0,
    ).all()
    total = sum(float(i.total_price or 0) for i in items)
    if total > 0:
        for item in items:
            item.weight_pct = Decimal(str(float(item.total_price or 0) / total))

    # Update total fasilitas
    facility = db.query(Facility).filter(Facility.id == facility_id).first()
    if facility:
        facility.total_value = Decimal(str(total))


def _contract_to_dict(c: Contract, detail: bool = False) -> dict:
    d = {
        "id": str(c.id),
        "contract_number": c.contract_number,
        "contract_name": c.contract_name,
        "fiscal_year": c.fiscal_year,
        "start_date": str(c.start_date),
        "end_date": str(c.end_date),
        "duration_days": c.duration_days,
        "original_value": float(c.original_value),
        "current_value": float(c.current_value),
        "status": c.status,
        "company_name": c.company.name if c.company else None,
        "ppk_name": c.ppk.name if c.ppk else None,
        "location_count": len(c.locations) if c.locations else 0,
    }
    if detail:
        d["locations"] = [_location_to_dict(l) for l in (c.locations or [])]
        d["addenda"] = [{"id": str(a.id), "number": a.addendum_number,
                         "type": a.addendum_type, "date": str(a.effective_date)}
                        for a in (c.addenda or [])]
    return d


def _location_to_dict(l: Location) -> dict:
    return {
        "id": str(l.id),
        "location_code": l.location_code,
        "name": l.name,
        "village": l.village,
        "district": l.district,
        "city": l.city,
        "province": l.province,
        "facility_count": len(l.facilities) if l.facilities else 0,
        "facilities": [{"id": str(f.id), "name": f.facility_name, "type": f.facility_type}
                        for f in (l.facilities or [])],
    }


def _boq_to_dict(i: BOQItem) -> dict:
    return {
        "id": str(i.id),
        "original_code": i.original_code,
        "parent_code": i.parent_code,
        "level": i.level,
        "description": i.description,
        "unit": i.unit,
        "volume": float(i.volume or 0),
        "unit_price": float(i.unit_price or 0),
        "total_price": float(i.total_price or 0),
        "weight_pct": float(i.weight_pct or 0),
        "weight_pct_display": f"{float(i.weight_pct or 0)*100:.4f}%",
        "planned_start_week": i.planned_start_week,
        "planned_duration_weeks": i.planned_duration_weeks,
        "master_work_code": i.master_work_code,
        "version": i.version,
        "is_active": i.is_active,
        "is_addendum_item": i.is_addendum_item,
    }
