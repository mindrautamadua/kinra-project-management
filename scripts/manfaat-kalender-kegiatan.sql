-- Lengkapi manfaat charter B.2.8 Pengembangan Aplikasi Manajemen Kalender Kegiatan.
-- Disusun dari tujuan (jadwal kegiatan KINRA terkelola dalam satu aplikasi) dan ruang lingkup (notifikasi via aplikasi).
-- Hanya mengisi bila manfaat masih kosong, sehingga isian manual tidak tertimpa.
-- Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

update projects p set
  manfaat = coalesce(nullif(trim(p.manfaat), ''),
    E'Seluruh jadwal kegiatan perusahaan terlihat di satu tempat, tidak lagi tersebar di grup WhatsApp dan undangan terpisah\nBentrok jadwal kegiatan dan pemakaian ruang rapat dapat dicegah sejak awal\nPeserta menerima pengingat otomatis sehingga kehadiran lebih terjaga\nPimpinan dapat memantau agenda kegiatan seluruh bagian dengan cepat')
where p.kode = 'B.2.8' and p.nama ilike '%Kalender Kegiatan%';

select kode, nama, manfaat from projects where kode = 'B.2.8';

commit;
