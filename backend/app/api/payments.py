"""
Sistem Termin Pembayaran — CRUD + status tracking + catatan reviewer (Itjen).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date
from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.models import PaymentTerm, Contract, PaymentStatus, UserRole
from app.schemas.schemas import PaymentTermCreate, PaymentTermUpdate

router = APIRouter(prefix="/payments", tags=["payments"])


def _pt_dict(p):
    return {
        "id": str(p.id), "contract_id": str(p.contract_id),
        "term_number": p.term_number, "term_name": p.term_name,
        "percentage": float(p.percentage or 0),
        "amount": float(p.amount or 0),
        "status": p.status.value if hasattr(p.status,"value") else p.status,
        "submitted_date": str(p.submitted_date) if p.submitted_date else None,
        "approved_date":  str(p.approved_date)  if p.approved_date  else None,
        "paid_date":      str(p.paid_date)       if p.paid_date      else None,
        "amount_paid":    float(p.amount_paid or 0),
        "reviewer_notes": p.reviewer_notes,
        "notes": p.notes,
        "created_at": str(p.created_at),
    }


@router.get("/contract/{contract_id}")
def list_terms(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(PaymentTerm).filter(PaymentTerm.contract_id == contract_id).order_by(PaymentTerm.term_number).all()
    total_pct  = sum(float(r.percentage or 0) for r in rows)
    total_paid = sum(float(r.amount_paid or 0) for r in rows if r.status == PaymentStatus.PAID)
    return {"terms": [_pt_dict(r) for r in rows], "total_percentage": total_pct, "total_paid": total_paid}


@router.post("")
def create_term(data: PaymentTermCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    contract = db.query(Contract).filter(Contract.id == data.contract_id).first()
    if not contract: raise HTTPException(404, "Kontrak tidak ditemukan")
    amount = data.amount or (float(contract.current_value or 0) * data.percentage / 100)
    pt = PaymentTerm(
        contract_id=data.contract_id, term_number=data.term_number,
        term_name=data.term_name, percentage=Decimal(str(data.percentage)),
        amount=Decimal(str(amount)), notes=data.notes,
    )
    db.add(pt); db.commit(); db.refresh(pt)
    return _pt_dict(pt)


@router.put("/{term_id}")
def update_term_status(term_id: str, data: PaymentTermUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    pt = db.query(PaymentTerm).filter(PaymentTerm.id == term_id).first()
    if not pt: raise HTTPException(404)
    if data.status: pt.status = data.status
    if data.reviewer_notes: pt.reviewer_notes = data.reviewer_notes
    if data.amount_paid:    pt.amount_paid    = Decimal(str(data.amount_paid))
    for field in ("submitted_date","approved_date","paid_date"):
        v = getattr(data, field, None)
        if v:
            try: setattr(pt, field, date.fromisoformat(str(v)[:10]))
            except Exception: pass
    db.commit()
    return _pt_dict(pt)


@router.delete("/{term_id}")
def delete_term(term_id: str, db: Session = Depends(get_db), _=Depends(require_roles(UserRole.SUPERADMIN, UserRole.PPK))):
    pt = db.query(PaymentTerm).filter(PaymentTerm.id == term_id).first()
    if not pt: raise HTTPException(404)
    db.delete(pt); db.commit()
    return {"success": True}
