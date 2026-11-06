-- Kelengkapan charter proyek (diisi sekali oleh PIC/Kasubag; sisanya dihitung dari data).
alter table projects
  add column tujuan          text,
  add column ruang_lingkup   text,
  add column di_luar_lingkup text,
  add column deliverable     text;

comment on column projects.tujuan is 'Hasil bisnis yang ingin dicapai (1–2 kalimat)';
comment on column projects.ruang_lingkup is 'Pekerjaan yang termasuk proyek';
comment on column projects.di_luar_lingkup is 'Pekerjaan yang tegas tidak termasuk, untuk mencegah penambahan lingkup diam-diam';
comment on column projects.deliverable is 'Hasil akhir yang diserahkan, satu per baris';
