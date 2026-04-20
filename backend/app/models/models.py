import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Integer, Numeric, Boolean,
    DateTime, Date, ForeignKey, Enum, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class ContractStatus(str, enum.Enum):
    DRAFT="draft"; ACTIVE="active"; ADDENDUM="addendum"
    COMPLETED="completed"; TERMINATED="terminated"

class AddendumType(str, enum.Enum):
    CCO="cco"; EXTENSION="extension"; VALUE_CHANGE="value_change"; COMBINED="combined"

class DeviationStatus(str, enum.Enum):
    FAST="fast"; NORMAL="normal"; WARNING="warning"; CRITICAL="critical"

class UserRole(str, enum.Enum):
    SUPERADMIN="superadmin"; PPK="ppk"; MANAGER="manager"
    KONSULTAN="konsultan"; VIEWER="viewer"

class WorkCategory(str, enum.Enum):
    PERSIAPAN="persiapan"; STRUKTURAL="struktural"; ARSITEKTURAL="arsitektural"
    MEP="mep"; SITE_WORK="site_work"; KHUSUS="khusus"

class PaymentStatus(str, enum.Enum):
    PENDING="pending"; SUBMITTED="submitted"; REVIEW="review"
    APPROVED="approved"; PAID="paid"; REJECTED="rejected"


class User(Base):
    __tablename__ = "users"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    phone           = Column(String(20))
    whatsapp_number = Column(String(20))   # untuk WA alert masa depan
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MasterWorkCode(Base):
    __tablename__ = "master_work_codes"
    code         = Column(String(30), primary_key=True)
    category     = Column(Enum(WorkCategory), nullable=False)
    sub_category = Column(String(100), nullable=False)
    description  = Column(Text, nullable=False)
    default_unit = Column(String(20))
    notes        = Column(Text)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    boq_items = relationship("BOQItem", back_populates="master_work")


class Company(Base):
    __tablename__ = "companies"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(255), nullable=False)
    npwp           = Column(String(30), unique=True)
    address        = Column(Text)
    contact_person = Column(String(255))
    phone          = Column(String(20))
    email          = Column(String(255))
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    contracts = relationship("Contract", back_populates="company")


class PPK(Base):
    __tablename__ = "ppk"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(String(255), nullable=False)
    nip        = Column(String(30), unique=True, nullable=True)
    jabatan    = Column(String(255))
    phone      = Column(String(20))
    email      = Column(String(255))
    satker     = Column(String(255))
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    contracts = relationship("Contract", back_populates="ppk")


class Contract(Base):
    __tablename__ = "contracts"
    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id             = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    ppk_id                 = Column(UUID(as_uuid=True), ForeignKey("ppk.id"), nullable=False)
    contract_number        = Column(String(100), unique=True, nullable=False, index=True)
    contract_name          = Column(String(500), nullable=False)
    fiscal_year            = Column(Integer, nullable=False)
    start_date             = Column(Date, nullable=False)
    end_date               = Column(Date, nullable=False)
    duration_days          = Column(Integer, nullable=False)
    original_duration_days = Column(Integer)
    original_value         = Column(Numeric(18, 2), nullable=False)
    current_value          = Column(Numeric(18, 2), nullable=False)
    status                 = Column(Enum(ContractStatus), default=ContractStatus.ACTIVE)
    province               = Column(String(100))
    city                   = Column(String(100))
    description            = Column(Text)
    created_at             = Column(DateTime, default=datetime.utcnow)
    updated_at             = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    company        = relationship("Company", back_populates="contracts")
    ppk            = relationship("PPK", back_populates="contracts")
    locations      = relationship("Location", back_populates="contract", cascade="all, delete-orphan")
    addenda        = relationship("ContractAddendum", back_populates="contract", order_by="ContractAddendum.effective_date")
    weekly_reports = relationship("WeeklyReport", back_populates="contract")
    payment_terms  = relationship("PaymentTerm", back_populates="contract")


class ContractAddendum(Base):
    __tablename__ = "contract_addenda"
    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id        = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    addendum_number    = Column(String(100), nullable=False)
    addendum_type      = Column(Enum(AddendumType), nullable=False)
    effective_date     = Column(Date, nullable=False)
    extension_days     = Column(Integer, default=0)
    new_end_date       = Column(Date)
    old_contract_value = Column(Numeric(18, 2))
    new_contract_value = Column(Numeric(18, 2))
    description        = Column(Text)
    document_file      = Column(String(500))
    created_at         = Column(DateTime, default=datetime.utcnow)
    contract     = relationship("Contract", back_populates="addenda")
    boq_versions = relationship("BOQItemVersion", back_populates="addendum")


class Location(Base):
    __tablename__ = "locations"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id   = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    location_code = Column(String(30), unique=True, nullable=False, index=True)
    name          = Column(String(500), nullable=False)
    village       = Column(String(255))
    district      = Column(String(255))
    city          = Column(String(255))
    province      = Column(String(255))
    latitude      = Column(Numeric(10, 7))
    longitude     = Column(Numeric(10, 7))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    contract       = relationship("Contract", back_populates="locations")
    facilities     = relationship("Facility", back_populates="location", cascade="all, delete-orphan")
    daily_reports  = relationship("DailyReport", back_populates="location")
    __table_args__ = (Index("idx_location_city","city"), Index("idx_location_province","province"),)


class Facility(Base):
    __tablename__ = "facilities"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id     = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    facility_type   = Column(String(100), nullable=False)
    facility_name   = Column(String(500), nullable=False)
    display_order   = Column(Integer, default=0)
    total_value     = Column(Numeric(18, 2), default=0)
    notes           = Column(Text)
    boq_imported_at = Column(DateTime)
    boq_source_file = Column(String(500))
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    location  = relationship("Location", back_populates="facilities")
    boq_items = relationship("BOQItem", back_populates="facility", cascade="all, delete-orphan")


class BOQItem(Base):
    __tablename__ = "boq_items"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id      = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    master_work_code = Column(String(30), ForeignKey("master_work_codes.code"), nullable=True)
    original_code    = Column(String(50))
    parent_code      = Column(String(50))
    level            = Column(Integer, default=1)
    sort_order       = Column(Integer, default=0)
    description      = Column(Text, nullable=False)
    unit             = Column(String(30))
    volume           = Column(Numeric(18, 4), default=0)
    unit_price       = Column(Numeric(18, 2), default=0)
    total_price      = Column(Numeric(18, 2), default=0)
    weight_pct       = Column(Numeric(10, 8), default=0)
    planned_start_week     = Column(Integer)
    planned_duration_weeks = Column(Integer)
    planned_end_week       = Column(Integer)
    analysis_items   = Column(JSONB)
    notes            = Column(Text)
    version          = Column(Integer, default=1)
    is_active        = Column(Boolean, default=True)
    is_addendum_item = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    facility         = relationship("Facility", back_populates="boq_items")
    master_work      = relationship("MasterWorkCode", back_populates="boq_items")
    versions         = relationship("BOQItemVersion", back_populates="boq_item", order_by="BOQItemVersion.version_number")
    progress_entries = relationship("WeeklyProgressItem", back_populates="boq_item")
    __table_args__ = (Index("idx_boq_facility","facility_id"), Index("idx_boq_active","is_active"),)


class BOQItemVersion(Base):
    __tablename__ = "boq_item_versions"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boq_item_id    = Column(UUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False)
    addendum_id    = Column(UUID(as_uuid=True), ForeignKey("contract_addenda.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    old_description=Column(Text); old_volume=Column(Numeric(18,4)); old_unit_price=Column(Numeric(18,2))
    old_total_price=Column(Numeric(18,2)); old_weight_pct=Column(Numeric(10,8))
    old_planned_start_week=Column(Integer); old_planned_duration_weeks=Column(Integer); old_is_active=Column(Boolean)
    new_volume=Column(Numeric(18,4)); new_unit_price=Column(Numeric(18,2)); new_total_price=Column(Numeric(18,2))
    new_weight_pct=Column(Numeric(10,8)); new_planned_start_week=Column(Integer)
    new_planned_duration_weeks=Column(Integer); new_is_active=Column(Boolean)
    change_reason = Column(Text)
    changed_at    = Column(DateTime, default=datetime.utcnow)
    boq_item = relationship("BOQItem", back_populates="versions")
    addendum = relationship("ContractAddendum", back_populates="boq_versions")


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id  = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    week_number  = Column(Integer, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end   = Column(Date, nullable=False)
    report_date  = Column(Date)
    planned_weekly_pct     = Column(Numeric(10, 8), default=0)
    planned_cumulative_pct = Column(Numeric(10, 8), default=0)
    actual_weekly_pct      = Column(Numeric(10, 8), default=0)
    actual_cumulative_pct  = Column(Numeric(10, 8), default=0)
    deviation_pct          = Column(Numeric(10, 8), default=0)
    deviation_status       = Column(Enum(DeviationStatus), default=DeviationStatus.NORMAL)
    days_elapsed=Column(Integer, default=0); days_remaining=Column(Integer, default=0)
    spi=Column(Numeric(8, 4))
    manpower_count=Column(Integer, default=0); manpower_skilled=Column(Integer, default=0)
    manpower_unskilled=Column(Integer, default=0)
    rain_days=Column(Integer, default=0); obstacles=Column(Text); solutions=Column(Text)
    submitted_by=Column(String(255)); import_source=Column(String(50), default="manual")
    source_filename=Column(String(500)); is_locked=Column(Boolean, default=False)
    created_at=Column(DateTime, default=datetime.utcnow)
    updated_at=Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    contract       = relationship("Contract", back_populates="weekly_reports")
    progress_items = relationship("WeeklyProgressItem", back_populates="weekly_report", cascade="all, delete-orphan")
    photos         = relationship("WeeklyReportPhoto", back_populates="weekly_report", cascade="all, delete-orphan")
    __table_args__ = (Index("idx_report_contract_week","contract_id","week_number", unique=True),)


class WeeklyReportPhoto(Base):
    __tablename__ = "weekly_report_photos"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weekly_report_id = Column(UUID(as_uuid=True), ForeignKey("weekly_reports.id"), nullable=False)
    file_path        = Column(String(500), nullable=False)
    caption          = Column(String(255))
    photo_type       = Column(String(30), default="progress")  # progress|0pct|50pct|100pct
    uploaded_at      = Column(DateTime, default=datetime.utcnow)
    weekly_report = relationship("WeeklyReport", back_populates="photos")


class WeeklyProgressItem(Base):
    __tablename__ = "weekly_progress_items"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weekly_report_id = Column(UUID(as_uuid=True), ForeignKey("weekly_reports.id"), nullable=False)
    boq_item_id      = Column(UUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False)
    volume_this_week        = Column(Numeric(18, 4), default=0)
    volume_cumulative       = Column(Numeric(18, 4), default=0)
    progress_this_week_pct  = Column(Numeric(10, 8), default=0)
    progress_cumulative_pct = Column(Numeric(10, 8), default=0)
    weighted_progress_pct   = Column(Numeric(10, 8), default=0)
    notes = Column(Text)
    weekly_report = relationship("WeeklyReport", back_populates="progress_items")
    boq_item      = relationship("BOQItem", back_populates="progress_entries")
    __table_args__ = (Index("idx_progress_report_item","weekly_report_id","boq_item_id", unique=True),)


class DailyReport(Base):
    """Laporan harian konsultan — foto kegiatan + narasi, TANPA input persentase."""
    __tablename__ = "daily_reports"
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id    = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    location_id    = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    report_date    = Column(Date, nullable=False)
    description    = Column(Text, nullable=False)
    weather        = Column(String(50))
    manpower_count = Column(Integer, default=0)
    submitted_by   = Column(String(255))
    is_approved    = Column(Boolean, default=False)
    approved_by    = Column(String(255))
    approved_at    = Column(DateTime)
    created_at     = Column(DateTime, default=datetime.utcnow)
    contract = relationship("Contract")
    location = relationship("Location", back_populates="daily_reports")
    photos   = relationship("DailyReportPhoto", back_populates="daily_report", cascade="all, delete-orphan")
    __table_args__ = (Index("idx_daily_loc_date","location_id","report_date"),)


class DailyReportPhoto(Base):
    __tablename__ = "daily_report_photos"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_report_id = Column(UUID(as_uuid=True), ForeignKey("daily_reports.id"), nullable=False)
    file_path       = Column(String(500), nullable=False)
    caption         = Column(String(255))
    uploaded_at     = Column(DateTime, default=datetime.utcnow)
    daily_report = relationship("DailyReport", back_populates="photos")


class PaymentTerm(Base):
    """Sistem termin pembayaran per kontrak."""
    __tablename__ = "payment_terms"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id  = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    term_number  = Column(Integer, nullable=False)
    term_name    = Column(String(100), nullable=False)  # "Termin I", "Termin II", dst
    percentage   = Column(Numeric(6, 2), nullable=False)  # % dari nilai kontrak
    amount       = Column(Numeric(18, 2))
    status       = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    submitted_date = Column(Date)
    approved_date  = Column(Date)
    paid_date      = Column(Date)
    amount_paid    = Column(Numeric(18, 2))
    reviewer_notes = Column(Text)
    notes          = Column(Text)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    contract      = relationship("Contract", back_populates="payment_terms")


class EarlyWarning(Base):
    __tablename__ = "early_warnings"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id      = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    weekly_report_id = Column(UUID(as_uuid=True), ForeignKey("weekly_reports.id"), nullable=True)
    location_id      = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    warning_type     = Column(String(50), nullable=False)
    severity         = Column(String(20), nullable=False)
    message          = Column(Text, nullable=False)
    parameter_name   = Column(String(100))
    parameter_value  = Column(Numeric(18, 4))
    threshold_value  = Column(Numeric(18, 4))
    is_resolved      = Column(Boolean, default=False)
    resolved_at      = Column(DateTime)
    resolved_by      = Column(String(255))
    created_at       = Column(DateTime, default=datetime.utcnow)
    contract = relationship("Contract")


class NotificationConfig(Base):
    """Konfigurasi notifikasi WA Gateway — siap untuk integrasi masa depan."""
    __tablename__ = "notification_configs"
    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id        = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=True)
    recipient_name     = Column(String(255))
    whatsapp_number    = Column(String(20), nullable=False)
    trigger_type       = Column(String(50), nullable=False)
    # deviation|late_report|payment_due|critical_warning
    threshold_value    = Column(Numeric(10, 4))
    message_template   = Column(Text)
    is_active          = Column(Boolean, default=True)
    last_sent_at       = Column(DateTime)
    created_at         = Column(DateTime, default=datetime.utcnow)


class BOQImportLog(Base):
    __tablename__ = "boq_import_logs"
    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id       = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    addendum_id       = Column(UUID(as_uuid=True), ForeignKey("contract_addenda.id"), nullable=True)
    filename          = Column(String(500))
    import_type       = Column(String(20), nullable=False)
    items_created     = Column(Integer, default=0)
    items_updated     = Column(Integer, default=0)
    items_deactivated = Column(Integer, default=0)
    template_used     = Column(String(100))
    parsing_notes     = Column(Text)
    raw_column_map    = Column(JSONB)
    imported_by       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    imported_at       = Column(DateTime, default=datetime.utcnow)


class BOQExcelTemplate(Base):
    __tablename__ = "boq_excel_templates"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_name   = Column(String(100), nullable=False, unique=True)
    description     = Column(Text)
    column_mapping  = Column(JSONB, nullable=False)
    header_keywords = Column(JSONB)
    skip_keywords   = Column(JSONB)
    sample_file     = Column(String(500))
    is_active       = Column(Boolean, default=True)
    created_by      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
