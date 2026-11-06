-- B.2.14 Revamp eOffice: perubahan pendekatan pengembangan.
-- Proses bisnis mengacu pada e-Office existing: TI mengkaji alur dan fitur yang berjalan, menyusun mockup aplikasi baru,
-- lalu memvalidasinya bersama Sekper sebelum pengembangan (sebelumnya: analisis kebutuhan dari nol bersama Sekper).
-- Aktivitas 1–9 ditimpa per urutan (semuanya belum mulai, progres 0), aktivitas 10–11 ditambahkan. Go live tetap 1 Des.
-- Proyek aktif: setelah skrip ini, ajukan baseline baru dari aplikasi (Ubah proyek) dengan alasan
-- "Perubahan pendekatan: mockup berbasis e-Office existing, divalidasi Sekper".
-- Aman dijalankan ulang.

begin;

do $$
declare p uuid;
begin
  select id into p from projects where kode = 'B.2.14' and nama ilike '%eOffice%';
  if p is null then raise exception 'Proyek B.2.14 Revamp eOffice tidak ditemukan.'; end if;

  update projects set
    ruang_lingkup = replace(ruang_lingkup, 'Analisis alur persuratan dan fitur e-Office yang berjalan saat ini bersama Sekper dan perwakilan bagian', 'Kajian proses bisnis e-Office existing sebagai acuan dan penyusunan mockup aplikasi baru oleh TI, divalidasi bersama Sekper'),
    deliverable = replace(deliverable, 'Dokumen kebutuhan dan alur persuratan yang disepakati', 'Mockup aplikasi baru yang disetujui Sekper'),
    kriteria_selesai = case when position('Fitur yang dipakai di e-Office existing tetap tersedia, atau penggantinya disepakati Sekper' in kriteria_selesai) > 0 then kriteria_selesai
                            else kriteria_selesai || E'\n' || 'Fitur yang dipakai di e-Office existing tetap tersedia, atau penggantinya disepakati Sekper' end
  where id = p;

  update activities a set nama = v.nama, rencana_mulai = v.rm, rencana_selesai = v.rs, deliverable = v.dl, milestone = v.ms
  from (values
      (1, 'Melakukan kajian proses bisnis dan fitur e-Office existing sebagai acuan, beserta catatan kendala pengguna', date '2026-11-03', date '2026-11-07', 'Peta alur dan fitur existing serta daftar perbaikan', false),
      (2, 'Melakukan penyusunan mockup aplikasi baru berdasarkan alur e-Office existing dan daftar perbaikan', date '2026-11-06', date '2026-11-11', 'Mockup aplikasi', false),
      (3, 'Melakukan diskusi dan validasi mockup bersama Sekper serta revisi mockup', date '2026-11-11', date '2026-11-13', 'Mockup disetujui Sekper', true),
      (4, 'Melakukan perancangan model data serta alur disposisi dan persetujuan berjenjang sesuai mockup yang disetujui', date '2026-11-12', date '2026-11-14', 'Struktur data', false),
      (5, 'Melakukan pengembangan surat masuk, surat keluar, dan memorandum beserta template dan penomoran otomatis', date '2026-11-14', date '2026-11-21', null, false),
      (6, 'Melakukan pengembangan disposisi, persetujuan berjenjang, dan notifikasi KINRA', date '2026-11-16', date '2026-11-22', null, false),
      (7, 'Melakukan pengembangan arsip digital (pencarian, lampiran PDF, riwayat status) serta integrasi IAM, portal SSO, dan tampilan ponsel', date '2026-11-18', date '2026-11-24', null, false),
      (8, 'Melakukan penyiapan data awal dari e-Office existing (struktur organisasi, template, nomor surat berjalan) dan skenario UAT', date '2026-11-20', date '2026-11-24', 'Skenario UAT', false),
      (9, 'Melakukan pengujian penerimaan pengguna (UAT) bersama Sekper dan perwakilan bagian serta perbaikan hasil pengujian', date '2026-11-25', date '2026-11-28', 'Berita acara UAT', false),
      (10, 'Melakukan penyusunan panduan pengguna per peran dan sosialisasi ke seluruh bagian', date '2026-11-26', date '2026-11-30', 'Panduan pengguna per peran', false),
      (11, 'Go Live e-Office hasil revamp', date '2026-12-01', date '2026-12-01', 'e-Office di produksi dan dapat dibuka dari portal SSO', true)
  ) as v(urutan, nama, rm, rs, dl, ms)
  where a.project_id = p and a.urutan = v.urutan;

  insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, deliverable, milestone)
  select p, v.urutan, v.nama, v.rm, v.rs, v.dl, v.ms
  from (values
      (1, 'Melakukan kajian proses bisnis dan fitur e-Office existing sebagai acuan, beserta catatan kendala pengguna', date '2026-11-03', date '2026-11-07', 'Peta alur dan fitur existing serta daftar perbaikan', false),
      (2, 'Melakukan penyusunan mockup aplikasi baru berdasarkan alur e-Office existing dan daftar perbaikan', date '2026-11-06', date '2026-11-11', 'Mockup aplikasi', false),
      (3, 'Melakukan diskusi dan validasi mockup bersama Sekper serta revisi mockup', date '2026-11-11', date '2026-11-13', 'Mockup disetujui Sekper', true),
      (4, 'Melakukan perancangan model data serta alur disposisi dan persetujuan berjenjang sesuai mockup yang disetujui', date '2026-11-12', date '2026-11-14', 'Struktur data', false),
      (5, 'Melakukan pengembangan surat masuk, surat keluar, dan memorandum beserta template dan penomoran otomatis', date '2026-11-14', date '2026-11-21', null, false),
      (6, 'Melakukan pengembangan disposisi, persetujuan berjenjang, dan notifikasi KINRA', date '2026-11-16', date '2026-11-22', null, false),
      (7, 'Melakukan pengembangan arsip digital (pencarian, lampiran PDF, riwayat status) serta integrasi IAM, portal SSO, dan tampilan ponsel', date '2026-11-18', date '2026-11-24', null, false),
      (8, 'Melakukan penyiapan data awal dari e-Office existing (struktur organisasi, template, nomor surat berjalan) dan skenario UAT', date '2026-11-20', date '2026-11-24', 'Skenario UAT', false),
      (9, 'Melakukan pengujian penerimaan pengguna (UAT) bersama Sekper dan perwakilan bagian serta perbaikan hasil pengujian', date '2026-11-25', date '2026-11-28', 'Berita acara UAT', false),
      (10, 'Melakukan penyusunan panduan pengguna per peran dan sosialisasi ke seluruh bagian', date '2026-11-26', date '2026-11-30', 'Panduan pengguna per peran', false),
      (11, 'Go Live e-Office hasil revamp', date '2026-12-01', date '2026-12-01', 'e-Office di produksi dan dapat dibuka dari portal SSO', true)
  ) as v(urutan, nama, rm, rs, dl, ms)
  where not exists (select 1 from activities a where a.project_id = p and a.urutan = v.urutan);
end;
$$;

commit;
