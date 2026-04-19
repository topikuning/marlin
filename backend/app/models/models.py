import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Integer, Numeric, Boolean,
    DateTime, Date, ForeignKey, Enum, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ─── ENUMS ────────────────────────────────────────────────────────────────────

class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ADDENDUM = "addendum"
    COMPLETED = "completed"
    TERMINATED = "terminated"


class AddendumType(str, enum.Enum):
    CCO = "cco"                  # Contract Change Order — perubahan item/volume
    EXTENSION = "extension"      # Perpanjangan waktu
    VALUE_CHANGE = "value_change"  # Perubahan nilai kontrak
    COMBINED = "combined"        # Gabungan


class DeviationStatus(str, enum.Enum):
    FAST = "fast"        # > +5%
    NORMAL = "normal"    # -5% s/d +5%
    WARNING = "warning"  # -5% s/d -10%
    CRITICAL = "critical"  # < -10%


class UserRole(str, enum.Enum):
    SUPERADMIN = "superadmin"
    PPK = "ppk"
    MANAGER = "manager"
    KONSULTAN = "konsultan"
    VIEWER = "viewer"


class WorkCategory(str, enum.Enum):
    PERSIAPAN = "persiapan"
    STRUKTURAL = "struktural"
    ARSITEKTURAL = "arsitektural"
    MEP = "mep"          # Mechanical, Electrical, Plumbing
    SITE_WORK = "site_work"
    KHUSUS = "khusus"    # Item spesifik perikanan (bronjong, revetment, dll)


# ─── USER ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─── MASTER WORK CODE (Normalisasi BOQ) ───────────────────────────────────────

class MasterWorkCode(Base):
    """
    Kode standar pekerjaan lintas semua proyek.
    Kunci normalisasi BOQ yang berbeda-beda antar lokasi.
    Contoh: STR-FDN-TELAPAK bisa mapping ke "Pondasi Telapak P1",
    "Pondasi Footplat 80x80", "Fondasi Beton 1m2", dll.
    """
    __tablename__ = "master_work_codes"

    code = Column(String(30), primary_key=True)
    category = Column(Enum(WorkCategory), nullable=False)
    sub_category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    default_unit = Column(String(20))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    boq_items = relationship("BOQItem", back_populates="master_work")


# ─── COMPANY ──────────────────────────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    npwp = Column(String(30), unique=True)
    address = Column(Text)
    contact_person = Column(String(255))
    phone = Column(String(20))
    email = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contracts = relationship("Contract", back_populates="company")


# ─── PPK ──────────────────────────────────────────────────────────────────────

class PPK(Base):
    __tablename__ = "ppk"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    nip = Column(String(30), unique=True)
    jabatan = Column(String(255))
    phone = Column(String(20))
    email = Column(String(255))
    satker = Column(String(255))  # Satuan Kerja
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contracts = relationship("Contract", back_populates="ppk")


# ─── CONTRACT ─────────────────────────────────────────────────────────────────

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    ppk_id = Column(UUID(as_uuid=True), ForeignKey("ppk.id"), nullable=False)
    contract_number = Column(String(100), unique=True, nullable=False, index=True)
    contract_name = Column(String(500), nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    duration_days = Column(Integer, nullable=False)
    original_value = Column(Numeric(18, 2), nullable=False)
    current_value = Column(Numeric(18, 2), nullable=False)  # Diupdate saat addendum
    status = Column(Enum(ContractStatus), default=ContractStatus.ACTIVE)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="contracts")
    ppk = relationship("PPK", back_populates="contracts")
    locations = relationship("Location", back_populates="contract", cascade="all, delete-orphan")
    addenda = relationship("ContractAddendum", back_populates="contract", order_by="ContractAddendum.effective_date")
    weekly_reports = relationship("WeeklyReport", back_populates="contract")


# ─── CONTRACT ADDENDUM ────────────────────────────────────────────────────────

class ContractAddendum(Base):
    __tablename__ = "contract_addenda"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    addendum_number = Column(String(100), nullable=False)
    addendum_type = Column(Enum(AddendumType), nullable=False)
    effective_date = Column(Date, nullable=False)
    extension_days = Column(Integer, default=0)
    new_end_date = Column(Date)
    old_contract_value = Column(Numeric(18, 2))
    new_contract_value = Column(Numeric(18, 2))
    description = Column(Text)
    document_file = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="addenda")
    boq_versions = relationship("BOQItemVersion", back_populates="addendum")


# ─── LOCATION ─────────────────────────────────────────────────────────────────

class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    location_code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    village = Column(String(255))
    district = Column(String(255))
    city = Column(String(255))
    province = Column(String(255))
    latitude = Column(Numeric(10, 7))
    longitude = Column(Numeric(10, 7))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="locations")
    facilities = relationship("Facility", back_populates="location", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_location_city", "city"),
        Index("idx_location_province", "province"),
    )


# ─── FACILITY ─────────────────────────────────────────────────────────────────

class Facility(Base):
    """
    Satu lokasi bisa punya banyak fasilitas: gudang beku, pabrik es, kios, dst.
    Setiap fasilitas punya BOQ-nya sendiri.
    """
    __tablename__ = "facilities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    facility_type = Column(String(100), nullable=False)  # "gudang_beku", "pabrik_es", dll
    facility_name = Column(String(500), nullable=False)
    display_order = Column(Integer, default=0)
    total_value = Column(Numeric(18, 2), default=0)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="facilities")
    boq_items = relationship("BOQItem", back_populates="facility", cascade="all, delete-orphan")


# ─── BOQ ITEM ─────────────────────────────────────────────────────────────────

class BOQItem(Base):
    """
    Item pekerjaan dalam BOQ. Dirancang fleksibel untuk berbagai format BOQ.
    master_work_code = normalisasi ke standar, original_code = kode asli di dokumen.
    """
    __tablename__ = "boq_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    master_work_code = Column(String(30), ForeignKey("master_work_codes.code"), nullable=True)

    # Data asli dari dokumen BOQ
    original_code = Column(String(50))       # Nomor item asli: "1", "2.1", "III.A.1", dll
    parent_code = Column(String(50))          # Untuk hierarki item (subtotal, group)
    level = Column(Integer, default=0)        # 0=group, 1=item, 2=subitem
    description = Column(Text, nullable=False)
    unit = Column(String(30))                 # m³, m², kg, unit, ls, dll
    volume = Column(Numeric(18, 4), default=0)
    unit_price = Column(Numeric(18, 2), default=0)
    total_price = Column(Numeric(18, 2), default=0)
    weight_pct = Column(Numeric(10, 8), default=0)  # Bobot % dalam desimal (0.0367 = 3.67%)

    # Jadwal rencana
    planned_start_week = Column(Integer)
    planned_duration_weeks = Column(Integer)
    planned_end_week = Column(Integer)

    # Versioning untuk addendum
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)  # False jika dihapus via addendum
    is_addendum_item = Column(Boolean, default=False)  # True jika item baru dari addendum

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    facility = relationship("Facility", back_populates="boq_items")
    master_work = relationship("MasterWorkCode", back_populates="boq_items")
    versions = relationship("BOQItemVersion", back_populates="boq_item", order_by="BOQItemVersion.version_number")
    progress_entries = relationship("WeeklyProgressItem", back_populates="boq_item")

    __table_args__ = (
        Index("idx_boq_facility", "facility_id"),
        Index("idx_boq_master_code", "master_work_code"),
        Index("idx_boq_active", "is_active"),
    )


# ─── BOQ ITEM VERSION (Addendum History) ──────────────────────────────────────

class BOQItemVersion(Base):
    """
    Menyimpan riwayat perubahan BOQ akibat addendum.
    Histori tidak pernah dihapus.
    """
    __tablename__ = "boq_item_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    boq_item_id = Column(UUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False)
    addendum_id = Column(UUID(as_uuid=True), ForeignKey("contract_addenda.id"), nullable=False)
    version_number = Column(Integer, nullable=False)

    # Snapshot nilai sebelum perubahan
    old_description = Column(Text)
    old_volume = Column(Numeric(18, 4))
    old_unit_price = Column(Numeric(18, 2))
    old_total_price = Column(Numeric(18, 2))
    old_weight_pct = Column(Numeric(10, 8))
    old_planned_start_week = Column(Integer)
    old_planned_duration_weeks = Column(Integer)
    old_is_active = Column(Boolean)

    # Nilai baru
    new_volume = Column(Numeric(18, 4))
    new_unit_price = Column(Numeric(18, 2))
    new_total_price = Column(Numeric(18, 2))
    new_weight_pct = Column(Numeric(10, 8))
    new_planned_start_week = Column(Integer)
    new_planned_duration_weeks = Column(Integer)
    new_is_active = Column(Boolean)

    change_reason = Column(Text)
    changed_at = Column(DateTime, default=datetime.utcnow)

    boq_item = relationship("BOQItem", back_populates="versions")
    addendum = relationship("ContractAddendum", back_populates="boq_versions")


# ─── WEEKLY REPORT ────────────────────────────────────────────────────────────

class WeeklyReport(Base):
    """
    Laporan mingguan per kontrak. Bisa diisi manual atau di-import dari Excel.
    """
    __tablename__ = "weekly_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    report_date = Column(Date)

    # Progress header (dihitung dari item detail ATAU diisi manual)
    planned_weekly_pct = Column(Numeric(10, 8), default=0)
    planned_cumulative_pct = Column(Numeric(10, 8), default=0)
    actual_weekly_pct = Column(Numeric(10, 8), default=0)
    actual_cumulative_pct = Column(Numeric(10, 8), default=0)
    deviation_pct = Column(Numeric(10, 8), default=0)
    deviation_status = Column(Enum(DeviationStatus), default=DeviationStatus.NORMAL)

    # Waktu
    days_elapsed = Column(Integer, default=0)
    days_remaining = Column(Integer, default=0)
    spi = Column(Numeric(8, 4))  # Schedule Performance Index

    # Tenaga kerja
    manpower_count = Column(Integer, default=0)
    manpower_skilled = Column(Integer, default=0)
    manpower_unskilled = Column(Integer, default=0)

    # Cuaca & hambatan
    rain_days = Column(Integer, default=0)
    obstacles = Column(Text)
    solutions = Column(Text)

    # Metadata
    submitted_by = Column(String(255))
    import_source = Column(String(50))  # "manual", "excel_import", "api"
    source_filename = Column(String(500))
    is_locked = Column(Boolean, default=False)  # True = sudah dikunci, tidak bisa diubah
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contract = relationship("Contract", back_populates="weekly_reports")
    progress_items = relationship("WeeklyProgressItem", back_populates="weekly_report",
                                  cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_report_contract_week", "contract_id", "week_number", unique=True),
    )


# ─── WEEKLY PROGRESS ITEM ─────────────────────────────────────────────────────

class WeeklyProgressItem(Base):
    """
    Progress aktual per item BOQ dalam satu minggu.
    Granularity tertinggi — dari sini semua agregasi dihitung.
    """
    __tablename__ = "weekly_progress_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    weekly_report_id = Column(UUID(as_uuid=True), ForeignKey("weekly_reports.id"), nullable=False)
    boq_item_id = Column(UUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False)

    volume_this_week = Column(Numeric(18, 4), default=0)
    volume_cumulative = Column(Numeric(18, 4), default=0)
    progress_this_week_pct = Column(Numeric(10, 8), default=0)
    progress_cumulative_pct = Column(Numeric(10, 8), default=0)
    weighted_progress_pct = Column(Numeric(10, 8), default=0)  # progress × bobot item
    notes = Column(Text)

    weekly_report = relationship("WeeklyReport", back_populates="progress_items")
    boq_item = relationship("BOQItem", back_populates="progress_entries")

    __table_args__ = (
        Index("idx_progress_report_item", "weekly_report_id", "boq_item_id", unique=True),
    )


# ─── EARLY WARNING LOG ────────────────────────────────────────────────────────

class EarlyWarning(Base):
    __tablename__ = "early_warnings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    weekly_report_id = Column(UUID(as_uuid=True), ForeignKey("weekly_reports.id"))
    warning_type = Column(String(50), nullable=False)  # "deviation", "spi", "no_report", "item_stuck"
    severity = Column(String(20), nullable=False)      # "info", "warning", "critical"
    message = Column(Text, nullable=False)
    parameter_name = Column(String(100))
    parameter_value = Column(Numeric(18, 4))
    threshold_value = Column(Numeric(18, 4))
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
