from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from app.models.models import (
    ContractStatus, AddendumType, DeviationStatus,
    UserRole, WorkCategory
)


# ─── AUTH ─────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LoginRequest(BaseModel):
    email: str
    password: str


# ─── USER ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.VIEWER
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── MASTER WORK CODE ─────────────────────────────────────────────────────────

class MasterWorkCodeCreate(BaseModel):
    code: str
    category: WorkCategory
    sub_category: str
    description: str
    default_unit: Optional[str] = None
    notes: Optional[str] = None


class MasterWorkCodeOut(MasterWorkCodeCreate):
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── COMPANY ──────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    npwp: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CompanyOut(CompanyCreate):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── PPK ──────────────────────────────────────────────────────────────────────

class PPKCreate(BaseModel):
    name: str
    nip: Optional[str] = None
    jabatan: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    satker: Optional[str] = None


class PPKOut(PPKCreate):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── CONTRACT ─────────────────────────────────────────────────────────────────

class ContractCreate(BaseModel):
    company_id: UUID
    ppk_id: UUID
    contract_number: str
    contract_name: str
    fiscal_year: int
    start_date: date
    end_date: date
    duration_days: int
    original_value: Decimal
    province: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None


class ContractOut(BaseModel):
    id: UUID
    company_id: UUID
    ppk_id: UUID
    contract_number: str
    contract_name: str
    fiscal_year: int
    start_date: date
    end_date: date
    duration_days: int
    original_value: Decimal
    current_value: Decimal
    status: ContractStatus
    province: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── CONTRACT ADDENDUM ────────────────────────────────────────────────────────

class AddendumCreate(BaseModel):
    contract_id: UUID
    addendum_number: str
    addendum_type: AddendumType
    effective_date: date
    extension_days: int = 0
    new_end_date: Optional[date] = None
    new_contract_value: Optional[Decimal] = None
    description: Optional[str] = None


class AddendumOut(AddendumCreate):
    id: UUID
    old_contract_value: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── LOCATION ─────────────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    contract_id: UUID
    location_code: str
    name: str
    village: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class LocationOut(LocationCreate):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── FACILITY ─────────────────────────────────────────────────────────────────

class FacilityCreate(BaseModel):
    location_id: UUID
    facility_type: str
    facility_name: str
    display_order: int = 0
    notes: Optional[str] = None


class FacilitySummary(BaseModel):
    id: UUID
    facility_type: str
    facility_name: str
    total_value: Decimal

    class Config:
        from_attributes = True


class FacilityOut(FacilityCreate):
    id: UUID
    total_value: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── BOQ ITEM ─────────────────────────────────────────────────────────────────

class BOQItemCreate(BaseModel):
    facility_id: UUID
    master_work_code: Optional[str] = None
    original_code: Optional[str] = None
    parent_code: Optional[str] = None
    level: int = 1
    sort_order: int = 0
    description: str
    unit: Optional[str] = None
    volume: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    weight_pct: Decimal = Decimal("0")
    planned_start_week: Optional[int] = None
    planned_duration_weeks: Optional[int] = None
    planned_end_week: Optional[int] = None
    notes: Optional[str] = None
    is_addendum_item: bool = False


class BOQItemOut(BaseModel):
    id: UUID
    facility_id: UUID
    master_work_code: Optional[str] = None
    original_code: Optional[str] = None
    parent_code: Optional[str] = None
    level: int
    sort_order: int = 0
    description: str
    unit: Optional[str] = None
    volume: Decimal
    unit_price: Decimal
    total_price: Decimal
    weight_pct: Decimal
    planned_start_week: Optional[int] = None
    planned_duration_weeks: Optional[int] = None
    planned_end_week: Optional[int] = None
    version: int
    is_active: bool
    is_addendum_item: bool

    class Config:
        from_attributes = True


class BOQItemUpdate(BaseModel):
    volume: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None
    weight_pct: Optional[Decimal] = None
    planned_start_week: Optional[int] = None
    planned_duration_weeks: Optional[int] = None
    planned_end_week: Optional[int] = None
    is_active: Optional[bool] = None
    change_reason: Optional[str] = None
    addendum_id: Optional[UUID] = None


# ─── WEEKLY REPORT ────────────────────────────────────────────────────────────

class WeeklyProgressItemCreate(BaseModel):
    boq_item_id: str            # string — hindari UUID parse error dari frontend
    volume_this_week: float = 0.0
    volume_cumulative: float = 0.0
    notes: Optional[str] = None


class WeeklyReportCreate(BaseModel):
    week_number: int
    period_start: str           # YYYY-MM-DD sebagai string
    period_end: str
    report_date: Optional[str] = None
    planned_cumulative_pct: float = 0.0   # persen: 45.5 = 45.5%
    actual_cumulative_pct: float = 0.0
    manpower_count: int = 0
    manpower_skilled: int = 0
    manpower_unskilled: int = 0
    rain_days: int = 0
    obstacles: Optional[str] = None
    solutions: Optional[str] = None
    submitted_by: Optional[str] = None
    progress_items: List[WeeklyProgressItemCreate] = []

    @field_validator("period_start", "period_end", "report_date", mode="before")
    @classmethod
    def coerce_date(cls, v):
        if v is None:
            return v
        return str(v)[:10]


# ─── DAILY REPORT ─────────────────────────────────────────────────────────────

class DailyReportCreate(BaseModel):
    location_id: str
    report_date: str
    description: str
    weather: Optional[str] = None
    manpower_count: int = 0
    submitted_by: Optional[str] = None

    @field_validator("report_date", mode="before")
    @classmethod
    def coerce_date(cls, v):
        return str(v)[:10] if v else v


# ─── PAYMENT TERM ─────────────────────────────────────────────────────────────

class PaymentTermCreate(BaseModel):
    contract_id: str
    term_number: int
    term_name: str
    percentage: float
    amount: Optional[float] = None
    notes: Optional[str] = None


class PaymentTermUpdate(BaseModel):
    status: Optional[str] = None
    submitted_date: Optional[str] = None
    approved_date: Optional[str] = None
    paid_date: Optional[str] = None
    reviewer_notes: Optional[str] = None
    amount_paid: Optional[float] = None


# ─── S-CURVE ──────────────────────────────────────────────────────────────────

class SCurvePoint(BaseModel):
    week: int
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    planned_cumulative: float
    actual_cumulative: Optional[float] = None
    deviation: Optional[float] = None
    deviation_status: Optional[str] = None
    spi: Optional[float] = None


class SCurveResponse(BaseModel):
    contract_id: str
    contract_number: str
    contract_name: str
    total_weeks: int
    current_week: int
    latest_actual: float
    latest_planned: float
    latest_deviation: float
    forecast_completion_week: Optional[int] = None
    forecast_delay_days: Optional[int] = None
    points: List[SCurvePoint]
    addendum_weeks: List[int] = []


# ─── DASHBOARD ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_contracts: int
    total_locations: int
    total_value: float
    avg_progress: float
    avg_planned: float = 0.0
    contracts_on_track: int
    contracts_warning: int
    contracts_critical: int
    contracts_completed: int
    active_warnings: int


class EarlyWarningOut(BaseModel):
    id: UUID
    contract_id: UUID
    contract_number: str
    contract_name: str
    warning_type: str
    severity: str
    message: str
    parameter_name: Optional[str] = None
    parameter_value: Optional[Decimal] = None
    threshold_value: Optional[Decimal] = None
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── EXCEL IMPORT ─────────────────────────────────────────────────────────────

class ExcelImportResult(BaseModel):
    success: bool
    contract_id: Optional[str] = None
    week_number: Optional[int] = None
    items_imported: int = 0
    items_skipped: int = 0
    warnings: List[str] = []
    errors: List[str] = []