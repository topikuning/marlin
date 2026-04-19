# KNMP Monitor — Sistem Monitoring Konstruksi Multi-Lokasi

Aplikasi web untuk monitoring progress konstruksi 200+ lokasi proyek Kampung Nelayan Merah Putih.

## Fitur Utama
- ✅ Dashboard monitoring multi-kontrak dengan KPI real-time
- ✅ Kurva S interaktif (Planned vs Realisasi + Deviasi)
- ✅ Import laporan mingguan dari file Excel konsultan
- ✅ Input laporan manual
- ✅ Early Warning System (deviasi, SPI, rasio waktu)
- ✅ Manajemen kontrak, lokasi, fasilitas, BOQ
- ✅ Dukungan addendum / CCO dengan versioning BOQ
- ✅ Master Work Code untuk normalisasi BOQ lintas proyek

---

## CARA MENJALANKAN (3 Metode)

---

### METODE A — Local Development (Paling Mudah, untuk Testing)

**Prasyarat:** Python 3.11+, Node.js 20+, PostgreSQL 14+

**Langkah 1 — Setup database PostgreSQL**
```bash
# Buka psql sebagai superuser
psql -U postgres

# Di dalam psql, jalankan:
CREATE DATABASE knmp_monitor;
CREATE USER knmp_user WITH PASSWORD 'knmp_secure_password';
GRANT ALL PRIVILEGES ON DATABASE knmp_monitor TO knmp_user;
\q
```

**Langkah 2 — Setup Backend**
```bash
cd backend

# Buat file .env
cp .env.example .env
# Edit .env: sesuaikan DATABASE_URL jika berbeda

# Install dependencies
pip install -r requirements.txt

# Buat semua tabel + isi data awal
python seed.py

# Jalankan server
uvicorn main:app --reload --port 8000
```

Backend berjalan di: http://localhost:8000
API docs: http://localhost:8000/api/docs

**Langkah 3 — Setup Frontend**
```bash
# Buka terminal baru
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Frontend berjalan di: http://localhost:5173

**Login pertama:**
- Email: `admin@knmp.id`
- Password: `Admin@123!`

---

### METODE B — Docker Compose (Recommended untuk Team)

**Prasyarat:** Docker Desktop terinstall

```bash
# 1. Clone / copy project ke folder lokal
cd knmp-monitor

# 2. Buat file .env di root
cat > .env << 'EOF'
DB_PASSWORD=knmp_secure_password_2024
SECRET_KEY=ganti-dengan-random-string-32-karakter-minimum
DEBUG=false
EOF

# 3. Jalankan semua service
docker-compose up --build -d

# 4. Seed database (jalankan sekali)
docker-compose exec backend python seed.py

# 5. Cek status
docker-compose ps
docker-compose logs -f backend
```

Akses aplikasi: http://localhost

---

### METODE C — Deploy ke Railway (Cloud, Gratis / Murah)

Railway adalah platform cloud yang paling mudah untuk deploy tanpa perlu manage server.

**Langkah 1 — Persiapan**
1. Daftar akun di https://railway.app (bisa login dengan GitHub)
2. Upload project ke GitHub (buat repo baru, push semua file)

**Langkah 2 — Deploy Database**
1. Di Railway dashboard, klik **"New Project"**
2. Pilih **"Provision PostgreSQL"**
3. Salin nilai `DATABASE_URL` dari tab Variables

**Langkah 3 — Deploy Backend**
1. Di project yang sama, klik **"New Service" → "GitHub Repo"**
2. Pilih repo kamu, set **Root Directory** = `backend`
3. Di tab **Variables**, tambahkan:
   ```
   DATABASE_URL = [nilai dari PostgreSQL tadi]
   SECRET_KEY   = [random string 32 karakter]
   PORT         = 8000
   ```
4. Di tab **Settings → Deploy**, pastikan Start Command:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Setelah deploy selesai, buka terminal Railway dan jalankan:
   ```
   python seed.py
   ```

**Langkah 4 — Deploy Frontend**
1. Tambah service baru dari GitHub Repo yang sama
2. Set **Root Directory** = `frontend`
3. Di tab **Variables**, tambahkan:
   ```
   VITE_API_URL = https://[url-backend-railway-kamu]
   ```
4. Build Command: `npm install && npm run build`
5. Start Command: `npx serve dist -p $PORT`

**Langkah 5 — Update API URL di Frontend**

Buka `frontend/src/utils/api.js`, ubah:
```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  ...
})
```

**Langkah 6 — Akses Aplikasi**
- Railway akan memberikan URL otomatis seperti `https://knmp-frontend.up.railway.app`
- Login: `admin@knmp.id` / `Admin@123!`

---

## CARA PAKAI APLIKASI

### 1. Setup Awal (Lakukan Sekali)

```
Dashboard → Kontrak → Tambah Perusahaan (lewat API docs atau menu)
         → Tambah PPK
         → Tambah Kontrak Baru
         → Tambah Lokasi dalam kontrak
         → Tambah Fasilitas dalam lokasi
         → Tambah Item BOQ untuk setiap fasilitas
```

### 2. Input Laporan Mingguan

**Cara A — Import Excel (Otomatis)**
1. Buka menu **Laporan Mingguan**
2. Pilih kontrak
3. Klik **Import Excel**
4. Drag & drop file Excel dari konsultan (format KNMP)
5. Sistem akan otomatis parse: minggu, periode, progress planned/actual, hambatan

**Cara B — Input Manual**
1. Buka menu **Laporan Mingguan**
2. Klik **Input Manual**
3. Isi form: minggu, periode, progress rencana (%), progress aktual (%), tenaga kerja, hambatan
4. Klik **Simpan Laporan**

### 3. Lihat Kurva S
1. Buka menu **Kurva S**
2. Pilih kontrak dari dropdown
3. Grafik otomatis terbentuk dari data laporan yang sudah diinput
4. Garis biru putus-putus = Rencana
5. Garis hijau = Realisasi
6. Bar hijau/merah = Deviasi positif/negatif
7. Garis oranye putus-putus = Titik addendum berlaku

### 4. Catat Addendum
1. Buka detail kontrak
2. Klik **Addendum**
3. Isi: nomor addendum, jenis (CCO/perpanjangan/nilai), tanggal berlaku
4. Sistem otomatis update durasi/nilai kontrak dan tandai titik di kurva S

### 5. Monitor Early Warning
1. Buka menu **Early Warning**
2. Warning otomatis muncul saat:
   - Deviasi < -5% (Waspada) atau < -10% (Kritis)
   - SPI < 0.92 (Waspada) atau < 0.85 (Kritis)
   - Rasio sisa pekerjaan vs sisa waktu tidak seimbang
3. Klik **Detail Kontrak** untuk drill-down
4. Klik **Selesai** untuk resolve warning yang sudah ditangani

---

## STRUKTUR DATABASE

```
companies ──< contracts >── ppk
                │
                ├──< contract_addenda
                ├──< weekly_reports >──< weekly_progress_items
                └──< locations >──< facilities >──< boq_items
                                                      │
                                              boq_item_versions
                                              (history addendum)
```

---

## STRUKTUR FILE

```
knmp-monitor/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, DB, Security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic (progress, excel)
│   ├── main.py           # FastAPI entry point
│   ├── seed.py           # Data awal + admin user
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/   # UI components, charts, layout
        ├── pages/        # Halaman aplikasi
        ├── store/        # Zustand state management
        └── utils/        # API client, formatters
```

---

## PENGEMBANGAN LANJUTAN (Roadmap)

- [ ] **Fase 2**: BOQ import dari Excel (bulk upload item BOQ langsung dari dokumen)
- [ ] **Fase 3**: Progress input per-item BOQ (bukan hanya header %)
- [ ] **Fase 4**: Notifikasi WhatsApp / Email saat early warning
- [ ] **Fase 5**: Laporan PDF otomatis
- [ ] **Fase 6**: Map view 200 lokasi dengan status warna
- [ ] **Fase 7**: Multi-tenant / role per PPK / per konsultan

---

## TROUBLESHOOTING

**"Cannot connect to database"**
→ Pastikan PostgreSQL berjalan dan DATABASE_URL di .env sudah benar

**"Import Excel gagal"**
→ Pastikan format file adalah .xlsx (bukan .xls atau .csv)
→ File harus format laporan konsultan standar KNMP

**"Token expired / 401"**
→ Logout dan login kembali
→ Atau hapus localStorage di browser

**Frontend tidak bisa connect ke backend**
→ Pastikan backend berjalan di port 8000
→ Cek vite.config.js: proxy sudah mengarah ke http://localhost:8000
