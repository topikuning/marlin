from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
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


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str]
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
    description: Optional[str]
    created_at: datetime
    company: Optional[CompanyOut] = None
    ppk: Optional[PPKOut] = None

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
    old_contract_value: Optional[Decimal]
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
    facilities: List["FacilitySummary"] = []

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
    description: str
    unit: Optional[str] = None
    volume: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    weight_pct: Decimal = Decimal("0")
    planned_start_week: Optional[int] = None
    planned_duration_weeks: Optional[int] = None
    planned_end_week: Optional[int] = None
    is_addendum_item: bool = False


class BOQItemOut(BaseModel):
    id: UUID
    facility_id: UUID
    master_work_code: Optional[str]
    original_code: Optional[str]
    parent_code: Optional[str]
    level: int
    description: str
    unit: Optional[str]
    volume: Decimal
    unit_price: Decimal
    total_price: Decimal
    weight_pct: Decimal
    planned_start_week: Optional[int]
    planned_duration_weeks: Optional[int]
    planned_end_week: Optional[int]
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
    boq_item_id: UUID
    volume_this_week: Decimal = Decimal("0")
    volume_cumulative: Decimal = Decimal("0")
    notes: Optional[str] = None


class WeeklyReportCreate(BaseModel):
    contract_id: UUID
    week_number: int
    period_start: date
    period_end: date
    report_date: Optional[date] = None
    planned_weekly_pct: Optional[Decimal] = None
    planned_cumulative_pct: Optional[Decimal] = None
    manpower_count: int = 0
    manpower_skilled: int = 0
    manpower_unskilled: int = 0
    rain_days: int = 0
    obstacles: Optional[str] = None
    solutions: Optional[str] = None
    submitted_by: Optional[str] = None
    progress_items: List[WeeklyProgressItemCreate] = []


class WeeklyProgressItemOut(BaseModel):
    id: UUID
    boq_item_id: UUID
    boq_description: Optional[str] = None
    boq_unit: Optional[str] = None
    boq_weight_pct: Optional[Decimal] = None
    volume_this_week: Decimal
    volume_cumulative: Decimal
    progress_this_week_pct: Decimal
    progress_cumulative_pct: Decimal
    weighted_progress_pct: Decimal

    class Config:
        from_attributes = True


class WeeklyReportOut(BaseModel):
    id: UUID
    contract_id: UUID
    week_number: int
    period_start: date
    period_end: date
    report_date: Optional[date]
    planned_weekly_pct: Decimal
    planned_cumulative_pct: Decimal
    actual_weekly_pct: Decimal
    actual_cumulative_pct: Decimal
    deviation_pct: Decimal
    deviation_status: DeviationStatus
    days_elapsed: int
    days_remaining: int
    spi: Optional[Decimal]
    manpower_count: int
    rain_days: int
    obstacles: Optional[str]
    solutions: Optional[str]
    submitted_by: Optional[str]
    import_source: str
    is_locked: bool
    created_at: datetime
    progress_items: List[WeeklyProgressItemOut] = []

    class Config:
        from_attributes = True


# ─── S-CURVE DATA ─────────────────────────────────────────────────────────────

class SCurvePoint(BaseModel):
    week: int
    period_start: Optional[date]
    period_end: Optional[date]
    planned_cumulative: float
    actual_cumulative: Optional[float]
    deviation: Optional[float]
    deviation_status: Optional[str]
    spi: Optional[float]


class SCurveResponse(BaseModel):
    contract_id: str
    contract_number: str
    contract_name: str
    total_weeks: int
    current_week: int
    latest_actual: float
    latest_planned: float
    latest_deviation: float
    forecast_completion_week: Optional[int]
    forecast_delay_days: Optional[int]
    points: List[SCurvePoint]
    addendum_weeks: List[int] = []  # Minggu ke berapa addendum berlaku


# ─── DASHBOARD SUMMARY ────────────────────────────────────────────────────────

class ContractSummary(BaseModel):
    id: str
    contract_number: str
    contract_name: str
    company_name: str
    ppk_name: str
    city: Optional[str]
    province: Optional[str]
    current_week: int
    total_weeks: int
    actual_cumulative: float
    planned_cumulative: float
    deviation: float
    deviation_status: str
    spi: Optional[float]
    days_remaining: int
    location_count: int
    facility_count: int
    contract_value: float
    has_active_warning: bool


class DashboardStats(BaseModel):
    total_contracts: int
    total_locations: int
    total_value: float
    avg_progress: float
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
    parameter_name: Optional[str]
    parameter_value: Optional[Decimal]
    threshold_value: Optional[Decimal]
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── EXCEL IMPORT ─────────────────────────────────────────────────────────────

class ExcelImportResult(BaseModel):
    success: bool
    contract_id: Optional[str]
    week_number: Optional[int]
    items_imported: int
    items_skipped: int
    warnings: List[str] = []
    errors: List[str] = []
