-- Lengkapi "di luar lingkup" charter B.2.7 Pembuatan Aplikasi Dashboard Sekper (manajemen ruang rapat).
-- Disusun dari ruang lingkup (ruang rapat di bawah pengelolaan PT KINRA) dan update terakhir (pengingat lewat notifikasi KINRA).
-- Hanya mengisi bila kolom masih kosong, sehingga isian manual tidak tertimpa.
-- Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

update projects p set
  di_luar_lingkup = coalesce(nullif(trim(p.di_luar_lingkup), ''),
    E'Ruang rapat di luar pengelolaan PT KINRA\nPemesanan konsumsi dan perlengkapan rapat\nPengadaan perangkat ruang rapat (layar, video conference)\nNotifikasi via WhatsApp dan sinkronisasi ke Google/Outlook Calendar')
where p.kode = 'B.2.7' and p.nama ilike '%Dashboard Sekper%';

select kode, nama, di_luar_lingkup from projects where kode = 'B.2.7';

commit;
