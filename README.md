# MARLIN
## Monitoring, Analysis, Reporting & Learning for Infrastructure Network
### Sistem Monitoring Konstruksi Multi-Lokasi — v2.0

---

## Fitur Utama
- ✅ Dashboard monitoring multi-kontrak dengan KPI real-time
- ✅ Kurva S interaktif (Planned vs Realisasi + Deviasi + Forecast)
- ✅ Import BOQ dari Excel (adaptif untuk berbagai format)
- ✅ Import laporan mingguan dari Excel konsultan
- ✅ Input laporan manual
- ✅ Early Warning System (deviasi, SPI, rasio waktu, no-report)
- ✅ Manajemen kontrak, lokasi, fasilitas, BOQ
- ✅ Addendum / CCO dengan versioning BOQ lengkap
- ✅ Master Work Code — normalisasi BOQ lintas proyek
- ✅ BOQ Excel Templates — simpan format per kontraktor/daerah

---

## CARA MENJALANKAN

### METODE A — Local Development

**Prasyarat:** Python 3.11+, Node.js 20+, PostgreSQL 14+

```bash
# 1. Setup database PostgreSQL
psql -U postgres
  CREATE DATABASE marlin_db;
  CREATE USER knmp_user WITH PASSWORD 'knmp_secure_password';
  GRANT ALL PRIVILEGES ON DATABASE marlin_db TO knmp_user;
  \q

# 2. Setup Backend
cd backend
cp .env.example .env          # Edit jika perlu
pip install -r requirements.txt
python seed.py                # Buat tabel + isi data awal
uvicorn main:app --reload --port 8000

# 3. Setup Frontend (terminal baru)
cd frontend
npm install
npm run dev
```

- Backend  : http://localhost:8000
- API Docs : http://localhost:8000/api/docs
- Frontend : http://localhost:5173
- Login    : admin@marlin.id / Admin@123!

---

### METODE B — Docker Compose (Recommended)

```bash
# 1. Buat file .env di root project
cat > .env << 'EOF'
DB_PASSWORD=marlin_secure_2024
SECRET_KEY=ganti-dengan-random-string-32-karakter-minimum
DEBUG=false
EOF

# 2. Jalankan semua service
docker-compose up --build -d

# 3. Seed database (jalankan sekali)
docker-compose exec backend python seed.py

# 4. Cek status
docker-compose ps
```

Akses: http://localhost

---

### METODE C — Deploy Railway (Cloud)

1. Push repo ke GitHub
2. Di railway.app → New Project → Provision PostgreSQL
3. New Service → GitHub Repo → Root Dir: `backend`
   - Variables: `DATABASE_URL`, `SECRET_KEY=random32char`, `PORT=8000`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. New Service → GitHub Repo → Root Dir: `frontend`
   - Variables: `VITE_API_URL=https://[backend-url]`
   - Build: `npm install && npm run build`
   - Start: `npx serve dist -p $PORT`
5. Buka Railway terminal backend → `python seed.py`

---

## STRUKTUR DATABASE

```
companies ──< contracts >── ppk
                │
                ├──< contract_addenda
                ├──< weekly_reports >──< weekly_progress_items
                └──< locations >──< facilities >──< boq_items
                                       │                │
                                  boq_import_logs   boq_item_versions
                                                    (history addendum)

master_work_codes ──< boq_items
boq_excel_templates (template format per kontraktor)
early_warnings (warning per kontrak)
```

---

## STRUKTUR FILE

```
marlin/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── contracts.py
│   │   │   ├── reports.py
│   │   │   ├── dashboard.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── models.py
│   │   ├── schemas/
│   │   │   └── schemas.py
│   │   └── services/
│   │       ├── progress_service.py
│   │       ├── excel_service.py
│   │       └── boq_parser.py        ← BOQ Excel universal parser
│   ├── main.py
│   ├── seed.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── store/
    │   └── utils/
    ├── package.json
    ├── vite.config.js
    └── Dockerfile
```

---

## CARA PAKAI

### 1. Setup Awal (sekali)
```
Dashboard → Kontrak → Tambah Perusahaan
         → Tambah PPK
         → Tambah Kontrak
         → Tambah Lokasi
         → Tambah Fasilitas
         → Import BOQ dari Excel (atau input manual)
```

### 2. Input Laporan Mingguan
- **Import Excel** : Menu Laporan → Import Excel → upload file konsultan
- **Manual**       : Menu Laporan → Input Manual → isi form

### 3. Monitor S-Curve
Menu Kurva S → pilih kontrak → grafik planned vs aktual + deviasi + titik addendum

### 4. Catat Addendum / CCO
Detail Kontrak → Addendum → isi nomor, jenis, tanggal → sistem update otomatis

### 5. Early Warning
Menu Early Warning → warning otomatis muncul saat:
- Deviasi < -5% (Waspada) atau < -10% (Kritis)
- SPI < 0.92 (Waspada) atau < 0.85 (Kritis)
- Tidak ada laporan 2+ minggu

---

## TROUBLESHOOTING

| Error | Solusi |
|---|---|
| Cannot connect to database | Cek PostgreSQL jalan & DATABASE_URL di .env |
| Import Excel gagal | Pastikan format .xlsx, bukan .xls atau .csv |
| Token expired / 401 | Logout dan login kembali |
| Frontend tidak connect backend | Cek vite.config.js proxy → http://localhost:8000 |
| Module not found | Jalankan `pip install -r requirements.txt` ulang |