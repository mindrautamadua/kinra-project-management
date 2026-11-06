-- Proyek baru: Pengembangan Dashboard Sistem Manajemen Energi (SMEn), sub bidang IT Development (B.2).
-- Dashboard mendukung implementasi ISO 50001 (A.2.6): konsumsi energi, Energy Performance Indicator (EnPI)
-- terhadap baseline energi, dan realisasi target & program SMEn. Data kWh diambil dari Dashboard MKE.
--
-- Proyek dibuat berstatus Draf dengan rencana kerja lengkap. Setelah charter ditinjau, Kasubag/Kabag
-- mengaktifkannya dari aplikasi; baseline v1 terbentuk saat itu.
-- Jadwal adalah usulan: rilis W1 Desember, sebelum audit eksternal TUV stage 2 (8–14 Des).
-- PIC disalin dari B.2.1. Kode memakai nomor B.2.x berikutnya.
-- Aman dijalankan ulang: bila proyek dengan nama ini sudah ada, skrip berhenti tanpa perubahan.
-- Jalankan sekali di SQL Editor Studio sebagai postgres, setelah migrasi 20261030010000_manfaat_proyek.sql.

begin;

do $$
declare
  v_nama text := 'Pengembangan Dashboard Sistem Manajemen Energi';
  v_ref projects;
  v_kode text;
  p uuid;
begin
  if exists (select 1 from projects where nama = v_nama) then
    raise notice 'Proyek "%" sudah ada; tidak ada perubahan.', v_nama;
    return;
  end if;

  select * into v_ref from projects where kode = 'B.2.1';
  if v_ref.id is null then raise exception 'Proyek B.2.1 (acuan unit dan PIC) tidak ditemukan.'; end if;
  v_kode := 'B.2.' || (select coalesce(max(split_part(kode, '.', 3)::int), 0) + 1
                       from projects where kode ~ '^B\.2\.[0-9]+$');

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai,
                        tujuan, manfaat, ruang_lingkup, di_luar_lingkup, deliverable, kriteria_selesai)
  values (v_kode, v_nama,
    'Pengembangan dashboard untuk memantau kinerja energi perusahaan sebagai pendukung penerapan Sistem Manajemen '
      || 'Energi ISO 50001: konsumsi energi, Energy Performance Indicator (EnPI) terhadap baseline energi, '
      || 'penggunaan energi signifikan, serta realisasi target dan program SMEn.',
    v_ref.org_unit_id, v_ref.pic_id, '2026-11-01', '2026-12-07',
    'Menyediakan data kinerja energi yang terukur dan mudah dipantau sebagai dasar pengambilan keputusan SMEn, '
      || 'tinjauan manajemen, dan bukti audit sertifikasi ISO 50001.',
    E'Kinerja energi perusahaan terpantau berkala tanpa rekap manual di spreadsheet\n'
      || E'Penyimpangan konsumsi terhadap baseline dan target cepat terdeteksi\n'
      || 'Bukti pemantauan dan pengukuran energi siap untuk tinjauan manajemen dan audit ISO 50001',
    E'Konsumsi energi bulanan per sumber energi (listrik, BBM) dan per area atau fasilitas\n'
      || E'Baseline energi (EnB) dan EnPI beserta tren realisasinya\n'
      || E'Daftar penggunaan energi signifikan (SEU) dan pemantauannya\n'
      || E'Target dan program SMEn beserta realisasinya\n'
      || E'Integrasi data kWh dari Dashboard MKE dan formulir input data energi lainnya\n'
      || 'Integrasi IAM dan portal SSO, hak akses per peran (tim SMEn, pimpinan)',
    E'Pemasangan meter energi atau sensor baru\n'
      || E'Pencatatan kWh tenant dan penagihan listrik (ditangani Dashboard MKE)\n'
      || E'Penyusunan dokumen SMEn (manual, SOP, target) dan pelaksanaan audit (ditangani A.2.6)\n'
      || 'Pelaksanaan proyek penghematan energi',
    E'Dashboard SMEn berjalan di produksi\n'
      || E'Panduan pengguna dan definisi perhitungan EnPI\n'
      || 'Laporan kinerja energi yang dapat diunduh (PDF)',
    E'Data energi minimal 12 bulan terakhir termuat dan EnPI terhitung sesuai metode yang disepakati tim SMEn\n'
      || E'UAT bersama tim SMEn dinyatakan sesuai\n'
      || 'Rilis produksi sebelum audit eksternal TUV stage 2')
  returning id into p;

  insert into project_pics (project_id, pic_id, utama)
  select p, pic_id, utama from project_pics where project_id = v_ref.id;

  insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, deliverable, milestone)
  values
    (p, 1, 'Melakukan analisis kebutuhan data energi bersama tim SMEn dan konsultan ISO 50001 (sumber energi, SEU, baseline energi, dan EnPI)',
        '2026-11-01', '2026-11-07', 'Dokumen kebutuhan dan definisi EnPI', false),
    (p, 2, 'Melakukan perancangan model data dan tampilan dashboard',
        '2026-11-08', '2026-11-14', 'Rancangan tampilan dan struktur data', false),
    (p, 3, 'Melakukan pengembangan integrasi data kWh dari Dashboard MKE dan formulir input data energi lainnya',
        '2026-11-08', '2026-11-21', null, false),
    (p, 4, 'Melakukan pengembangan visualisasi konsumsi energi, EnPI terhadap baseline, SEU, serta target dan program SMEn',
        '2026-11-15', '2026-11-28', null, false),
    (p, 5, 'Melakukan pemuatan data energi 12 bulan terakhir dan validasi perhitungan EnPI',
        '2026-11-22', '2026-11-28', 'Data historis termuat dan tervalidasi', false),
    (p, 6, 'Melakukan pengujian penerimaan pengguna (UAT) bersama tim SMEn dan perbaikan hasil pengujian',
        '2026-11-29', '2026-12-07', 'Berita acara UAT', false),
    (p, 7, 'Melakukan rilis produksi dan penyusunan panduan pengguna',
        '2026-12-01', '2026-12-07', 'Dashboard di produksi dan panduan pengguna', true);

  -- Data energi dan metode EnPI berasal dari proyek ISO 50001; data kWh dari Dashboard MKE.
  insert into project_dependencies (project_id, depends_on_id, keterangan)
  select p, id, 'Data energi 12 bulan, SEU, baseline energi, serta target dan program SMEn'
  from projects where kode = 'A.2.6' and nama ~* '50001';
  insert into project_dependencies (project_id, depends_on_id, keterangan)
  select p, id, 'Sumber data konsumsi kWh'
  from projects where nama = 'Pembuatan Aplikasi Dashboard MKE';

  raise notice 'Proyek % "%" dibuat berstatus Draf.', v_kode, v_nama;
end;
$$;

commit;
