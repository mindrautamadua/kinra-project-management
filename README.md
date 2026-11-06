# KINRA Project Hub

Aplikasi manajemen proyek PT KINRA. Rancangan: [docs/PRD.md](docs/PRD.md), wireframe: [docs/wireframe-dashboard.html](docs/wireframe-dashboard.html).

Stack: Next.js 16 + Supabase (self-hosted, `https://cloudpm.seimangkeisez.co.id`). Otorisasi ada di database (RLS + trigger); aplikasi memakai JWT pengguna, bukan service key.

## Menyiapkan database (sekali)

Jalankan berurutan di SQL editor Studio, atau dengan `psql` sebagai `postgres`:

1. `supabase/migrations/20261026000000_init_project_hub.sql` — skema, aturan bisnis, RLS.
2. `supabase/migrations/20261026010000_app_helpers.sql` — profil otomatis, periode, grant.
   Lalu `supabase/migrations/20261027000000_charter.sql` — kolom charter (tujuan, lingkup, deliverable),
   dan `supabase/migrations/20261027010000_baseline_target.sql` — target baseline mengikuti aktivitas terakhir.
3. Buat akun admin di Studio > Authentication > Add user.
4. `scripts/aktifkan-pengguna.sql` — isi email/nama/peran lalu jalankan. Ulangi per pengguna.
5. `scripts/data-awal-okt2026.sql` — ganti `v_email_pic`, jalankan sekali. Membuat unit organisasi dan 22 proyek dari laporan Oktober 2026.

Akun baru yang mendaftar otomatis **nonaktif** sampai diaktifkan lewat langkah 4. Disarankan mematikan pendaftaran mandiri (`GOTRUE_DISABLE_SIGNUP=true`).

## Menjalankan aplikasi

```bash
cp .env.example .env.local   # isi publishable key
npm install
npm run dev                  # http://localhost:5195
```

## Halaman

| Rute | Isi |
|---|---|
| `/` | Dasbor portofolio: KPI, pemeriksaan otomatis, perlu keputusan, tabel, Gantt, arsip |
| `/proyek` | Daftar proyek per status |
| `/proyek/[id]` | Charter, Gantt aktivitas, PICA, dukungan, riwayat update |
| `/update` | Proyek yang perlu di-update minggu ini |
| `/update/[projectId]` | Formulir update mingguan dan PICA (tanpa review; update yang diajukan tetap dapat diedit sampai periode ditutup) |
| `/proyek/baru` | Form buat proyek + charter (Draf, kode otomatis) |
| `/proyek/[id]/ubah` | Ubah charter, kelola aktivitas, aktifkan proyek, ajukan/putuskan re-baseline, ubah status |
| `/proyek/[id]/charter` | Project charter satu halaman + formulir kelengkapan charter |
| `/dukungan` | Ajukan dan tanggapi permintaan dukungan atau keputusan |
| `/ringkasan` | Ringkasan eksekutif satu halaman untuk Direktur + catatan Kabag |
| `/laporan` | Semua charter proyek aktif, siap dicetak ke PDF (A4 landscape). `/laporan?paket=1` = paket Direktur: ringkasan eksekutif + lampiran charter |
