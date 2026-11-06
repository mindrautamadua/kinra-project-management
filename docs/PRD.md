# PRD — KINRA Project Hub

Aplikasi manajemen proyek internal PT Kawasan Industri Nusantara (KINRA)

| | |
|---|---|
| Versi | 0.1 (draf untuk diskusi) |
| Tanggal | 26 Oktober 2026 |
| Pemilik produk | Bagian Manajemen Risiko dan TI |
| Pengguna awal (pilot) | Bidang Manajemen Risiko dan Bidang Teknologi Informasi |
| Dokumen terkait | `supabase/migrations/20261026000000_init_project_hub.sql`, `docs/wireframe-dashboard.html`, `panduan-ui-ux-kinra.md` |

---

## 1. Latar belakang

Progres proyek saat ini dilaporkan mingguan dalam bentuk slide ("Weekly Update Bagian Manajemen Risiko dan TI"). Strukturnya sudah baik: Current Issue → ringkasan proyek per sub-bidang → charter per proyek (Gantt Target vs Real, PICA, Next Step). Masalahnya ada pada **kualitas dan konsistensi data**, bukan format. Temuan dari laporan Oktober 2026:

| # | Masalah | Bukti |
|---|---|---|
| 1 | Angka ringkasan dan charter saling bertentangan | B1.1: ringkasan 10% vs charter 100%. B2.3: 100% vs 90%. B2.5: 70% vs 90%. B2.6: 100% vs 90%. B1.2: kosong vs 30% |
| 2 | Isi salin-tempel antarproyek | Charter B2.6 berisi aktivitas dan PICA proyek Ticketing. "Update sd saat ini" B2.3, B2.5, B2.6 berisi teks B1.1 |
| 3 | Status selalu hijau | Semua titik status hijau, padahal A.1.1 ERIN 0% dengan tenggat 30 Okt, dan laporan MR Agustus–September belum terkirim ke Holding |
| 4 | % progres tanpa metode | Tidak ada bobot aktivitas, tidak ada pembanding rencana vs aktual per tanggal |
| 5 | Tidak ada baseline | Target B1.1 berubah dari 19 Okt menjadi W1 Nov tanpa catatan |
| 6 | Kolom penting kosong | Kolom "Dukungan yang dibutuhkan" pada Current Issue kosong semua; A.1.4 kosong; A.2.7 tanpa tanggal dan progres |
| 7 | Elemen manajemen proyek belum ada | Anggaran, risiko per proyek, ketergantungan (B2.4 menunggu infrastruktur B2.6; SSO bergantung pada IAM), kaitan KPI/RKAP, kriteria selesai |
| 8 | Proyek dan pekerjaan rutin bercampur | "LM Triwulanan Manajemen Risiko" adalah pekerjaan rutin |
| 9 | Tidak ada ringkasan portofolio | Pimpinan harus membaca 34 slide untuk tahu proyek mana yang bermasalah |

Laporan slide disusun manual oleh PIC tiap minggu. Akibatnya beban administrasi tinggi, sementara pimpinan tidak bisa mempercayai angkanya.

## 2. Pernyataan masalah

Pimpinan PT KINRA tidak punya satu sumber data proyek yang dapat dipercaya untuk melihat proyek mana yang terlambat, mengapa, dan keputusan apa yang dibutuhkan dari mereka minggu ini.

## 3. Tujuan dan metrik keberhasilan

| Tujuan | Metrik | Target 3 bulan setelah pilot |
|---|---|---|
| Satu sumber data | Laporan mingguan dibuat otomatis dari aplikasi | 100% proyek pilot |
| Data konsisten | Selisih angka antara ringkasan dan detail | 0 (dijamin sistem) |
| Status jujur | Proyek yang lewat tenggat atau SPI < 0,85 tetapi berstatus hijau | 0 (dijamin sistem) |
| Kepatuhan update | Proyek aktif yang di-update sebelum batas input | ≥ 95% |
| Kelengkapan PICA | Aksi korektif yang punya owner dan tanggal target | 100% |
| Respons pimpinan | Median waktu tanggap Permintaan Dukungan | ≤ 5 hari kerja |
| Efisiensi | Waktu PIC menyusun laporan mingguan | turun ≥ 60% (baseline diukur saat pilot) |

## 4. Ruang lingkup

### Termasuk (fase 1–2)
- Master organisasi, pengguna, dan peran (login lewat KINRA IAM/SSO).
- Registrasi proyek (charter), aktivitas berbobot, dan baseline jadwal.
- Update mingguan dengan perhitungan progres dan status otomatis.
- Log Masalah/Risiko → Aksi korektif (PICA) dan Permintaan Dukungan.
- Alur review dan persetujuan laporan mingguan.
- Dasbor portofolio, detail proyek (Gantt), dan ekspor PPT/PDF dengan format slide yang sudah dikenal.
- Audit trail seluruh perubahan.

### Tidak termasuk (untuk saat ini)
- Manajemen tugas harian gaya Kanban/Trello untuk anggota tim.
- Timesheet dan perhitungan biaya SDM.
- Manajemen kontrak dan pembayaran vendor (tetap di sistem pengadaan/keuangan).
- Integrasi otomatis dengan e-Office (dicatat sebagai kandidat fase 3).

## 5. Pengguna dan peran

| Peran | Contoh jabatan | Kebutuhan utama | Hak utama |
|---|---|---|---|
| Direksi / pimpinan | Direktur, SEVP | Melihat portofolio, mengambil keputusan | Baca semua; menanggapi Permintaan Dukungan |
| Kepala Bagian (Kabag) | Kabag MR & TI | Mengendalikan portofolio bagian | Menyetujui laporan mingguan; menutup, menunda, atau membatalkan proyek |
| Kepala Sub Bagian (Kasubag) | Kasubag MR, Kasubag IT Development | Memastikan update proyek di sub-bagiannya lengkap | Membuat dan mengaktifkan proyek; mereview update; menetapkan baseline baru |
| PIC proyek | Staf pelaksana | Mengisi update dengan cepat | Mengubah aktivitas, update, PICA proyeknya; mengajukan update |
| Anggota | Staf pendukung | Melihat tugas aktivitas miliknya | Mengubah progres aktivitas yang ditugaskan kepadanya |
| Pembaca | Bagian lain, SPI | Transparansi | Baca saja |
| Admin aplikasi | Tim TI | Konfigurasi | Kelola master data, periode, peran |

Hak akses tulis berlaku sesuai cakupan unit organisasi (lihat §9.3). Seorang pengguna dapat memegang lebih dari satu peran di unit berbeda.

## 6. Konsep dan istilah

```
Unit organisasi (Bagian → Bidang → Sub Bidang)
  └─ Proyek (kode A.1.1, B2.3, …)
       ├─ Aktivitas berbobot  ── baseline versi 1, 2, …
       ├─ Update mingguan (1 per periode)
       ├─ Masalah / Risiko ── Aksi korektif
       ├─ Permintaan Dukungan
       └─ Ketergantungan ke proyek lain
```

| Istilah | Definisi |
|---|---|
| Proyek | Pekerjaan dengan tujuan, tanggal mulai dan selesai, dan hasil akhir yang jelas. Pekerjaan berulang (mis. LM Triwulanan) dicatat sebagai **Pekerjaan Rutin**, bukan proyek |
| Aktivitas | Langkah kerja dalam proyek, dengan bobot, tanggal rencana, PIC, dan kriteria selesai |
| Baseline | Salinan terkunci dari tanggal rencana dan bobot aktivitas. Status dihitung terhadap baseline aktif |
| Periode laporan | Satu minggu kalender. Label "M{n} {Bulan} {Tahun}" dengan n = minggu ke-n di bulan berdasarkan tanggal Jumat periode (n = ⌈tanggal/7⌉, sehingga M5 dimungkinkan) |
| PICA | Problem Identification & Corrective Action. Di aplikasi: Masalah (PI) dengan satu atau lebih Aksi korektif (CA) |
| Permintaan Dukungan | Pengganti kolom "Dukungan yang dibutuhkan": permintaan konkret kepada pejabat tertentu, dengan tenggat dan status |

## 7. Kebutuhan fungsional

Prioritas: **W** = wajib fase 1, **P** = penting fase 2, **O** = opsional fase 3.

### 7.1 Organisasi dan pengguna
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-01 | Login melalui KINRA IAM (OIDC/SSO). Tidak ada kata sandi lokal | W |
| FR-02 | Admin mengelola pohon unit organisasi (Bagian → Bidang → Sub Bidang) dan kode unit (A, A.1, B.2, …) | W |
| FR-03 | Admin memberi peran per pengguna per unit; peran berlaku juga untuk unit turunannya | W |
| FR-04 | Profil menyimpan nama, NIK, jabatan, unit. PIC proyek selalu orang, bukan jabatan | W |

### 7.2 Proyek (charter)
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-10 | Kasubag ke atas membuat proyek dengan: kode, nama, deskripsi, unit, PIC, sponsor, tanggal mulai dan selesai, kriteria selesai, anggaran (Rp juta, opsional) | W |
| FR-11 | Kode proyek dibuat otomatis dari kode unit + nomor urut (A.1.7, B2.7). Format penomoran diseragamkan | W |
| FR-12 | Status proyek: Draf → Aktif → Selesai / Ditunda / Dibatalkan. Proyek Selesai otomatis keluar dari laporan mingguan aktif dan masuk arsip | W |
| FR-13 | Proyek dikaitkan ke satu atau lebih sasaran strategis (RJPP, RKAP, KPI) | P |
| FR-14 | Ketergantungan antarproyek: "B2.4 bergantung pada B2.6". Bila proyek induk Terlambat/Kritis, proyek turunan menampilkan peringatan | P |
| FR-15 | Pekerjaan Rutin dicatat terpisah (nama, frekuensi, PIC, tanggal jatuh tempo berikutnya, status terkirim/belum) dan tampil sebagai daftar kepatuhan, bukan Gantt | P |
| FR-16 | Impor proyek dan aktivitas awal dari templat Excel | W |

### 7.3 Aktivitas dan baseline
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-20 | Aktivitas punya: urutan, nama, bobot, PIC, rencana mulai/selesai, aktual mulai/selesai, progres, kriteria selesai | W |
| FR-21 | Bobot default sama rata; boleh diubah. Total bobot tidak harus 100 (dinormalisasi otomatis) | W |
| FR-22 | Progres aktivitas hanya boleh 0, 25, 50, 75, atau 100. Nilai 100 hanya bisa dicapai dengan menandai aktivitas Selesai dan mengisi tanggal aktual selesai | W |
| FR-23 | Saat proyek diaktifkan, sistem membuat **baseline versi 1** (tanggal rencana dan bobot dikunci) | W |
| FR-24 | Mengubah tanggal rencana atau bobot setelah baseline menjadi rencana kerja; PIC/Kasubag/Kabag dapat menetapkannya sebagai **baseline baru dengan alasan wajib, langsung berlaku tanpa persetujuan Kabag** (keputusan 27 Okt 2026). Versi lama tersimpan, perubahan tercatat di audit log, dan dasbor menampilkan proyek yang mengganti baseline minggu ini | W |
| FR-25 | Menambah aktivitas di luar lingkup awal (mis. "penambahan fitur SLA" pada Ticketing) memerlukan re-baseline, atau dicatat sebagai proyek lanjutan | P |
| FR-26 | Lampiran bukti per aktivitas (dokumen, foto, tautan) | P |

### 7.4 Update mingguan
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-30 | Sistem membuka periode baru setiap Senin dan menetapkan batas input (default Kamis 17.00 WIB) | W |
| FR-31 | Formulir update per proyek: progres tiap aktivitas, "Yang telah dilakukan", "Rencana minggu depan", dan PICA baru/diperbarui. Isian minggu lalu ditampilkan sebagai acuan; teks tidak disalin otomatis | W |
| FR-32 | % rencana, % aktual, SPI, dan status dihitung sistem (§8). PIC tidak mengetik angka progres proyek | W |
| FR-33 | Alur: Draf → Diajukan (PIC) → Direview (Kasubag) → Disetujui (Kabag) → Terkunci. Reviewer dapat mengembalikan dengan catatan | W |
| FR-34 | Setelah terkunci, sistem menyimpan snapshot progres semua aktivitas untuk periode itu (bahan baris "Real" pada Gantt dan grafik tren) | W |
| FR-35 | Validasi sebelum pengajuan: lihat §8.4 | W |
| FR-36 | Pengingat otomatis H-1 dan hari H batas input kepada PIC yang belum mengajukan; rekap kepatuhan ke Kasubag | P |

### 7.5 Masalah, risiko, dan aksi (PICA)
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-40 | Masalah dicatat per proyek atau per unit (pengganti tabel "Current Issue"): judul, dampak, akar masalah, tingkat keparahan, owner | W |
| FR-41 | Setiap Masalah wajib punya ≥ 1 Aksi korektif dengan owner (orang) dan tanggal target | W |
| FR-42 | Risiko proyek: judul, penyebab, dampak, skor kemungkinan × dampak (1–5), rencana mitigasi. Memakai skala yang sama dengan register risiko perusahaan | P |
| FR-43 | Aksi yang lewat tanggal target ditandai Terlambat dan muncul di dasbor | W |
| FR-44 | Masalah dapat dieskalasi menjadi Permintaan Dukungan dengan satu klik | W |

### 7.6 Permintaan Dukungan
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-50 | Isian: permintaan (kalimat kerja yang spesifik), ditujukan kepada (pengguna), proyek/masalah terkait, tenggat, dampak bila tidak dipenuhi | W |
| FR-51 | Status: Diajukan → Diproses → Dipenuhi / Ditolak, dengan tanggapan tertulis | W |
| FR-52 | Dasbor pimpinan menampilkan daftar "Perlu keputusan Anda" yang diurutkan dari tenggat terdekat | W |

### 7.7 Dasbor dan laporan
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-60 | Dasbor portofolio: KPI tile (proyek aktif, per status, kepatuhan update, dukungan menunggu), daftar perlu keputusan, tabel portofolio, Gantt ringkas, panel kualitas data. Lihat `docs/wireframe-dashboard.html` | W |
| FR-61 | Filter: unit, PIC, status, periode. Pilihan filter tersimpan per pengguna | W |
| FR-62 | Halaman detail proyek: charter, Gantt baseline vs aktual dengan garis "hari ini", tren % rencana vs % aktual per minggu, PICA, dukungan, riwayat baseline | W |
| FR-63 | Ekspor laporan mingguan ke **PPTX dan PDF** mengikuti susunan slide saat ini (Current Issue → ringkasan per sub-bidang → charter per proyek), ditambah satu slide ringkasan portofolio di depan. Semua angka berasal dari data yang sama | W |
| FR-64 | Ekspor tabel ke Excel | P |
| FR-65 | Tren portofolio: jumlah proyek per status per minggu, 12 minggu terakhir | P |
| FR-66 | Asisten AI: ringkasan naratif mingguan untuk pimpinan dan jawaban atas pertanyaan seperti "proyek TI mana yang terlambat?" | O |

### 7.8 Audit dan riwayat
| ID | Kebutuhan | Prio |
|---|---|---|
| FR-70 | Setiap perubahan pada proyek, aktivitas, update, PICA, dan dukungan tercatat: siapa, kapan, nilai lama, nilai baru | W |
| FR-71 | Laporan yang sudah terkunci tidak dapat diubah; koreksi dilakukan di periode berikutnya dengan catatan | W |

## 8. Aturan bisnis

### 8.1 Progres
- **% aktual proyek** = Σ(bobot × progres aktivitas) / Σ bobot.
- **% rencana proyek pada tanggal t** = Σ(bobot × fraksi rencana aktivitas pada t) / Σ bobot. Fraksi rencana aktivitas = 0 sebelum rencana mulai, 1 setelah rencana selesai, dan linear di antaranya (berdasarkan hari kalender).
- Tanggal t = tanggal akhir periode laporan (Jumat).
- Rencana diambil dari **baseline aktif**, bukan dari tanggal rencana yang sedang diedit.

### 8.2 Status proyek (otomatis)
SPI (Schedule Performance Index) = % aktual / % rencana.

| Status | Syarat | Token warna | Ikon |
|---|---|---|---|
| Selesai | Proyek berstatus Selesai | `--s1` | CircleCheck |
| Belum mulai | % rencana = 0 dan % aktual = 0 | `--s3` | CircleDot |
| Data belum lengkap | Tidak ada aktivitas, atau tanpa tanggal selesai | `--s3` | CircleDot |
| Sesuai rencana | SPI ≥ 0,95 | `--good` | CircleCheck |
| Waspada | 0,85 ≤ SPI < 0,95 | `--warn` | TriangleAlert |
| Terlambat | 0,70 ≤ SPI < 0,85 | `--serious` | TrendingDown |
| Kritis | SPI < 0,70, **atau** tanggal hari ini melewati tanggal selesai baseline dan proyek belum Selesai | `--crit` | CircleX |

Aturan tambahan:
- Bila % rencana < 10%, SPI tidak stabil. Status ditentukan dari selisih poin: selisih ≤ 5 poin = Sesuai, 5–10 = Waspada, > 10 = Terlambat.
- **Override hanya boleh memperburuk status** (mis. PIC tahu ada hambatan yang belum tercermin di angka). Override wajib disertai alasan dan tampil dengan tanda khusus. Status tidak bisa diperbaiki secara manual.
- Status selalu ditampilkan dengan ikon + teks + warna, bukan warna saja.

### 8.3 Status Aksi dan Dukungan
- Aksi Terlambat: tanggal target < hari ini dan status belum Selesai.
- Dukungan Lewat Tenggat: tenggat < hari ini dan status Diajukan/Diproses.

### 8.4 Validasi sebelum update diajukan
1. Semua aktivitas yang rencana mulainya ≤ akhir periode memiliki progres yang diisi (boleh 0).
2. "Yang telah dilakukan" dan "Rencana minggu depan" tidak kosong, minimal 20 karakter, dan tidak identik dengan isian proyek lain pada periode yang sama (pencegah salin-tempel).
3. Status Terlambat/Kritis wajib memiliki minimal satu Masalah terbuka beserta Aksi korektif.
4. Setiap Aksi korektif memiliki owner dan tanggal target.
5. Proyek tidak dapat ditandai Selesai bila masih ada aktivitas yang belum Selesai/Dibatalkan.
6. Aktivitas berprogres 100 wajib berstatus Selesai dan memiliki tanggal aktual selesai.

## 9. Kebutuhan non-fungsional

### 9.1 Teknologi
| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Sama dengan KINRA Performance Hub; komponen dan token dapat dipakai ulang |
| Gaya | `panduan-ui-ux-kinra.md` (token, Chip, tabel, tema gelap/terang) | Satu keluarga visual |
| Data | Supabase (PostgreSQL, Row Level Security, Storage untuk lampiran) | Sudah dipakai tim TI (B2.5); RLS untuk otorisasi di tingkat basis data |
| Autentikasi | KINRA IAM/SSO (B2.1, B2.2) sebagai penyedia OIDC untuk Supabase Auth | Tidak membangun ulang login dan hak akses |
| Grafik | ECharts, sesuai panduan §7 | Konsisten |
| Ekspor | Rute server Next.js dengan `pptxgenjs` (PPTX) dan render PDF | Format slide yang sama dengan sekarang |
| Terjadwal | Supabase cron (pg_cron) + Edge Function | Pembukaan periode, pengingat, penguncian |

### 9.2 Kualitas
- Bahasa Indonesia baku; format angka `id-ID`; uang disimpan dalam Rp juta.
- Responsif sampai 375 px; formulir update harus nyaman diisi dari ponsel.
- Aksesibilitas sesuai panduan §10 (fokus keyboard, kontras, status bukan warna saja).
- Dasbor tampil < 2 detik untuk 500 proyek.
- Cadangan harian (point-in-time recovery Supabase). Data berada di region Singapura atau lokasi lain sesuai kebijakan perusahaan (lihat §13).

### 9.3 Keamanan dan otorisasi
- Semua tabel memakai RLS.
- **Baca**: semua pengguna aktif dapat membaca seluruh proyek (transparansi internal). Dapat dipersempit per unit bila diputuskan lain (§13).
- **Tulis**: dibatasi cakupan unit peran pengguna (unit dan turunannya). PIC hanya menulis pada proyek yang ia pegang; anggota hanya pada aktivitas yang ditugaskan kepadanya.
- Persetujuan (laporan mingguan, penutupan/penundaan/pembatalan proyek) hanya oleh Kabag pada unit terkait atau Admin. Perubahan charter dan baseline tidak memerlukan persetujuan.
- Audit trail tidak dapat diubah oleh pengguna mana pun.

## 10. Daftar layar

| # | Layar | Pengguna utama |
|---|---|---|
| 1 | Dasbor portofolio | Direksi, Kabag |
| 2 | Daftar proyek (tabel + filter) | Semua |
| 3 | Detail proyek: charter, Gantt, tren, PICA, dukungan, riwayat | Semua |
| 4 | Formulir update mingguan (satu halaman per proyek, tombol "proyek berikutnya") | PIC |
| 5 | Antrean review laporan | Kasubag, Kabag |
| 6 | Masalah & Aksi (lintas proyek) | Kasubag, Kabag |
| 7 | Permintaan Dukungan ("Perlu keputusan Anda") | Direksi, Kabag |
| 8 | Pekerjaan Rutin | Kasubag |
| 9 | Ekspor laporan mingguan | Kasubag, Kabag |
| 10 | Pengaturan: unit, pengguna & peran, periode, sasaran strategis | Admin |

Wireframe dasbor: `docs/wireframe-dashboard.html`.

## 11. Rencana rilis

| Fase | Isi | Durasi perkiraan | Kriteria keluar |
|---|---|---|---|
| 0. Persiapan | Finalisasi PRD, skema, desain layar; konfigurasi SSO; impor data Okt 2026 | 2 minggu | Data 22 proyek pilot tervalidasi PIC |
| 1. MVP | FR berprioritas W: proyek, aktivitas, baseline, update mingguan, status otomatis, PICA, dukungan, dasbor, ekspor PPTX | 6 minggu | Dua siklus laporan mingguan berjalan penuh dari aplikasi, slide manual dihentikan |
| 2. Penguatan | FR berprioritas P: risiko proyek, ketergantungan, sasaran strategis, pekerjaan rutin, pengingat, tren, Excel | 4 minggu | Metrik §3 tercapai di pilot |
| 3. Perluasan | Seluruh bagian PT KINRA, asisten AI, integrasi e-Office | bertahap | Disetujui Direksi |

Selama fase 1, laporan slide lama dan ekspor aplikasi dijalankan paralel paling lama 2 minggu, lalu slide manual dihentikan.

## 12. Migrasi data awal

Sumber: *Weekly Update Bagian Manajemen Risiko dan TI Okt 2026*.

1. Bentuk pohon unit: Bagian MR & TI → Bidang MR (A) → Sub Bidang MR (A.1), Sistem Manajemen (A.2); Bidang TI (B) → IT Strategy & Governance (B.1), IT Development (B.2), Infrastructure & Operation (B.3).
2. Impor 22 proyek. Proyek yang sudah 100% (A.2.1–A.2.5, B2.1, B2.2, B2.4, B2.6, B3.2, A.1.3) langsung berstatus Selesai.
3. A.1.4 LM Triwulanan dipindahkan ke Pekerjaan Rutin.
4. Setiap PIC memvalidasi aktivitas, bobot, dan tanggal proyeknya sebelum baseline v1 dibuat. Angka yang bertentangan (§1 butir 1) diselesaikan pada sesi ini.
5. Proyek tanpa tanggal (A.2.7) tetap berstatus Draf sampai charter lengkap.
6. Pecah ruang lingkup tambahan menjadi proyek baru bila sudah di luar charter awal, mis. "Penambahan fitur SLA dan ekspor Ticketing".

## 13. Keputusan yang perlu diambil

| # | Pertanyaan | Usulan |
|---|---|---|
| 1 | Apakah semua pegawai boleh membaca semua proyek? | Ya untuk pilot (transparansi); evaluasi saat perluasan |
| 2 | Hari dan jam batas input mingguan | Kamis 17.00 WIB; rapat review Jumat |
| 3 | Siapa penyetuju akhir laporan mingguan | Kabag MR & TI |
| 4 | Ambang SPI (0,95 / 0,85 / 0,70) | Pakai usulan, tinjau setelah 8 minggu |
| 5 | Lokasi data Supabase dan kepatuhan kebijakan data Danantara/Holding | Konfirmasi ke Holding sebelum go-live |
| 6 | Apakah anggaran proyek wajib diisi | Wajib untuk proyek dengan pengadaan |
| 7 | Apakah format slide ekspor tetap memakai logo Danantara, PTPN, atau keduanya | Ikuti ketentuan korporat terbaru, seragam di semua slide |

## 14. Risiko pengembangan

| Risiko | Dampak | Mitigasi |
|---|---|---|
| PIC menganggap aplikasi menambah beban | Kepatuhan update rendah | Formulir update ≤ 5 menit per proyek; slide manual dihentikan setelah paralel 2 minggu |
| Status merah memicu resistensi ("dulu hijau semua") | Baseline digeser terus agar status tetap hijau | Alasan wajib, nomor versi baseline tampil di charter, dasbor menandai proyek yang mengganti baseline minggu ini; evaluasi kembali alur persetujuan bila pola ini muncul |
| Integrasi SSO tertunda | Peluncuran mundur | Fase 0 menyiapkan OIDC lebih dulu; cadangan sementara login email perusahaan via magic link |
| Kapasitas SDM TI terbatas (Current Issue TI no. 2) | Jadwal fase 1 meleset | Lingkup MVP dikunci ke FR berprioritas W |
