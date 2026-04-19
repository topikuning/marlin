"""
Seed data: Master Work Codes + Admin user pertama
Jalankan: python seed.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.models import MasterWorkCode, User, WorkCategory, UserRole
from app.core.security import get_password_hash

Base.metadata.create_all(bind=engine)

MASTER_WORK_CODES = [
    # ── PERSIAPAN ───────────────────────────────────────────────────────────
    ("PRP-BOUWPLANK",   WorkCategory.PERSIAPAN, "Persiapan",   "Bouwplank dan Uitzet",              "ls"),
    ("PRP-MOBILISASI",  WorkCategory.PERSIAPAN, "Persiapan",   "Mobilisasi Peralatan dan Personil", "ls"),
    ("PRP-PAPAN-NAMA",  WorkCategory.PERSIAPAN, "Persiapan",   "Papan Nama Proyek",                 "bh"),
    ("PRP-DIREKSI-KIT", WorkCategory.PERSIAPAN, "Persiapan",   "Direksi Keet / Kantor Lapangan",    "unit"),
    ("PRP-FOTO-DOK",    WorkCategory.PERSIAPAN, "Persiapan",   "Dokumentasi Foto 0%-50%-100%",      "ls"),

    # ── STRUKTURAL: GALIAN & URUGAN ──────────────────────────────────────────
    ("STR-GAL-TANAH",   WorkCategory.STRUKTURAL, "Galian & Urugan", "Galian Tanah Pondasi",          "m³"),
    ("STR-URG-SIRTU",   WorkCategory.STRUKTURAL, "Galian & Urugan", "Urugan Sirtu Dipadatkan",       "m³"),
    ("STR-URG-TANAH",   WorkCategory.STRUKTURAL, "Galian & Urugan", "Urugan Tanah Kembali",          "m³"),
    ("STR-LAN-KERJA",   WorkCategory.STRUKTURAL, "Beton",      "Lantai Kerja Beton t=5cm",          "m²"),

    # ── STRUKTURAL: PONDASI ──────────────────────────────────────────────────
    ("STR-FDN-TELAPAK", WorkCategory.STRUKTURAL, "Pondasi",    "Pondasi Telapak Beton Bertulang",   "m³"),
    ("STR-FDN-ROLAAG",  WorkCategory.STRUKTURAL, "Pondasi",    "Pondasi Rolaag Bata / Bata Ringan", "m²"),
    ("STR-FDN-SLOOF",   WorkCategory.STRUKTURAL, "Pondasi",    "Sloof Beton Bertulang",              "m³"),
    ("STR-FDN-CERUCUK", WorkCategory.STRUKTURAL, "Pondasi",    "Cerucuk / Tiang Pancang Kayu",      "m¹"),

    # ── STRUKTURAL: BETON ────────────────────────────────────────────────────
    ("STR-BET-KOLOM",   WorkCategory.STRUKTURAL, "Beton",      "Kolom Beton Bertulang",             "m³"),
    ("STR-BET-BALOK",   WorkCategory.STRUKTURAL, "Beton",      "Balok / Ring Balok Beton Bertulang","m³"),
    ("STR-BET-PLAT",    WorkCategory.STRUKTURAL, "Beton",      "Plat Lantai Beton Bertulang",       "m³"),
    ("STR-BET-DINDING", WorkCategory.STRUKTURAL, "Beton",      "Dinding Beton / Shear Wall",        "m³"),
    ("STR-BET-TANGGA",  WorkCategory.STRUKTURAL, "Beton",      "Tangga Beton Bertulang",            "m³"),

    # ── STRUKTURAL: BESI ─────────────────────────────────────────────────────
    ("STR-BESI-D6",     WorkCategory.STRUKTURAL, "Pembesian",  "Besi Beton Polos / Sengkang Ø6",   "kg"),
    ("STR-BESI-D8",     WorkCategory.STRUKTURAL, "Pembesian",  "Besi Beton Polos Ø8",              "kg"),
    ("STR-BESI-D10",    WorkCategory.STRUKTURAL, "Pembesian",  "Besi Beton Deform D10",            "kg"),
    ("STR-BESI-D12",    WorkCategory.STRUKTURAL, "Pembesian",  "Besi Beton Deform D12",            "kg"),
    ("STR-BESI-D16",    WorkCategory.STRUKTURAL, "Pembesian",  "Besi Beton Deform D16",            "kg"),

    # ── STRUKTURAL: BEKISTING ────────────────────────────────────────────────
    ("STR-BEK-UMUM",    WorkCategory.STRUKTURAL, "Bekisting",  "Bekisting Kayu (Umum)",            "m²"),
    ("STR-BEK-KOLOM",   WorkCategory.STRUKTURAL, "Bekisting",  "Bekisting Kolom",                  "m²"),
    ("STR-BEK-BALOK",   WorkCategory.STRUKTURAL, "Bekisting",  "Bekisting Balok",                  "m²"),
    ("STR-BEK-PLAT",    WorkCategory.STRUKTURAL, "Bekisting",  "Bekisting Plat Lantai",            "m²"),

    # ── STRUKTURAL: ATAP ─────────────────────────────────────────────────────
    ("STR-ATAP-BAJARING",WorkCategory.STRUKTURAL,"Atap",       "Rangka Atap Baja Ringan",          "m²"),
    ("STR-ATAP-METAL",  WorkCategory.STRUKTURAL, "Atap",       "Penutup Atap Metal / Spandek",     "m²"),
    ("STR-ATAP-GENTENG",WorkCategory.STRUKTURAL, "Atap",       "Penutup Atap Genteng Beton",       "m²"),
    ("STR-LISPLANK-GRC",WorkCategory.STRUKTURAL, "Atap",       "Lisplank GRC / Kayu",              "m¹"),

    # ── ARSITEKTURAL ─────────────────────────────────────────────────────────
    ("ARS-DIND-BATARINGAN",WorkCategory.ARSITEKTURAL,"Dinding","Pasangan Dinding Bata Ringan / AAC","m²"),
    ("ARS-DIND-BATA",   WorkCategory.ARSITEKTURAL,"Dinding",   "Pasangan Dinding Bata Merah",      "m²"),
    ("ARS-PLESTER",     WorkCategory.ARSITEKTURAL,"Dinding",   "Plesteran 1:4",                    "m²"),
    ("ARS-ACIAN",       WorkCategory.ARSITEKTURAL,"Dinding",   "Acian / Aci Halus",                "m²"),
    ("ARS-ACIAN-BETON", WorkCategory.ARSITEKTURAL,"Dinding",   "Acian Permukaan Beton Exposed",    "m²"),
    ("ARS-BATU-ALAM",   WorkCategory.ARSITEKTURAL,"Dinding",   "Pasangan Batu Alam / Palimanan",   "m²"),
    ("ARS-CAT-DINDING", WorkCategory.ARSITEKTURAL,"Finishing", "Cat Dinding Interior / Eksterior",  "m²"),
    ("ARS-CAT-PLAFOND", WorkCategory.ARSITEKTURAL,"Finishing", "Cat Plafond",                      "m²"),

    # ── ARSITEKTURAL: LANTAI ─────────────────────────────────────────────────
    ("ARS-LAN-KERAMIK60",WorkCategory.ARSITEKTURAL,"Lantai",   "Pasang Keramik 60x60 cm",          "m²"),
    ("ARS-LAN-KERAMIK40",WorkCategory.ARSITEKTURAL,"Lantai",   "Pasang Keramik 40x40 cm",          "m²"),
    ("ARS-LAN-GRANIT",  WorkCategory.ARSITEKTURAL,"Lantai",    "Pasang Granit / Homogeneous Tile",  "m²"),
    ("ARS-LAN-RABAT",   WorkCategory.ARSITEKTURAL,"Lantai",    "Lantai Rabat Beton",               "m²"),
    ("ARS-LAN-GRASS",   WorkCategory.ARSITEKTURAL,"Lantai",    "Penanaman Rumput",                 "m²"),

    # ── ARSITEKTURAL: PLAFOND ────────────────────────────────────────────────
    ("ARS-PLAFOND-GYPS",WorkCategory.ARSITEKTURAL,"Plafond",   "Plafond Gypsum Rangka Besi Hollow","m²"),
    ("ARS-PLAFOND-GRC", WorkCategory.ARSITEKTURAL,"Plafond",   "Plafond GRC / Kalsiboard",         "m²"),
    ("ARS-LIST-PLAFOND",WorkCategory.ARSITEKTURAL,"Plafond",   "List Plafond / Shadow Line",       "m¹"),

    # ── ARSITEKTURAL: PINTU & JENDELA ────────────────────────────────────────
    ("ARS-PINTU-BESI",  WorkCategory.ARSITEKTURAL,"Pintu & Jendela","Pintu Besi / Rolling Door",   "unit"),
    ("ARS-PINTU-KAYU",  WorkCategory.ARSITEKTURAL,"Pintu & Jendela","Pintu Kayu Panel",             "unit"),
    ("ARS-JENDELA-ALUM",WorkCategory.ARSITEKTURAL,"Pintu & Jendela","Jendela Aluminium + Kaca",    "m²"),
    ("ARS-PAGAR-BRC",   WorkCategory.ARSITEKTURAL,"Pagar",     "Pagar BRC Hot Dip Galvanis",       "m²"),

    # ── MEP: LISTRIK ─────────────────────────────────────────────────────────
    ("MEP-INST-LISTRIK", WorkCategory.MEP, "Elektrikal",        "Instalasi Titik Lampu",            "ttk"),
    ("MEP-LAMPU-LED",    WorkCategory.MEP, "Elektrikal",        "Pasang Lampu LED / TL",            "bh"),
    ("MEP-PANEL-LISTRIK",WorkCategory.MEP, "Elektrikal",        "Panel Listrik / MCB Box",          "unit"),
    ("MEP-PENERANGAN",   WorkCategory.MEP, "Elektrikal",        "PJU / Penerangan Kawasan",         "ttk"),

    # ── MEP: PLUMBING ────────────────────────────────────────────────────────
    ("MEP-INST-AIR-BRS",WorkCategory.MEP, "Plumbing",           "Instalasi Air Bersih",             "ttk"),
    ("MEP-INST-AIR-KTR",WorkCategory.MEP, "Plumbing",           "Instalasi Air Kotor / Drainase",   "m¹"),
    ("MEP-TANGKI-AIR",  WorkCategory.MEP, "Plumbing",           "Tangki Air / Torn",               "unit"),
    ("MEP-IPAL",        WorkCategory.MEP, "Plumbing",           "IPAL Biotech / Sewage Treatment",  "unit"),
    ("MEP-SEPTICTANK",  WorkCategory.MEP, "Plumbing",           "Septic Tank",                      "unit"),

    # ── SITE WORK ────────────────────────────────────────────────────────────
    ("SITE-LEVELLING",  WorkCategory.SITE_WORK, "Site Work",    "Pekerjaan Levelling / Cut & Fill", "m³"),
    ("SITE-JALAN-BETON",WorkCategory.SITE_WORK, "Jalan",        "Perkerasan Jalan Beton",           "m²"),
    ("SITE-JALAN-PAVING",WorkCategory.SITE_WORK,"Jalan",        "Perkerasan Paving Block",          "m²"),
    ("SITE-SALURAN",    WorkCategory.SITE_WORK, "Drainase",     "Saluran Drainase / U-Ditch",       "m¹"),
    ("SITE-TUTUP-SALU", WorkCategory.SITE_WORK, "Drainase",     "Penutup Saluran U-Ditch",          "m¹"),
    ("SITE-TANGGUL",    WorkCategory.SITE_WORK, "Tanggul",      "Tanggul / Turap Beton",            "m¹"),
    ("SITE-PARKIR",     WorkCategory.SITE_WORK, "Site Work",    "Area Parkir",                      "m²"),
    ("SITE-TAMAN",      WorkCategory.SITE_WORK, "Site Work",    "Taman / Landscape",                "m²"),
    ("SITE-SAMPAH",     WorkCategory.SITE_WORK, "Site Work",    "Tempat Pembuangan Sampah",         "unit"),

    # ── KHUSUS PERIKANAN ─────────────────────────────────────────────────────
    ("KHS-BRONJONG",    WorkCategory.KHUSUS, "Perikanan",        "Bronjong Kawat Galvanis",         "m³"),
    ("KHS-REVETMENT",   WorkCategory.KHUSUS, "Perikanan",        "Revetment / Talud Batu Kosong",   "m³"),
    ("KHS-DERMAGA",     WorkCategory.KHUSUS, "Perikanan",        "Dermaga / Tambatan Perahu",       "m¹"),
    ("KHS-TANGGA-PEND", WorkCategory.KHUSUS, "Perikanan",        "Tangga Pendaratan Ikan",          "unit"),
    ("KHS-DOCKING",     WorkCategory.KHUSUS, "Perikanan",        "Docking Kapal",                   "unit"),
    ("KHS-PENGERUKAN",  WorkCategory.KHUSUS, "Perikanan",        "Pengerukan Tanah Muara Sungai",   "m³"),
    ("KHS-GUDANG-BEKU", WorkCategory.KHUSUS, "Perikanan",        "Pondasi / Struktur Gudang Beku",  "unit"),
    ("KHS-PABRIK-ES",   WorkCategory.KHUSUS, "Perikanan",        "Pondasi / Struktur Pabrik Es",    "unit"),
    ("KHS-COLD-STORAGE",WorkCategory.KHUSUS, "Perikanan",        "Cold Storage / Shelter Coldbox",  "unit"),
    ("KHS-SPDN",        WorkCategory.KHUSUS, "Perikanan",        "SPDN (Solar Packed Dealer Nelayan)","unit"),
    ("KHS-DPT-KAWASAN", WorkCategory.KHUSUS, "Perikanan",        "Dinding Penahan Tanah Kawasan",   "m³"),
    ("KHS-SHELTER-IKAN",WorkCategory.KHUSUS, "Perikanan",        "Shelter Pendaratan / Bongkar Ikan","unit"),
    ("KHS-PAGAR-KWS",   WorkCategory.KHUSUS, "Perikanan",        "Pagar Kawasan",                   "m¹"),
    ("KHS-GERBANG",     WorkCategory.KHUSUS, "Perikanan",        "Gerbang / Gapura",                "unit"),
    ("KHS-SIGNAGE",     WorkCategory.KHUSUS, "Perikanan",        "Signage / Logo / Huruf Timbul",   "unit"),
]


def seed():
    db = SessionLocal()
    try:
        # ── Master Work Codes ──────────────────────────────────────────────
        count_mwc = 0
        for code, category, sub_cat, desc, unit in MASTER_WORK_CODES:
            existing = db.query(MasterWorkCode).filter(MasterWorkCode.code == code).first()
            if not existing:
                db.add(MasterWorkCode(
                    code=code, category=category, sub_category=sub_cat,
                    description=desc, default_unit=unit
                ))
                count_mwc += 1

        # ── Admin user ────────────────────────────────────────────────────
        admin_email = "admin@knmp.id"
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            db.add(User(
                email=admin_email,
                full_name="Administrator KNMP",
                hashed_password=get_password_hash("Admin@123!"),
                role=UserRole.SUPERADMIN,
            ))
            print(f"✓ Admin user dibuat: {admin_email} / Admin@123!")
        else:
            print(f"→ Admin user sudah ada: {admin_email}")

        db.commit()
        print(f"✓ {count_mwc} master work codes ditambahkan")
        print("✓ Seed selesai!")

    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
