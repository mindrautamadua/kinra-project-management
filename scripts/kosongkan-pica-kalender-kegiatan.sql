-- Kosongkan PICA charter B.2.8 Pengembangan Aplikasi Manajemen Kalender Kegiatan.
-- Menghapus semua masalah/risiko proyek ini beserta corrective action-nya (actions ikut terhapus lewat cascade).
-- Tampilkan dulu isinya, lalu hapus. Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

select i.judul, i.dampak, i.akar_masalah, a.deskripsi as corrective_action
from issues i
join projects p on p.id = i.project_id
left join actions a on a.issue_id = i.id
where p.kode = 'B.2.8' and p.nama ilike '%Kalender Kegiatan%';

delete from issues i
using projects p
where p.id = i.project_id and p.kode = 'B.2.8' and p.nama ilike '%Kalender Kegiatan%';

commit;
