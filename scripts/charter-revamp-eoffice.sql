-- Definisi proyek B.2.14 "Revamp eOffice" (sub bidang IT Development, Draf, 3 Nov – 1 Des 2026).
-- Proyek dibuat dari aplikasi tanpa deskripsi dan charter. Isi disusun mengikuti pola proyek aplikasi B.2
-- lainnya (integrasi IAM dan portal SSO, UAT, rilis produksi) dan konteks e-Office di B.1.2 / B.3.3;
-- PIC dapat mengoreksinya lewat form Ubah charter.
-- Hanya mengisi kolom yang masih kosong, sehingga isian manual tidak tertimpa. Aman dijalankan ulang.
-- Jalankan di SQL Editor Studio sebagai postgres.

begin;

update projects p set
  deskripsi        = coalesce(nullif(trim(p.deskripsi), ''), v.deskripsi),
  tujuan           = coalesce(nullif(trim(p.tujuan), ''), v.tujuan),
  manfaat          = coalesce(nullif(trim(p.manfaat), ''), v.manfaat),
  ruang_lingkup    = coalesce(nullif(trim(p.ruang_lingkup), ''), v.lingkup),
  di_luar_lingkup  = coalesce(nullif(trim(p.di_luar_lingkup), ''), v.luar),
  deliverable      = coalesce(nullif(trim(p.deliverable), ''), v.deliverable),
  kriteria_selesai = coalesce(nullif(trim(p.kriteria_selesai), ''), v.kriteria)
from (values (
  'Revamp eOffice',
  'Pembaruan aplikasi e-Office perusahaan agar terintegrasi dengan IAM dan portal SSO OneSeiMangkei SEZ: '
    || 'surat masuk dan keluar, memorandum, disposisi, persetujuan berjenjang, penomoran otomatis, dan arsip digital.',
  'Menyediakan e-Office yang mudah dipakai dan terhubung dengan ekosistem aplikasi KINRA, sehingga seluruh proses '
    || 'persuratan dan memorandum berjalan digital dari pembuatan, persetujuan, hingga pengarsipan.',
  E'Pegawai masuk ke e-Office dengan satu akun melalui portal SSO, tanpa akun terpisah\n'
    || E'Waktu proses surat dan memorandum lebih singkat karena persetujuan dan disposisi dapat dilakukan dari ponsel\n'
    || E'Status surat dapat dilacak dan arsip mudah dicari, penggunaan kertas berkurang\n'
    || 'Hak akses mengikuti struktur organisasi di IAM, sehingga perubahan jabatan tidak perlu diatur ulang manual',
  E'Analisis alur persuratan dan fitur e-Office yang berjalan saat ini bersama Sekper dan perwakilan bagian\n'
    || E'Surat masuk, surat keluar, dan memorandum internal dengan template dan penomoran otomatis per bagian\n'
    || E'Disposisi dan persetujuan berjenjang sesuai struktur organisasi\n'
    || E'Arsip digital dengan pencarian, lampiran PDF, dan riwayat status surat\n'
    || E'Notifikasi KINRA (lonceng dan Web Push) untuk surat, disposisi, dan persetujuan\n'
    || E'Tampilan ponsel (PWA)\n'
    || 'Integrasi IAM dan portal SSO, hak akses per peran',
  E'Tanda tangan elektronik tersertifikasi (BSrE/PSrE)\n'
    || E'Digitalisasi atau migrasi arsip surat fisik lama\n'
    || E'Pengiriman surat ke pihak luar melalui kurir atau pos\n'
    || 'Pengadaan perangkat untuk pegawai',
  E'Dokumen kebutuhan dan alur persuratan yang disepakati\n'
    || E'Aplikasi e-Office hasil revamp di produksi\n'
    || E'Berita acara UAT\n'
    || 'Panduan pengguna per peran (staf, Kasubag, Kabag, Sekper)',
  E'Alur surat masuk, surat keluar, memorandum, dan disposisi berjalan dari pembuatan hingga arsip\n'
    || E'Seluruh skenario UAT dinyatakan sesuai oleh Sekper dan perwakilan bagian\n'
    || E'Rilis produksi dan dapat dibuka dari portal SSO\n'
    || 'Panduan pengguna terbagi ke seluruh bagian'
)) as v(nama, deskripsi, tujuan, manfaat, lingkup, luar, deliverable, kriteria)
where p.kode = 'B.2.14' and p.nama = v.nama;

commit;

-- Rencana kerja: Go Live 1 Desember 2026. Hanya diisi bila proyek belum punya aktivitas.
begin;

insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, deliverable, milestone)
select p.id, v.urutan, v.nama, v.mulai::date, v.selesai::date, v.deliverable, v.milestone
from projects p
cross join (values
  (1, 'Melakukan analisis kebutuhan dan alur persuratan bersama Sekper dan perwakilan bagian, termasuk kajian fitur e-Office yang berjalan saat ini',
      '2026-11-03', '2026-11-07', 'Dokumen kebutuhan dan alur persuratan', false),
  (2, 'Melakukan perancangan model data, alur disposisi dan persetujuan berjenjang, serta tampilan aplikasi',
      '2026-11-06', '2026-11-11', 'Rancangan tampilan dan struktur data', false),
  (3, 'Melakukan pengembangan surat masuk, surat keluar, dan memorandum beserta template dan penomoran otomatis',
      '2026-11-10', '2026-11-20', null, false),
  (4, 'Melakukan pengembangan disposisi, persetujuan berjenjang, dan notifikasi KINRA',
      '2026-11-12', '2026-11-21', null, false),
  (5, 'Melakukan pengembangan arsip digital (pencarian, lampiran PDF, riwayat status) serta integrasi IAM, portal SSO, dan tampilan ponsel',
      '2026-11-17', '2026-11-22', null, false),
  (6, 'Melakukan penyiapan data awal (struktur organisasi, template, nomor surat berjalan) dan skenario UAT',
      '2026-11-19', '2026-11-23', 'Skenario UAT', false),
  (7, 'Melakukan pengujian penerimaan pengguna (UAT) bersama Sekper dan perwakilan bagian serta perbaikan hasil pengujian',
      '2026-11-24', '2026-11-28', 'Berita acara UAT', false),
  (8, 'Melakukan penyusunan panduan pengguna per peran dan sosialisasi ke seluruh bagian',
      '2026-11-25', '2026-11-30', 'Panduan pengguna per peran', false),
  (9, 'Go Live e-Office hasil revamp',
      '2026-12-01', '2026-12-01', 'e-Office di produksi dan dapat dibuka dari portal SSO', true)
) as v(urutan, nama, mulai, selesai, deliverable, milestone)
where p.kode = 'B.2.14' and p.nama = 'Revamp eOffice'
  and not exists (select 1 from activities a where a.project_id = p.id);

commit;
