"""
MARLIN v3.0 — Database Migration
Tambah kolom dan tabel baru tanpa hapus data existing.

Jalankan:
    docker compose exec backend python migrate_v3.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine, Base

# Import semua model agar Base.metadata tahu tabel baru
from app.models.models import (  # noqa
    User, Company, PPK, Contract, ContractAddendum,
    Location, Facility, BOQItem, BOQItemVersion,
    WeeklyReport, WeeklyReportPhoto, WeeklyProgressItem,
    DailyReport, DailyReportPhoto,
    PaymentTerm, PaymentStatus,
    EarlyWarning, NotificationConfig,
    MasterWorkCode, BOQImportLog, BOQExcelTemplate,
)


def col_exists(conn, table, column):
    r = conn.execute(text("""
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = :t AND column_name = :c
    """), {"t": table, "c": column})
    return r.scalar() > 0


def table_exists(conn, table):
    r = conn.execute(text("""
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = :t
    """), {"t": table})
    return r.scalar() > 0


def add_col(conn, table, column, col_type):
    if not col_exists(conn, table, column):
        conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}'))
        print(f"  + {table}.{column}")
    else:
        print(f"  ~ {table}.{column} sudah ada")


def run():
    print("=" * 55)
    print("MARLIN v3.0 — Database Migration")
    print("=" * 55)

    with engine.connect() as conn:

        # ── 1. users: tambah whatsapp_number ──────────────────────────
        print("\n[1] Tabel users...")
        add_col(conn, "users", "whatsapp_number", "VARCHAR(20)")

        # ── 2. contracts: tambah province, city, original_duration ─────
        print("\n[2] Tabel contracts...")
        add_col(conn, "contracts", "province",               "VARCHAR(100)")
        add_col(conn, "contracts", "city",                   "VARCHAR(100)")
        add_col(conn, "contracts", "original_duration_days", "INTEGER")

        # ── 3. facilities: tambah boq_imported_at, boq_source_file ─────
        print("\n[3] Tabel facilities...")
        add_col(conn, "facilities", "boq_imported_at", "TIMESTAMP")
        add_col(conn, "facilities", "boq_source_file", "VARCHAR(500)")

        # ── 4. boq_items: tambah sort_order, notes, analysis_items ─────
        print("\n[4] Tabel boq_items...")
        add_col(conn, "boq_items", "sort_order",      "INTEGER DEFAULT 0")
        add_col(conn, "boq_items", "notes",           "TEXT")
        add_col(conn, "boq_items", "analysis_items",  "JSONB")

        # ── 5. early_warnings: tambah location_id, facility_id ─────────
        print("\n[5] Tabel early_warnings...")
        add_col(conn, "early_warnings", "location_id",
                "UUID REFERENCES locations(id)")
        add_col(conn, "early_warnings", "facility_id",
                "UUID REFERENCES facilities(id)")

        conn.commit()

    # ── 6. Buat tabel BARU (checkfirst=True = aman jika sudah ada) ─────
    print("\n[6] Membuat tabel baru...")
    new_tables = [
        "weekly_report_photos",
        "daily_reports",
        "daily_report_photos",
        "payment_terms",
        "notification_configs",
        "boq_import_logs",
        "boq_excel_templates",
    ]
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Base.metadata.tables[t]
            for t in new_tables
            if t in Base.metadata.tables
        ],
        checkfirst=True,
    )
    for t in new_tables:
        print(f"  ✓ {t}")

    print("\n" + "=" * 55)
    print("✅ Migration selesai.")
    print("   Lanjutkan: docker compose exec backend python seed.py")
    print("=" * 55)


if __name__ == "__main__":
    run()