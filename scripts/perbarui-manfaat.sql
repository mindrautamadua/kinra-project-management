-- Isi manfaat proyek (kotak Tujuan di charter) untuk seluruh proyek yang tercatat.
-- Dokumen sumber tidak memuat bagian manfaat; isinya disusun dari deskripsi, aktivitas, dan ruang lingkup proyek.
-- PIC dapat mengoreksinya lewat form Ubah charter.
-- Hanya mengisi yang masih kosong, sehingga isian manual tidak tertimpa.
-- Aplikasi KINRA dicocokkan per nama (kodenya berubah saat sinkron laporan). Proyek lain dicocokkan per kode
-- dan kata kunci nama, sehingga kode yang sudah dipakai proyek lain tidak ikut terisi.
-- Jalankan sekali di SQL Editor Studio sebagai postgres, setelah migrasi 20261030010000_manfaat_proyek.sql.

begin;

update projects p set manfaat = v.manfaat
from (values
  ('Pembuatan Aplikasi Identity & Access Management (IAM)', null,
   E'Data karyawan dan hak akses dikelola di satu tempat untuk seluruh aplikasi KINRA\nPemberian dan pencabutan akses lebih cepat dan dapat ditelusuri\nNotifikasi antaraplikasi seragam'),
  ('Pembuatan Portal Single Sign-On OneSeiMangkei SEZ', null,
   E'Pengguna cukup satu kali masuk untuk membuka semua aplikasi KINRA\nPengguna hanya melihat aplikasi yang menjadi haknya\nRisiko kata sandi ganda dan akses tidak sah berkurang'),
  ('Pembuatan Aplikasi Portal Aduan TI', null,
   E'Aduan dan permintaan layanan TI tercatat dalam satu kanal\nStatus penanganan dapat dipantau pelapor\nTim IT memiliki data beban kerja dan gangguan berulang'),
  ('Pembuatan Aplikasi Dashboard MKE', null,
   E'Pencatatan kWh tenant dan work order Unit Listrik terdigitalisasi\nPemakaian kendaraan dan BBM Unit Armada terpantau\nPimpinan unit memperoleh data kinerja harian tanpa rekap manual'),
  ('Pembuatan Aplikasi Dashboard Sekper', null,
   E'Pemesanan ruang rapat tanpa bentrok jadwal\nPersetujuan dan bukti penggunaan ruang tercatat\nPengingat otomatis mengurangi rapat terlewat'),
  ('Pembuatan Aplikasi Ekspedisi BMRTI', null,
   E'Surat masuk dan keluar BMRTI tercatat dan mudah dicari\nBukti terima surat langsung dari ponsel penerima\nPelacakan surat tidak lagi bergantung pada buku ekspedisi'),
  ('Pembuatan Aplikasi UAT TI', null,
   E'Pengujian aplikasi terdokumentasi dengan skenario baku\nHasil dan bukti uji terkumpul dalam laporan PDF\nKeputusan rilis berdasarkan hasil uji yang dapat ditelusuri'),
  ('B.2.6', 'infrastruktur',
   E'Aplikasi KINRA memiliki server dan database sendiri yang terpisah per lingkungan\nRilis aplikasi lebih cepat melalui deploy otomatis\nData terlindungi dengan pengamanan server dan backup harian'),
  ('B.3.1', 'starlink',
   E'Lantai 1 dan 2 Gedung Graha terjangkau jaringan internet yang stabil\nKegiatan kerja dan layanan tidak terhambat gangguan koneksi'),
  ('B.3.2', 'starlink',
   E'Rapat dan presentasi daring di Ruang Rapat Pusat Inovasi berjalan lancar\nRuang rapat siap dipakai untuk kegiatan dengan tamu dan mitra'),
  ('A.1.1', 'ERIN',
   E'Profil risiko perusahaan selaras dengan RJPP, RKAP, dan KPI\nPelaporan risiko ke Holding seragam melalui aplikasi ERIN\nPemantauan risiko lebih cepat tanpa rekap manual'),
  ('A.1.2', 'BCMS',
   E'Perusahaan siap menjaga layanan kritis saat terjadi gangguan atau bencana\nPeran dan langkah pemulihan setiap bagian jelas\nKebijakan kelangsungan usaha selaras dengan Holding'),
  ('A.1.3', 'RMI',
   E'Tingkat kematangan manajemen risiko perusahaan terukur secara independen\nDasar penyusunan program peningkatan penerapan manajemen risiko'),
  ('A.1.5', 'RKAP',
   E'Risiko utama 2027 teridentifikasi sebelum RKAP berjalan\nRencana mitigasi dan batas toleransi risiko disepakati seluruh bagian\nTarget RKAP 2027 lebih terlindungi dari kejadian risiko'),
  ('A.1.6', 'RMI',
   E'Kelemahan penerapan manajemen risiko hasil penilaian BPKP tertangani\nSkor RMI pada penilaian berikutnya meningkat\nTindak lanjut memiliki PIC dan bukti penyelesaian yang jelas'),
  ('A.2.1', '14001',
   E'Pengelolaan dampak lingkungan perusahaan memenuhi standar internasional\nKepercayaan tenant, investor, dan regulator meningkat'),
  ('A.2.2', 'SOP',
   E'SOP seluruh bagian sesuai dengan proses kerja terkini\nPelaksanaan kerja lebih seragam dan mudah diaudit'),
  ('A.2.3', '9001',
   E'Sertifikat ISO 9001 tetap berlaku\nPeluang perbaikan mutu layanan teridentifikasi dari hasil audit'),
  ('A.2.4', '45001',
   E'Sertifikat ISO 45001 diperpanjang\nRisiko kecelakaan dan penyakit akibat kerja terkendali sesuai standar'),
  ('A.2.5', '37001',
   E'Sertifikat ISO 37001 tetap berlaku\nKomitmen anti penyuapan perusahaan terjaga di mata pemangku kepentingan'),
  ('A.2.6', '50001',
   E'Penggunaan energi perusahaan terukur dan terkendali\nPeluang penghematan energi dan biaya teridentifikasi\nPerusahaan memperoleh sertifikat ISO 50001'),
  ('A.2.7', 'K3',
   E'Risiko kecelakaan kerja berkurang\nBudaya keselamatan kerja pegawai dan mitra meningkat'),
  ('B.1.1', 'kebutuhan',
   E'Kebutuhan digitalisasi setiap bagian terpetakan dalam satu daftar\nPengembangan sistem informasi diprioritaskan sesuai kebutuhan nyata\nDasar perencanaan anggaran dan roadmap TI'),
  ('B.1.2', 'e-Office',
   E'Pegawai mampu menggunakan e-Office untuk administrasi dan persuratan\nPenggunaan kertas dan waktu proses surat berkurang\nPeralihan ke persuratan digital berjalan merata di seluruh bagian'),
  ('B.2.4', 'KWH',
   E'Pembacaan meter kWh tenant otomatis dari foto\nKesalahan catat angka meter berkurang\nWaktu pencatatan petugas lapangan lebih singkat')
) as v(kunci, cek, manfaat)
where (p.nama = v.kunci or (p.kode = v.kunci and p.nama ~* v.cek))
  and coalesce(trim(p.manfaat), '') = '';

commit;

-- Proyek yang manfaatnya masih kosong (mis. proyek yang dibuat langsung di aplikasi); isi lewat form Ubah charter.
select kode, nama, status from projects
where coalesce(trim(manfaat), '') = '' and status <> 'dibatalkan'
order by kode;
