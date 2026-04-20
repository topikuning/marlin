"""
Laporan Harian — foto kegiatan + narasi dari konsultan.
TIDAK ada input persentase progress sama sekali.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import date
import os, uuid as _uuid, aiofiles
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import DailyReport, DailyReportPhoto, Location, Contract
from app.schemas.schemas import DailyReportCreate

router = APIRouter(prefix="/daily-reports", tags=["daily-reports"])

UPLOAD_DIR = "/app/uploads/daily"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXT = {".jpg",".jpeg",".png",".webp",".heic"}


def _dr_dict(r):
    return {
        "id": str(r.id),
        "contract_id": str(r.contract_id),
        "location_id": str(r.location_id),
        "location_name": r.location.name if r.location else "",
        "report_date": str(r.report_date),
        "description": r.description,
        "weather": r.weather,
        "manpower_count": r.manpower_count,
        "submitted_by": r.submitted_by,
        "is_approved": r.is_approved,
        "photos": [{"id":str(p.id),"file_path":p.file_path,"caption":p.caption} for p in (r.photos or [])],
        "created_at": str(r.created_at),
    }


@router.get("/contract/{contract_id}")
def list_by_contract(contract_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(DailyReport).filter(
        DailyReport.contract_id == contract_id
    ).order_by(DailyReport.report_date.desc()).all()
    return [_dr_dict(r) for r in rows]


@router.get("/location/{location_id}")
def list_by_location(location_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.query(DailyReport).filter(
        DailyReport.location_id == location_id
    ).order_by(DailyReport.report_date.desc()).all()
    return [_dr_dict(r) for r in rows]


@router.get("/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not r: raise HTTPException(404)
    return _dr_dict(r)


@router.post("")
def create_report(data: DailyReportCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    loc = db.query(Location).filter(Location.id == data.location_id).first()
    if not loc: raise HTTPException(404, "Lokasi tidak ditemukan")
    try:
        rd = date.fromisoformat(str(data.report_date)[:10])
    except Exception:
        raise HTTPException(422, "Format tanggal tidak valid")
    r = DailyReport(
        contract_id=str(loc.contract_id),
        location_id=data.location_id,
        report_date=rd,
        description=data.description,
        weather=data.weather,
        manpower_count=data.manpower_count or 0,
        submitted_by=data.submitted_by or current_user.full_name,
    )
    db.add(r); db.commit(); db.refresh(r)
    return _dr_dict(r)


@router.post("/{report_id}/photos")
async def upload_photo(
    report_id: str,
    caption: str = Form(default=""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    r = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not r: raise HTTPException(404)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Format tidak didukung. Gunakan: {', '.join(ALLOWED_EXT)}")
    filename = f"{_uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    photo = DailyReportPhoto(daily_report_id=report_id, file_path=f"/uploads/daily/{filename}", caption=caption)
    db.add(photo); db.commit(); db.refresh(photo)
    return {"id": str(photo.id), "file_path": photo.file_path, "caption": photo.caption}


@router.delete("/{report_id}/photos/{photo_id}")
def delete_photo(report_id: str, photo_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    p = db.query(DailyReportPhoto).filter(DailyReportPhoto.id == photo_id, DailyReportPhoto.daily_report_id == report_id).first()
    if not p: raise HTTPException(404)
    try:
        fp = p.file_path.lstrip("/")
        if os.path.exists(f"/app/{fp}"): os.remove(f"/app/{fp}")
    except Exception: pass
    db.delete(p); db.commit()
    return {"success": True}


@router.post("/{report_id}/approve")
def approve_report(report_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.models import UserRole
    from datetime import datetime
    if current_user.role not in (UserRole.SUPERADMIN, UserRole.PPK, UserRole.MANAGER):
        raise HTTPException(403, "Tidak punya akses approve")
    r = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not r: raise HTTPException(404)
    r.is_approved = True; r.approved_by = current_user.full_name; r.approved_at = datetime.utcnow()
    db.commit()
    return {"success": True}
