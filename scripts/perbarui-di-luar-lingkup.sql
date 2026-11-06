-- Isi "Di luar lingkup" pada charter untuk seluruh proyek yang tercatat.
-- Dokumen sumber tidak memuat bagian ini; isinya disusun dari ruang lingkup, aktivitas, dan proyek terkait
-- (pekerjaan yang ditangani proyek lain disebut dengan kodenya). PIC dapat mengoreksinya lewat form Ubah charter.
-- Hanya mengisi yang masih kosong, sehingga isian manual tidak tertimpa.
-- Pencocokan sama dengan perbarui-manfaat.sql: aplikasi KINRA per nama, proyek lain per kode dan kata kunci nama.
-- Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

update projects p set di_luar_lingkup = v.teks
from (values
  ('Pembuatan Aplikasi Identity & Access Management (IAM)', null,
   E'Halaman masuk dan katalog aplikasi (ditangani portal Single Sign-On)\nFitur bisnis masing-masing aplikasi KINRA\nIntegrasi dengan sistem di luar KINRA, termasuk SAP'),
  ('Pembuatan Portal Single Sign-On OneSeiMangkei SEZ', null,
   E'Pengelolaan data karyawan dan hak akses (ditangani IAM)\nFitur bisnis masing-masing aplikasi KINRA\nMasuk dengan akun pihak luar (Google, Microsoft, dan sejenisnya)'),
  ('Pembuatan Aplikasi Portal Aduan TI', null,
   E'Perbaikan perangkat dan jaringan itu sendiri (dikerjakan Tim IT sesuai aduan)\nAduan di luar layanan TI\nAkses untuk tenant atau pihak luar perusahaan'),
  ('Pembuatan Aplikasi Dashboard MKE', null,
   E'Unit kerja Mekanikal, Elektrikal, Fasilitas & Keamanan selain Listrik dan Armada\nPenagihan listrik ke tenant\nPengadaan kendaraan, BBM, dan perangkat lapangan'),
  ('Pembuatan Aplikasi Dashboard Sekper', null,
   E'Fitur kesekretariatan selain ruang rapat dan kalender perusahaan\nPenyediaan konsumsi dan perlengkapan rapat\nPemesanan ruang oleh pihak luar perusahaan'),
  ('Pembuatan Aplikasi Ekspedisi BMRTI', null,
   E'Ekspedisi surat bagian lain selain BMRTI\nPembuatan dan penomoran memo atau surat (tetap melalui e-Office)\nPengiriman surat ke pihak luar melalui jasa kurir'),
  ('Pembuatan Aplikasi UAT TI', null,
   E'Pelaksanaan UAT itu sendiri dan perbaikan temuan di aplikasi yang diuji\nPengujian otomatis, beban, dan keamanan'),
  ('B.2.6', 'infrastruktur',
   E'Pengembangan aplikasi yang berjalan di server (ditangani proyek aplikasi masing-masing)\nJaringan internet kantor (ditangani B.3.1 dan B.3.2)\nPerangkat kerja pengguna'),
  ('B.3.1', 'starlink',
   E'Jaringan di lantai 3 dan gedung lain\nPengadaan perangkat kerja pengguna\nPeningkatan kapasitas langganan Starlink'),
  ('B.3.2', 'starlink',
   E'Jaringan di ruangan lain selain Ruang Rapat Pusat Inovasi\nPerangkat presentasi dan video conference'),
  ('A.1.1', 'ERIN',
   E'Pengembangan atau modifikasi aplikasi ERIN (dikelola Holding)\nPengisian risiko secara bottom-up oleh setiap bagian'),
  ('A.1.2', 'BCMS',
   E'Sertifikasi ISO 22301\nPengadaan sarana pemulihan bencana (lokasi cadangan, pusat data cadangan)'),
  ('A.1.3', 'RMI',
   E'Tindak lanjut saran perbaikan hasil penilaian (ditangani A.1.6)'),
  ('A.1.5', 'RKAP',
   E'Penyusunan RKAP non-risiko (keuangan dan operasional)\nPelaksanaan rencana aksi mitigasi'),
  ('A.1.6', 'RMI',
   E'Penilaian RMI periode berikutnya\nPerubahan kebijakan manajemen risiko di luar saran perbaikan BPKP'),
  ('A.2.1', '14001',
   E'Sertifikasi sistem manajemen lain\nPembangunan fasilitas pengelolaan limbah dan lingkungan'),
  ('A.2.2', 'SOP',
   E'Penyusunan kebijakan dan pedoman perusahaan\nDigitalisasi alur kerja SOP ke aplikasi'),
  ('A.2.3', '9001',
   E'Perbaikan proses bisnis di luar temuan audit\nSertifikasi sistem manajemen lain'),
  ('A.2.4', '45001',
   E'Program peningkatan K3 di luar temuan audit (ditangani A.2.7)\nPengadaan alat pelindung diri'),
  ('A.2.5', '37001',
   E'Penanganan kasus penyuapan\nSertifikasi sistem manajemen lain'),
  ('A.2.6', '50001',
   E'Pelaksanaan proyek penghematan energi (retrofit peralatan)\nPengadaan meter energi baru'),
  ('A.2.7', 'K3',
   E'Audit dan sertifikasi ISO 45001 (ditangani A.2.4)\nPengadaan peralatan K3 berskala besar'),
  ('B.1.1', 'kebutuhan',
   E'Pengembangan aplikasi hasil pendataan (menjadi proyek tersendiri)\nPenganggaran dan pengadaan solusi digital'),
  ('B.1.2', 'e-Office',
   E'Pengembangan atau perubahan fitur aplikasi e-Office\nPengadaan perangkat untuk pegawai'),
  ('B.2.4', 'KWH',
   E'Penggantian meter kWh menjadi meter pintar\nPenagihan listrik ke tenant\nPencatatan meter selain kWh listrik')
) as v(kunci, cek, teks)
where (p.nama = v.kunci or (p.kode = v.kunci and p.nama ~* v.cek))
  and coalesce(trim(p.di_luar_lingkup), '') = '';

commit;

-- Proyek yang "Di luar lingkup"-nya masih kosong; isi lewat form Ubah charter.
select kode, nama, status from projects
where coalesce(trim(di_luar_lingkup), '') = '' and status <> 'dibatalkan'
order by kode;
