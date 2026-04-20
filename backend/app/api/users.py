"""
User Management — CRUD lengkap dengan RBAC.
Superadmin: akses penuh. Manager/PPK: lihat user. Viewer: tidak bisa akses.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.models import User, UserRole
from app.schemas.schemas import UserCreate, UserUpdate, UserOut
from app.core.security import get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list)
def list_users(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(403, "Akses ditolak")
    users = db.query(User).order_by(User.full_name).all()
    return [_u(u) for u in users]


@router.get("/me", response_model=UserOut)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == UserRole.VIEWER and str(current_user.id) != user_id:
        raise HTTPException(403)
    u = db.query(User).filter(User.id == user_id).first()
    if not u: raise HTTPException(404)
    return _u(u)


@router.post("")
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(UserRole.SUPERADMIN))):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email sudah digunakan")
    u = User(email=data.email, full_name=data.full_name,
             hashed_password=get_password_hash(data.password),
             role=data.role, phone=data.phone,
             whatsapp_number=data.whatsapp_number)
    db.add(u); db.commit(); db.refresh(u)
    return _u(u)


@router.put("/{user_id}")
def update_user(user_id: str, data: UserUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # User bisa edit diri sendiri (kecuali role). Superadmin bisa edit semua.
    if str(current_user.id) != user_id and current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(403, "Tidak bisa mengedit user lain")
    u = db.query(User).filter(User.id == user_id).first()
    if not u: raise HTTPException(404)
    if data.full_name  is not None: u.full_name  = data.full_name
    if data.phone      is not None: u.phone      = data.phone
    if data.whatsapp_number is not None: u.whatsapp_number = data.whatsapp_number
    if data.is_active  is not None and current_user.role == UserRole.SUPERADMIN:
        u.is_active = data.is_active
    if data.role       is not None and current_user.role == UserRole.SUPERADMIN:
        u.role = data.role
    if data.password   is not None:
        u.hashed_password = get_password_hash(data.password)
    db.commit(); db.refresh(u)
    return _u(u)


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user=Depends(require_roles(UserRole.SUPERADMIN))):
    if str(current_user.id) == user_id: raise HTTPException(400, "Tidak bisa hapus akun sendiri")
    u = db.query(User).filter(User.id == user_id).first()
    if not u: raise HTTPException(404)
    u.is_active = False; db.commit()
    return {"success": True}


def _u(u):
    return {"id":str(u.id),"email":u.email,"full_name":u.full_name,
            "role":u.role.value if hasattr(u.role,"value") else u.role,
            "phone":u.phone,"whatsapp_number":u.whatsapp_number,
            "is_active":u.is_active,"created_at":str(u.created_at)}
