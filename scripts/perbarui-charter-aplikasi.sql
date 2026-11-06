-- Lengkapi charter proyek aplikasi KINRA (ruang lingkup, deliverable, kriteria selesai). Laporan PDF
-- 30 Okt 2026 tidak memuat bagian ini; isinya disusun dari deskripsi, aktivitas, dan update di laporan itu.
-- Hanya mengisi kolom yang masih kosong, sehingga isian manual tidak tertimpa.
-- "Di luar lingkup" tidak diisi karena tidak disebut di laporan.
-- Jalankan sekali di SQL Editor Studio sebagai postgres, setelah perbarui-aplikasi-kinra.sql.

begin;

update projects p set
  ruang_lingkup    = coalesce(nullif(trim(p.ruang_lingkup), ''), v.lingkup),
  deliverable      = coalesce(nullif(trim(p.deliverable), ''), v.deliverable),
  kriteria_selesai = coalesce(nullif(trim(p.kriteria_selesai), ''), v.kriteria)
from (values
  ('Pembuatan Aplikasi Identity & Access Management (IAM)',
   E'Master karyawan, Bagian/Sub Bagian, dan perusahaan\nMaster Aplikasi dan hak akses per aplikasi\nAutentikasi dan validasi hak akses pengguna\nPusat notifikasi (lonceng & Web Push) untuk aplikasi KINRA',
   E'IAM berjalan di produksi (iamkinra.seimangkeisez.co.id)\nDokumentasi fungsi IAM untuk Tim IT',
   E'Berjalan di produksi\nAutentikasi dan hak akses lolos pengujian'),
  ('Pembuatan Portal Single Sign-On OneSeiMangkei SEZ',
   E'Halaman masuk dengan NIK SAP\nKatalog aplikasi sesuai hak akses di IAM\nTiket akses sekali pakai ke setiap aplikasi\nTampilan ponsel, aplikasi terpasang (PWA), dan alur keluar',
   E'Portal berjalan di produksi (one.seimangkeisez.co.id)\nPanduan pengguna portal',
   E'Berjalan di produksi\nAplikasi hanya dapat dibuka dari portal'),
  ('Pembuatan Aplikasi Portal Aduan TI',
   E'Formulir aduan gangguan dan permintaan layanan TI\nPenanganan oleh Tim IT dan riwayat status aduan\nIntegrasi IAM, portal SSO, dan notifikasi KINRA',
   E'Aplikasi Portal Aduan TI di produksi\nPanduan pengguna',
   E'Seluruh skenario UAT dinyatakan sesuai oleh pengguna\nRilis produksi'),
  ('Pembuatan Aplikasi Dashboard MKE',
   E'Unit Listrik: pencatatan kWh tenant dan work order\nUnit Armada: kendaraan, perjalanan, dan BBM\nTugas rutin, peta petugas, dan asisten AI (KIRA)\nIntegrasi IAM dan portal SSO, hak akses per peran',
   E'Dashboard MKE di produksi, terpisah per unit Listrik dan Armada\nPanduan pengguna',
   E'UAT ulang setelah revisi unit kerja dinyatakan sesuai\nKasubag dan Supervisor per unit ditetapkan\nRilis produksi'),
  ('Pembuatan Aplikasi Dashboard Sekper',
   E'Pemesanan ruang rapat dengan persetujuan dua tahap\nKalender perusahaan\nPengaturan dan pemindahan ruang oleh tim Sekper, bukti penggunaan\nPengingat otomatis H-1 dan 1 jam sebelum rapat',
   E'Aplikasi Dashboard Sekper di produksi\nPanduan pengguna',
   E'UAT bersama tim Sekper dinyatakan sesuai\nRilis produksi'),
  ('Pembuatan Aplikasi Ekspedisi BMRTI',
   E'Pencatatan surat masuk dan surat keluar BMRTI\nPengiriman dan tanda tangan penerima di ponsel\nLampiran PDF dan nomor memo yang dapat menyusul',
   E'Aplikasi berjalan di produksi (ekspedisibmrti.seimangkeisez.co.id)',
   E'Berjalan di produksi dan dipakai staf BMRTI'),
  ('Pembuatan Aplikasi UAT TI',
   E'Master modul dan skenario uji per aplikasi\nSesi UAT dengan hasil, catatan, dan bukti foto\nRekap laporan PDF\nSkenario pertama: Dashboard MKE (6 modul, 269 skenario)',
   E'Aplikasi berjalan di produksi (uat.seimangkeisez.co.id)',
   E'Berjalan di produksi untuk Tim IT')
) as v(nama, lingkup, deliverable, kriteria)
where p.nama = v.nama;

commit;
