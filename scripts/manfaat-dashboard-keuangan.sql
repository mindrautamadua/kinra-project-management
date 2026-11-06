-- Lengkapi manfaat charter B.2.9 Pengembangan Dashboard Keuangan Terintegrasi dengan SAP.
-- Disusun dari tujuan (data keuangan di SAP Holding dapat diakses langsung) dan ruang lingkup (dashboard membaca SAP melalui CDS).
-- Hanya mengisi bila manfaat masih kosong, sehingga isian manual tidak tertimpa.
-- Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

update projects p set
  manfaat = coalesce(nullif(trim(p.manfaat), ''),
    E'Data keuangan KINRA dapat dilihat kapan saja tanpa menunggu tarikan data atau laporan dari Holding\nRekap laporan keuangan manual berkurang, waktu Bagian Keuangan beralih ke analisis\nAngka di dashboard bersumber langsung dari SAP sehingga satu versi data dan minim salah salin\nPimpinan memantau kondisi keuangan terkini untuk pengambilan keputusan yang lebih cepat')
where p.kode = 'B.2.9' and p.nama ilike '%Dashboard Keuangan%';

select kode, nama, manfaat from projects where kode = 'B.2.9';

commit;
