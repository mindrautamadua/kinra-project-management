-- Ganti nama asisten AI "AIMEFP" menjadi "KIRA" pada data proyek Dashboard MKE yang sudah tersimpan.
-- "asisten AI (AIMEFP)" menjadi "asisten AI KIRA"; "AIMEFP" tanpa kurung menjadi "KIRA".
-- Hanya mengubah teks; progres, tanggal, dan baseline tidak tersentuh.
-- Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

update projects set
  deskripsi        = replace(replace(deskripsi, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA'),
  tujuan           = replace(replace(tujuan, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA'),
  manfaat          = replace(replace(manfaat, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA'),
  ruang_lingkup    = replace(replace(ruang_lingkup, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA'),
  di_luar_lingkup  = replace(replace(di_luar_lingkup, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA'),
  deliverable      = replace(replace(deliverable, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA'),
  kriteria_selesai = replace(replace(kriteria_selesai, '(AIMEFP)', 'KIRA'), 'AIMEFP', 'KIRA')
where concat_ws(' ', deskripsi, tujuan, manfaat, ruang_lingkup, di_luar_lingkup, deliverable, kriteria_selesai) like '%AIMEFP%';

update activities set nama = replace(nama, 'AIMEFP', 'KIRA') where nama like '%AIMEFP%';
update baseline_activities set nama = replace(nama, 'AIMEFP', 'KIRA') where nama like '%AIMEFP%';

select kode, nama, tujuan from projects where kode = 'B.2.5';

commit;
