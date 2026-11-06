-- Lengkapi charter B.2.9 Pengembangan Dashboard Keuangan Terintegrasi dengan SAP: ruang lingkup, di luar lingkup,
-- deliverable, dan kriteria selesai.
-- Disusun dari tujuan dan tujuh aktivitas proyek (Func Spec, permohonan CDS ke Holding, pembangunan CDS,
-- UAT Holding, pengembangan dashboard, UAT Bagian Keuangan, go live).
-- Hanya mengisi kolom yang masih kosong, sehingga isian manual tidak tertimpa; aman dijalankan ulang.
-- Jalankan di SQL Editor Studio sebagai postgres.

begin;

update projects p set
  ruang_lingkup = coalesce(nullif(trim(p.ruang_lingkup), ''),
    E'Penyusunan functional specification kebutuhan data dan tampilan dashboard keuangan\nPermohonan dan koordinasi pembuatan CDS (Core Data Services) dengan SAP Holding\nPembangunan CDS oleh Holding dan UAT bersama KINRA\nPengembangan Dashboard Keuangan yang membaca data langsung dari SAP melalui CDS\nUAT bersama Bagian Keuangan dan go live'),
  di_luar_lingkup = coalesce(nullif(trim(p.di_luar_lingkup), ''),
    E'Perubahan konfigurasi atau modul SAP selain pembuatan CDS (kewenangan Holding)\nData keuangan yang tidak tercatat di SAP Holding\nInput atau koreksi transaksi keuangan dari dashboard (dashboard hanya menampilkan data)\nDashboard untuk bagian selain Bagian Keuangan\nPengadaan lisensi SAP'),
  deliverable = coalesce(nullif(trim(p.deliverable), ''),
    E'Dokumen functional specification Dashboard Keuangan\nSurat permohonan pembuatan CDS ke Holding\nCDS di SAP Holding yang lolos UAT bersama KINRA\nDashboard Keuangan di produksi, terhubung langsung ke SAP\nHasil UAT bersama Bagian Keuangan'),
  kriteria_selesai = coalesce(nullif(trim(p.kriteria_selesai), ''),
    E'Functional specification disetujui Bagian Keuangan\nCDS lolos UAT bersama Holding\nAngka di dashboard sama dengan laporan SAP untuk periode uji\nBerita acara UAT ditandatangani Bagian Keuangan\nDashboard berjalan di produksi dan dipakai Bagian Keuangan')
where p.kode = 'B.2.9' and p.nama ilike '%Dashboard Keuangan%';

select kode, nama, di_luar_lingkup, kriteria_selesai from projects where kode = 'B.2.9';

commit;
