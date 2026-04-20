"""
MARLIN — Seed Data
Jalankan sekali setelah database dibuat: python seed.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.models import (
    MasterWorkCode, User, WorkCategory, UserRole, BOQExcelTemplate
)
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)

# ─── MASTER WORK CODES ────────────────────────────────────────────────────────

ALL_WORK_CODES = [
    # ── PERSIAPAN ─────────────────────────────────────────────────────────────
    ("PRP-BOUWPLANK",    WorkCategory.PERSIAPAN, "Persiapan", "Bouwplank dan Uitzet",                    "ls"),
    ("PRP-MOBILISASI",   WorkCategory.PERSIAPAN, "Persiapan", "Mobilisasi Peralatan dan Personil",       "ls"),
    ("PRP-PAPAN-NAMA",   WorkCategory.PERSIAPAN, "Persiapan", "Papan Nama Proyek",                       "bh"),
    ("PRP-DIREKSI-KIT",  WorkCategory.PERSIAPAN, "Persiapan", "Direksi Keet / Kantor Lapangan",          "unit"),
    ("PRP-FOTO-DOK",     WorkCategory.PERSIAPAN, "Persiapan", "Dokumentasi Foto 0%-50%-100%",            "ls"),
    ("PRP-PEMBERSIHAN",  WorkCategory.PERSIAPAN, "Persiapan", "Pembersihan Lahan / Land Clearing",       "m²"),

    # ── STRUKTURAL: GALIAN & URUGAN ───────────────────────────────────────────
    ("STR-GAL-TANAH",    WorkCategory.STRUKTURAL, "Galian & Urugan", "Galian Tanah Pondasi",             "m³"),
    ("STR-URG-SIRTU",    WorkCategory.STRUKTURAL, "Galian & Urugan", "Urugan Sirtu Dipadatkan",          "m³"),
    ("STR-URG-TANAH",    WorkCategory.STRUKTURAL, "Galian & Urugan", "Urugan Tanah Kembali",             "m³"),
    ("STR-URG-PASIR",    WorkCategory.STRUKTURAL, "Galian & Urugan", "Urugan Pasir Bawah Pondasi",       "m³"),
    ("STR-LAN-KERJA",    WorkCategory.STRUKTURAL, "Beton",           "Lantai Kerja Beton t=5cm",         "m²"),

    # ── STRUKTURAL: PONDASI ───────────────────────────────────────────────────
    ("STR-FDN-TELAPAK",  WorkCategory.STRUKTURAL, "Pondasi", "Pondasi Telapak Beton Bertulang",          "m³"),
    ("STR-FDN-ROLAAG",   WorkCategory.STRUKTURAL, "Pondasi", "Pondasi Rolaag Bata / Bata Ringan",        "m²"),
    ("STR-FDN-SLOOF",    WorkCategory.STRUKTURAL, "Pondasi", "Sloof Beton Bertulang",                    "m³"),
    ("STR-FDN-CERUCUK",  WorkCategory.STRUKTURAL, "Pondasi", "Cerucuk / Tiang Pancang Kayu",             "m¹"),
    ("STR-FDN-FOOTPLAT", WorkCategory.STRUKTURAL, "Pondasi", "Pondasi Footplat / Plat Kaki",             "m³"),

    # ── STRUKTURAL: BETON ─────────────────────────────────────────────────────
    ("STR-BET-KOLOM",    WorkCategory.STRUKTURAL, "Beton", "Kolom Beton Bertulang",                      "m³"),
    ("STR-BET-BALOK",    WorkCategory.STRUKTURAL, "Beton", "Balok / Ring Balok Beton Bertulang",         "m³"),
    ("STR-BET-PLAT",     WorkCategory.STRUKTURAL, "Beton", "Pelat Lantai Beton Bertulang",               "m³"),
    ("STR-BET-RING",     WorkCategory.STRUKTURAL, "Beton", "Ring Balk Beton Bertulang",                  "m³"),
    ("STR-BET-TANGGA",   WorkCategory.STRUKTURAL, "Beton", "Tangga Beton Bertulang",                     "m³"),

    # ── ARSITEKTURAL: DINDING ────────────────────────────────────────────────
    ("ARS-DNT-BATA",     WorkCategory.ARSITEKTURAL, "Dinding", "Pasangan Bata Merah / Bata Ringan",      "m²"),
    ("ARS-DNT-PLESTER",  WorkCategory.ARSITEKTURAL, "Dinding", "Plesteran dan Acian",                    "m²"),
    ("ARS-DNT-KERAMIK",  WorkCategory.ARSITEKTURAL, "Dinding", "Keramik Dinding",                        "m²"),
    ("ARS-DNT-CAT",      WorkCategory.ARSITEKTURAL, "Dinding", "Cat Dinding (dalam/luar)",                "m²"),
    ("ARS-DNT-GRANIT",   WorkCategory.ARSITEKTURAL, "Dinding", "Granit / Marmer Dinding",                "m²"),

    # ── ARSITEKTURAL: LANTAI ─────────────────────────────────────────────────
    ("ARS-LNT-KERAMIK",  WorkCategory.ARSITEKTURAL, "Lantai", "Keramik Lantai",                          "m²"),
    ("ARS-LNT-GRANIT",   WorkCategory.ARSITEKTURAL, "Lantai", "Granit / Homogeneous Tile Lantai",        "m²"),
    ("ARS-LNT-SCREED",   WorkCategory.ARSITEKTURAL, "Lantai", "Screed / Rabat Beton Lantai",             "m²"),

    # ── ARSITEKTURAL: ATAP ───────────────────────────────────────────────────
    ("ARS-ATP-RANGKA",   WorkCategory.ARSITEKTURAL, "Atap", "Rangka Atap Baja Ringan / Kayu",            "m²"),
    ("ARS-ATP-PENUTUP",  WorkCategory.ARSITEKTURAL, "Atap", "Penutup Atap Genteng / Metal",              "m²"),
    ("ARS-ATP-PLAFON",   WorkCategory.ARSITEKTURAL, "Atap", "Plafon Gypsumboard / GRC",                  "m²"),
    ("ARS-ATP-TALANG",   WorkCategory.ARSITEKTURAL, "Atap", "Talang Air / Nok / Bubungan",               "m¹"),

    # ── ARSITEKTURAL: KUSEN & PINTU ──────────────────────────────────────────
    ("ARS-KSN-PINTU",    WorkCategory.ARSITEKTURAL, "Kusen & Pintu", "Kusen + Daun Pintu",               "unit"),
    ("ARS-KSN-JENDELA",  WorkCategory.ARSITEKTURAL, "Kusen & Pintu", "Kusen + Daun Jendela",             "unit"),
    ("ARS-KSN-ROLLING",  WorkCategory.ARSITEKTURAL, "Kusen & Pintu", "Rolling Door / Folding Gate",      "unit"),

    # ── MEP ──────────────────────────────────────────────────────────────────
    ("MEP-LST-INSTALASI",WorkCategory.MEP, "Elektrikal", "Instalasi Listrik (titik lampu & stop kontak)", "titik"),
    ("MEP-LST-PANEL",    WorkCategory.MEP, "Elektrikal", "Panel Listrik / MCB Box",                       "unit"),
    ("MEP-LST-LAMPU",    WorkCategory.MEP, "Elektrikal", "Lampu LED / Armatur",                           "titik"),
    ("MEP-AIR-PIPA",     WorkCategory.MEP, "Plumbing",  "Instalasi Pipa Air Bersih",                     "ls"),
    ("MEP-AIR-FITTING",  WorkCategory.MEP, "Plumbing",  "Fitting / Kran / Wastafel",                     "unit"),
    ("MEP-SANi-CLOSET",  WorkCategory.MEP, "Sanitasi",  "Kloset Jongkok / Duduk",                        "unit"),
    ("MEP-SANI-FLOOR",   WorkCategory.MEP, "Sanitasi",  "Floor Drain / Saluran Kamar Mandi",             "unit"),

    # ── SITE WORK ─────────────────────────────────────────────────────────────
    ("STW-PAGAR",        WorkCategory.SITE_WORK, "Site Work", "Pagar Kawat / BRC / Panel Beton",         "m¹"),
    ("STW-GERBANG",      WorkCategory.SITE_WORK, "Site Work", "Gerbang / Pintu Masuk",                   "unit"),
    ("STW-DRAINASE",     WorkCategory.SITE_WORK, "Site Work", "Saluran Drainase / U-Ditch",              "m¹"),
    ("STW-JALAN",        WorkCategory.SITE_WORK, "Site Work", "Jalan Beton / Paving Block",              "m²"),
    ("STW-LAMPU-TAMAN",  WorkCategory.SITE_WORK, "Site Work", "Lampu Taman / PJU",                       "unit"),
    ("STW-RTH",          WorkCategory.SITE_WORK, "Site Work", "Ruang Terbuka Hijau / Taman",             "m²"),

    # ── KHUSUS PERIKANAN ─────────────────────────────────────────────────────
    ("FISH-KULINER",      WorkCategory.KHUSUS, "Fasilitas Perikanan", "Bangunan Kuliner / Kios / Lapak Nelayan",  "unit"),
    ("FISH-PABRIK-ES",    WorkCategory.KHUSUS, "Fasilitas Perikanan", "Pabrik Es / Ice Making Plant",             "unit"),
    ("FISH-COLD-STORAGE", WorkCategory.KHUSUS, "Fasilitas Perikanan", "Cold Storage / Gudang Pendingin",          "unit"),
    ("FISH-TPI",          WorkCategory.KHUSUS, "Fasilitas Perikanan", "Tempat Pelelangan Ikan (TPI)",             "unit"),
    ("FISH-DERMAGA",      WorkCategory.KHUSUS, "Fasilitas Perikanan", "Dermaga / Jetty / Tambatan Perahu",        "m¹"),
    ("FISH-SANITASI",     WorkCategory.KHUSUS, "Fasilitas Perikanan", "MCK / Toilet / Sanitasi Nelayan",          "unit"),
    ("FISH-GUDANG-ALAT",  WorkCategory.KHUSUS, "Fasilitas Perikanan", "Gudang Peralatan / Tempat Penyimpanan",    "unit"),
    ("FISH-KANTOR",       WorkCategory.KHUSUS, "Fasilitas Perikanan", "Kantor Pengelola / Pos Jaga",              "unit"),
    ("FISH-JALAN-LINGK",  WorkCategory.KHUSUS, "Infrastruktur",       "Jalan Lingkungan Perkerasan Beton",        "m²"),
    ("FISH-BRONJONG",     WorkCategory.KHUSUS, "Infrastruktur",       "Bronjong / Revetment / Proteksi Pantai",   "m³"),
    ("FISH-TALUD",        WorkCategory.KHUSUS, "Infrastruktur",       "Talud / Dinding Penahan Tanah",            "m³"),
    ("FISH-AIR-BERSIH",   WorkCategory.KHUSUS, "MEP Perikanan",       "Sistem Air Bersih / Sumur Bor",            "ls"),
    ("FISH-IPAL",         WorkCategory.KHUSUS, "MEP Perikanan",       "IPAL / Pengolahan Air Limbah",             "unit"),
    ("FISH-GENSET",       WorkCategory.KHUSUS, "MEP Perikanan",       "Genset / Generator Set",                   "unit"),
    ("FISH-PJUTS",        WorkCategory.KHUSUS, "MEP Perikanan",       "PJU Tenaga Surya / Lampu Solar",           "unit"),
    ("FISH-MESIN-ES",     WorkCategory.KHUSUS, "MEP Perikanan",       "Mesin Pembuat Es / Ice Flake Machine",     "unit"),
    ("FISH-KOMPRESOR",    WorkCategory.KHUSUS, "MEP Perikanan",       "Kompresor / Refrigerant System",           "unit"),
    ("FISH-CERUCUK-BTN",  WorkCategory.KHUSUS, "Pondasi Pesisir",     "Cerucuk Beton / Tiang Pancang Beton",      "m¹"),
    ("FISH-URG-PASIR-L",  WorkCategory.KHUSUS, "Pondasi Pesisir",     "Urugan Pasir Laut / Reklamasi",            "m³"),
]

# ─── BOQ EXCEL TEMPLATES ──────────────────────────────────────────────────────

BOQ_TEMPLATES = [
    {
        "template_name": "Format Sulsel — Nisombalia/Tanete",
        "description": (
            "Format BOQ Sulawesi Selatan. "
            "Kolom: No | Uraian | (merge) | Satuan | Volume | Harga Satuan | Jumlah | Bobot%. "
            "Header di baris 4-6. Bobot % sudah tersedia di kolom terakhir."
        ),
        "column_mapping": {
            "nomor": 0, "uraian": 1, "satuan": 3, "volume": 4,
            "harga_satuan": 5, "total_harga": 6, "bobot": 7,
            "header_row": 4, "data_start_row": 5,
        },
        "header_keywords": ["uraian pekerjaan", "satuan", "volume", "harga satuan", "jumlah harga", "bobot"],
        "skip_keywords": ["jumlah", "total", "sub total", "rekapitulasi", "grand total", "ppn", "dibulatkan"],
        "sample_file": "NISOMBALIA.xlsx",
    },
    {
        "template_name": "Format NTB — Mataram/Ampean",
        "description": (
            "Format BOQ NTB — lebih kompleks, ada sub-analisa harga satuan. "
            "Kolom: No | Uraian | Satuan | Koef | Volume | Harga Satuan | Jumlah. "
            "Header di baris 5-8. Bobot % dihitung otomatis dari total harga."
        ),
        "column_mapping": {
            "nomor": 0, "uraian": 1, "satuan": 2, "volume": 4,
            "harga_satuan": 5, "total_harga": 6, "bobot": None,
            "header_row": 5, "data_start_row": 6,
            "has_analysis_rows": True, "koefisien_col": 3,
        },
        "header_keywords": ["uraian", "satuan", "koef", "volume", "harga satuan", "jumlah harga"],
        "skip_keywords": ["jumlah", "total", "rekapitulasi", "ppn", "dibulatkan", "rekap", "sub total"],
        "sample_file": "BOQ AMPEAN KOTA MATARAM FIX.xlsx",
    },
    {
        "template_name": "Format Laporan Mingguan",
        "description": (
            "Bukan BOQ — template untuk import laporan mingguan konsultan. "
            "Berisi tabel progress per minggu: planned vs actual kumulatif, "
            "tenaga kerja, hambatan. Dipakai di endpoint import-weekly-excel."
        ),
        "column_mapping": {
            "week_number": 0, "period_start": 1, "period_end": 2,
            "planned_weekly": 3, "planned_cumulative": 4,
            "actual_weekly": 5, "actual_cumulative": 6, "deviation": 7,
            "header_row": 8, "data_start_row": 9,
            "template_type": "weekly_report",
        },
        "header_keywords": ["minggu ke", "periode", "rencana", "realisasi", "deviasi", "kumulatif"],
        "skip_keywords": ["jumlah", "total", "rata-rata"],
        "sample_file": "LAPORAN MINGGUAN MALANG.xlsx",
    },
]


# ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

def seed_work_codes(db):
    added = skipped = 0
    for code, cat, sub, desc, unit in ALL_WORK_CODES:
        if not db.query(MasterWorkCode).filter(MasterWorkCode.code == code).first():
            db.add(MasterWorkCode(code=code, category=cat, sub_category=sub,
                                  description=desc, default_unit=unit))
            added += 1
        else:
            skipped += 1
    db.commit()
    print(f"  Master Work Codes : +{added} baru, {skipped} sudah ada")


def seed_templates(db):
    added = 0
    for t in BOQ_TEMPLATES:
        if not db.query(BOQExcelTemplate).filter(
            BOQExcelTemplate.template_name == t["template_name"]
        ).first():
            db.add(BOQExcelTemplate(
                template_name=t["template_name"],
                description=t["description"],
                column_mapping=t["column_mapping"],
                header_keywords=t["header_keywords"],
                skip_keywords=t["skip_keywords"],
                sample_file=t["sample_file"],
            ))
            added += 1
    db.commit()
    print(f"  BOQ Excel Templates: +{added} baru")


def seed_admin(db):
    if not db.query(User).filter(User.email == "admin@marlin.id").first():
        db.add(User(
            email="admin@marlin.id",
            full_name="MARLIN Admin",
            hashed_password=get_password_hash("Admin@123!"),
            role=UserRole.SUPERADMIN,
        ))
        db.commit()
        print("  Admin user: admin@marlin.id / Admin@123!  ← GANTI SEGERA!")
    else:
        print("  Admin user sudah ada, skip")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("MARLIN v2.0 — Seed Database")
    print("=" * 55)

    db = SessionLocal()
    try:
        print("\n[1/3] Master Work Codes...")
        seed_work_codes(db)

        print("\n[2/3] BOQ Excel Templates...")
        seed_templates(db)

        print("\n[3/3] Admin User...")
        seed_admin(db)

        print("\n✅  Seed selesai. Jalankan aplikasi dengan:")
        print("    uvicorn main:app --reload --port 8000")
        print("=" * 55)
    finally:
        db.close()