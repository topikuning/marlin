import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.models import MasterWorkCode, User, WorkCategory, UserRole, BOQExcelTemplate
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)

ALL_WORK_CODES = [
    ("PRP-BOUWPLANK",    WorkCategory.PERSIAPAN,    "Persiapan",         "Bouwplank dan Uitzet",                            "ls"),
    ("PRP-MOBILISASI",   WorkCategory.PERSIAPAN,    "Persiapan",         "Mobilisasi Peralatan dan Personil",               "ls"),
    ("PRP-PAPAN-NAMA",   WorkCategory.PERSIAPAN,    "Persiapan",         "Papan Nama Proyek",                               "bh"),
    ("PRP-DIREKSI-KIT",  WorkCategory.PERSIAPAN,    "Persiapan",         "Direksi Keet / Kantor Lapangan",                  "unit"),
    ("PRP-FOTO-DOK",     WorkCategory.PERSIAPAN,    "Persiapan",         "Dokumentasi Foto 0%-50%-100%",                    "ls"),
    ("PRP-PEMBERSIHAN",  WorkCategory.PERSIAPAN,    "Persiapan",         "Pembersihan Lahan / Land Clearing",               "m2"),
    ("STR-GAL-TANAH",    WorkCategory.STRUKTURAL,   "Galian & Urugan",   "Galian Tanah Pondasi",                            "m3"),
    ("STR-URG-SIRTU",    WorkCategory.STRUKTURAL,   "Galian & Urugan",   "Urugan Sirtu Dipadatkan",                         "m3"),
    ("STR-URG-TANAH",    WorkCategory.STRUKTURAL,   "Galian & Urugan",   "Urugan Tanah Kembali",                            "m3"),
    ("STR-URG-PASIR",    WorkCategory.STRUKTURAL,   "Galian & Urugan",   "Urugan Pasir Bawah Pondasi",                      "m3"),
    ("STR-LAN-KERJA",    WorkCategory.STRUKTURAL,   "Beton",             "Lantai Kerja Beton t=5cm",                        "m2"),
    ("STR-FDN-TELAPAK",  WorkCategory.STRUKTURAL,   "Pondasi",           "Pondasi Telapak Beton Bertulang",                 "m3"),
    ("STR-FDN-ROLAAG",   WorkCategory.STRUKTURAL,   "Pondasi",           "Pondasi Rolaag Bata / Bata Ringan",               "m2"),
    ("STR-FDN-SLOOF",    WorkCategory.STRUKTURAL,   "Pondasi",           "Sloof Beton Bertulang",                           "m3"),
    ("STR-FDN-CERUCUK",  WorkCategory.STRUKTURAL,   "Pondasi",           "Cerucuk / Tiang Pancang Kayu",                    "m1"),
    ("STR-FDN-FOOTPLAT", WorkCategory.STRUKTURAL,   "Pondasi",           "Pondasi Footplat / Plat Kaki",                    "m3"),
    ("STR-BET-KOLOM",    WorkCategory.STRUKTURAL,   "Beton",             "Kolom Beton Bertulang",                           "m3"),
    ("STR-BET-BALOK",    WorkCategory.STRUKTURAL,   "Beton",             "Balok / Ring Balok Beton Bertulang",              "m3"),
    ("STR-BET-PLAT",     WorkCategory.STRUKTURAL,   "Beton",             "Pelat Lantai Beton Bertulang",                    "m3"),
    ("STR-BET-RING",     WorkCategory.STRUKTURAL,   "Beton",             "Ring Balk Beton Bertulang",                       "m3"),
    ("ARS-DNT-BATA",     WorkCategory.ARSITEKTURAL, "Dinding",           "Pasangan Bata Merah / Bata Ringan",               "m2"),
    ("ARS-DNT-PLESTER",  WorkCategory.ARSITEKTURAL, "Dinding",           "Plesteran dan Acian",                             "m2"),
    ("ARS-DNT-KERAMIK",  WorkCategory.ARSITEKTURAL, "Dinding",           "Keramik Dinding",                                 "m2"),
    ("ARS-DNT-CAT",      WorkCategory.ARSITEKTURAL, "Dinding",           "Cat Dinding",                                     "m2"),
    ("ARS-LNT-KERAMIK",  WorkCategory.ARSITEKTURAL, "Lantai",            "Keramik Lantai",                                  "m2"),
    ("ARS-LNT-GRANIT",   WorkCategory.ARSITEKTURAL, "Lantai",            "Granit / Homogeneous Tile Lantai",                "m2"),
    ("ARS-ATP-RANGKA",   WorkCategory.ARSITEKTURAL, "Atap",              "Rangka Atap Baja Ringan / Kayu",                  "m2"),
    ("ARS-ATP-PENUTUP",  WorkCategory.ARSITEKTURAL, "Atap",              "Penutup Atap Genteng / Metal",                    "m2"),
    ("ARS-ATP-PLAFON",   WorkCategory.ARSITEKTURAL, "Atap",              "Plafon Gypsumboard / GRC",                        "m2"),
    ("ARS-KSN-PINTU",    WorkCategory.ARSITEKTURAL, "Kusen & Pintu",     "Kusen + Daun Pintu",                              "unit"),
    ("ARS-KSN-JENDELA",  WorkCategory.ARSITEKTURAL, "Kusen & Pintu",     "Kusen + Daun Jendela",                            "unit"),
    ("MEP-LST-INSTALASI",WorkCategory.MEP,          "Elektrikal",        "Instalasi Listrik (titik lampu & stop kontak)",   "titik"),
    ("MEP-LST-PANEL",    WorkCategory.MEP,          "Elektrikal",        "Panel Listrik / MCB Box",                         "unit"),
    ("MEP-AIR-PIPA",     WorkCategory.MEP,          "Plumbing",          "Instalasi Pipa Air Bersih",                       "ls"),
    ("MEP-SANI-CLOSET",  WorkCategory.MEP,          "Sanitasi",          "Kloset Jongkok / Duduk",                          "unit"),
    ("STW-PAGAR",        WorkCategory.SITE_WORK,    "Site Work",         "Pagar Kawat / BRC / Panel Beton",                 "m1"),
    ("STW-DRAINASE",     WorkCategory.SITE_WORK,    "Site Work",         "Saluran Drainase / U-Ditch",                      "m1"),
    ("STW-JALAN",        WorkCategory.SITE_WORK,    "Site Work",         "Jalan Beton / Paving Block",                      "m2"),
    ("FISH-KULINER",     WorkCategory.KHUSUS,       "Fasilitas Perikanan","Bangunan Kuliner / Kios / Lapak Nelayan",        "unit"),
    ("FISH-PABRIK-ES",   WorkCategory.KHUSUS,       "Fasilitas Perikanan","Pabrik Es / Ice Making Plant",                   "unit"),
    ("FISH-COLD-STORAGE",WorkCategory.KHUSUS,       "Fasilitas Perikanan","Cold Storage / Gudang Pendingin",                "unit"),
    ("FISH-TPI",         WorkCategory.KHUSUS,       "Fasilitas Perikanan","Tempat Pelelangan Ikan (TPI)",                   "unit"),
    ("FISH-DERMAGA",     WorkCategory.KHUSUS,       "Fasilitas Perikanan","Dermaga / Jetty / Tambatan Perahu",              "m1"),
    ("FISH-SANITASI",    WorkCategory.KHUSUS,       "Fasilitas Perikanan","MCK / Toilet / Sanitasi Nelayan",                "unit"),
    ("FISH-JALAN-LINGK", WorkCategory.KHUSUS,       "Infrastruktur",     "Jalan Lingkungan Perkerasan Beton",               "m2"),
    ("FISH-BRONJONG",    WorkCategory.KHUSUS,       "Infrastruktur",     "Bronjong / Revetment / Proteksi Pantai",          "m3"),
    ("FISH-TALUD",       WorkCategory.KHUSUS,       "Infrastruktur",     "Talud / Dinding Penahan Tanah",                   "m3"),
    ("FISH-AIR-BERSIH",  WorkCategory.KHUSUS,       "MEP Perikanan",     "Sistem Air Bersih / Sumur Bor",                   "ls"),
    ("FISH-GENSET",      WorkCategory.KHUSUS,       "MEP Perikanan",     "Genset / Generator Set",                          "unit"),
    ("FISH-MESIN-ES",    WorkCategory.KHUSUS,       "MEP Perikanan",     "Mesin Pembuat Es / Ice Flake Machine",            "unit"),
]

BOQ_TEMPLATES = [
    {"template_name": "Format Sulsel — Nisombalia/Tanete",
     "description": "Format BOQ Sulawesi Selatan. Kolom: No|Uraian|Satuan|Volume|Harga Satuan|Jumlah|Bobot%.",
     "column_mapping": {"nomor":0,"uraian":1,"satuan":3,"volume":4,"harga_satuan":5,"total_harga":6,"bobot":7,"header_row":4,"data_start_row":5},
     "header_keywords": ["uraian pekerjaan","satuan","volume","harga satuan","jumlah harga","bobot"],
     "skip_keywords": ["jumlah","total","sub total","rekapitulasi","grand total","ppn","dibulatkan"],
     "sample_file": "NISOMBALIA.xlsx"},
    {"template_name": "Format NTB — Mataram/Ampean",
     "description": "Format BOQ NTB. Ada sub-analisa harga satuan. Bobot dihitung otomatis.",
     "column_mapping": {"nomor":0,"uraian":1,"satuan":2,"volume":4,"harga_satuan":5,"total_harga":6,"bobot":None,"header_row":5,"data_start_row":6,"has_analysis_rows":True,"koefisien_col":3},
     "header_keywords": ["uraian","satuan","koef","volume","harga satuan","jumlah harga"],
     "skip_keywords": ["jumlah","total","rekapitulasi","ppn","dibulatkan","rekap"],
     "sample_file": "BOQ AMPEAN KOTA MATARAM FIX.xlsx"},
    {"template_name": "Format Laporan Mingguan",
     "description": "Template import laporan mingguan konsultan.",
     "column_mapping": {"week_number":0,"period_start":1,"period_end":2,"planned_weekly":3,"planned_cumulative":4,"actual_weekly":5,"actual_cumulative":6,"deviation":7,"header_row":8,"data_start_row":9,"template_type":"weekly_report"},
     "header_keywords": ["minggu ke","periode","rencana","realisasi","deviasi","kumulatif"],
     "skip_keywords": ["jumlah","total","rata-rata"],
     "sample_file": "LAPORAN MINGGUAN MALANG.xlsx"},
]

def seed_work_codes(db):
    added = skipped = 0
    for code, cat, sub, desc, unit in ALL_WORK_CODES:
        if not db.query(MasterWorkCode).filter(MasterWorkCode.code == code).first():
            db.add(MasterWorkCode(code=code, category=cat, sub_category=sub, description=desc, default_unit=unit))
            added += 1
        else: skipped += 1
    db.commit()
    print(f"  Master Work Codes : +{added} baru, {skipped} sudah ada")

def seed_templates(db):
    added = 0
    for t in BOQ_TEMPLATES:
        if not db.query(BOQExcelTemplate).filter(BOQExcelTemplate.template_name == t["template_name"]).first():
            db.add(BOQExcelTemplate(**t))
            added += 1
    db.commit()
    print(f"  BOQ Templates     : +{added} baru")

def seed_admin(db):
    if not db.query(User).filter(User.email == "admin@marlin.id").first():
        db.add(User(email="admin@marlin.id", full_name="MARLIN Admin",
                    hashed_password=get_password_hash("Admin@123!"), role=UserRole.SUPERADMIN))
        db.commit()
        print("  Admin user: admin@marlin.id / Admin@123!  <- GANTI SEGERA!")
    else:
        print("  Admin user sudah ada, skip")

if __name__ == "__main__":
    print("=" * 50)
    print("MARLIN v2.0 — Seed Database")
    print("=" * 50)
    db = SessionLocal()
    try:
        print("\n[1/3] Master Work Codes...")
        seed_work_codes(db)
        print("\n[2/3] BOQ Excel Templates...")
        seed_templates(db)
        print("\n[3/3] Admin User...")
        seed_admin(db)
        print("\n Seed selesai.")
    finally:
        db.close()
