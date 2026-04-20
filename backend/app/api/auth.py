from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.models import User, UserRole
from app.schemas.schemas import Token, LoginRequest, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
        )
    token = create_access_token({"sub": user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        user={
            "id":    str(user.id),
            "email": user.email,
            "name":  user.full_name,
            "role":  user.role.value,   # ← .value penting: kirim string, bukan Enum object
        },
    )


@router.post("/register", response_model=UserOut)
def register(req: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=req.role,
        phone=req.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/setup-admin", response_model=UserOut)
def setup_first_admin(req: UserCreate, db: Session = Depends(get_db)):
    """Setup admin pertama. Otomatis disabled jika sudah ada user."""
    if db.query(User).count() > 0:
        raise HTTPException(status_code=403, detail="Admin sudah ada")
    user = User(
        email=req.email,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=UserRole.SUPERADMIN,
        phone=req.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db), token: str = None):
    """Cek user dari token aktif."""
    from app.api.deps import get_current_user
    from fastapi import Request
    # Endpoint ini dipanggil lewat deps, bukan langsung
    raise HTTPException(status_code=501, detail="Gunakan Authorization header")