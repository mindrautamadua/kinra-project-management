-- Gabungan langkah 4+5. Jalankan SETELAH akun admin@kinra.co.id dibuat di Authentication (Auto Confirm).

-- Aktifkan akun yang sudah mendaftar di Supabase Auth dan beri peran.
-- Jalankan di SQL editor Studio (sebagai postgres). Ganti nilai di blok "isi" lalu jalankan.
--
-- Peran: admin | direksi | kabag | kasubag | pic | anggota | pembaca
-- Kode unit: MRTI (Bagian MR & TI), A, A.1, A.2, B, B.1, B.2, B.3 — kosongkan (null) untuk admin/direksi.

do $$
declare
  -- isi
  v_email   text := 'admin@kinra.co.id';
  v_nama    text := 'Administrator';
  v_jabatan text := 'Admin Aplikasi';
  v_peran   app_role := 'admin';
  v_unit    text := null;
  -- akhir isi
  v_id uuid;
  v_unit_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);
  if v_id is null then
    raise exception 'Akun % belum terdaftar di Supabase Auth. Buat dulu lewat Studio > Authentication > Add user.', v_email;
  end if;

  if v_unit is not null then
    select id into v_unit_id from org_units where kode = v_unit;
    if v_unit_id is null then raise exception 'Kode unit % tidak ditemukan.', v_unit; end if;
  end if;

  insert into profiles (id, nama, email, jabatan, org_unit_id, aktif)
  values (v_id, v_nama, v_email, v_jabatan, v_unit_id, true)
  on conflict (id) do update
    set nama = excluded.nama, jabatan = excluded.jabatan,
        org_unit_id = coalesce(excluded.org_unit_id, profiles.org_unit_id), aktif = true;

  insert into user_roles (user_id, role, org_unit_id)
  values (v_id, v_peran, v_unit_id)
  on conflict do nothing;

  raise notice 'Aktif: % sebagai % (unit %)', v_email, v_peran, coalesce(v_unit, 'seluruh perusahaan');
end;
$$;

-- Data awal pilot: unit organisasi Bagian MR & TI dan 22 proyek dari
-- "Weekly Update Bagian Manajemen Risiko dan TI Okt 2026".
--
-- Jalankan SEKALI di SQL editor Studio (sebagai postgres), setelah kedua migrasi dan
-- setelah akun admin diaktifkan (scripts/aktifkan-pengguna.sql).
--
-- Catatan validasi (PRD §12):
--   * Semua proyek sementara memakai PIC = akun pada v_email_pic. Ganti PIC per proyek sesudahnya.
--   * Tanggal minggu ke-n dipetakan: M1 = 1–7, M2 = 8–14, M3 = 15–21, M4 = 22–28, M5 = 29–31.
--   * Bila ringkasan dan charter bertentangan, tanggal charter (lebih baru) yang dipakai:
--     B.1.1 → 7 Nov, B.3.1 → 28 Okt (W4 Oktober). Tanggal mulai A.1.1 (1 Okt) adalah asumsi.
--   * Kode proyek diseragamkan ke format A.1.1 / B.1.1 (FR-11).
--   * A.1.4 LM Triwulanan dicatat sebagai pekerjaan rutin, bukan proyek.

create function pg_temp.akt(p_proyek uuid, p_urutan int, p_nama text, p_mulai date, p_selesai date,
                            p_progres int default 0, p_aktual_selesai date default null)
returns void language sql as $$
  insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, progres, status, aktual_mulai, aktual_selesai)
  values (
    p_proyek, p_urutan, p_nama, p_mulai, p_selesai,
    case when p_aktual_selesai is not null then 100 else p_progres end,
    (case when p_aktual_selesai is not null then 'selesai' when p_progres > 0 then 'berjalan' else 'belum_mulai' end)::activity_status,
    case when p_aktual_selesai is not null or p_progres > 0 then least(p_mulai, coalesce(p_aktual_selesai, p_mulai)) end,
    p_aktual_selesai
  );
$$;

do $$
declare
  v_email_pic text := 'admin@kinra.co.id';   -- ganti dengan email admin/PIC yang sudah aktif
  v_pic uuid;
  u_bag uuid; u_a uuid; u_a1 uuid; u_a2 uuid; u_b uuid; u_b1 uuid; u_b2 uuid; u_b3 uuid;
  p uuid; v_iss uuid;
  r record;
begin
  select id into v_pic from profiles where lower(email) = lower(v_email_pic) and aktif;
  if v_pic is null then raise exception 'Profil aktif dengan email % tidak ditemukan.', v_email_pic; end if;

  -- Unit organisasi
  insert into org_units (level, kode, nama) values ('bagian', 'MRTI', 'Bagian Manajemen Risiko dan TI') returning id into u_bag;
  insert into org_units (parent_id, level, kode, nama) values (u_bag, 'bidang', 'A', 'Bidang Manajemen Risiko') returning id into u_a;
  insert into org_units (parent_id, level, kode, nama) values (u_a, 'sub_bidang', 'A.1', 'Sub Bidang Manajemen Risiko') returning id into u_a1;
  insert into org_units (parent_id, level, kode, nama) values (u_a, 'sub_bidang', 'A.2', 'Sub Bidang Sistem Manajemen') returning id into u_a2;
  insert into org_units (parent_id, level, kode, nama) values (u_bag, 'bidang', 'B', 'Bidang Teknologi Informasi') returning id into u_b;
  insert into org_units (parent_id, level, kode, nama) values (u_b, 'sub_bidang', 'B.1', 'IT Strategy & Governance') returning id into u_b1;
  insert into org_units (parent_id, level, kode, nama) values (u_b, 'sub_bidang', 'B.2', 'IT Development') returning id into u_b2;
  insert into org_units (parent_id, level, kode, nama) values (u_b, 'sub_bidang', 'B.3', 'Infrastructure & Operation') returning id into u_b3;

  -- ---------------- A.1 Sub Bidang Manajemen Risiko ----------------
  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('A.1.1', 'Implementasi Aplikasi New Enterprise Risk Intelligence Nusantara (ERIN)',
          'Pengisian risiko secara top-down berdasarkan RJPP, RKAP, dan KPI di aplikasi ERIN.', u_a1, v_pic, '2026-10-01', '2026-10-30')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Pengisian risiko top-down berdasarkan RJPP, RKAP, dan KPI', '2026-10-01', '2026-10-30');

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('A.1.2', 'Penerapan Business Continuity Management System (BCMS)',
          'Menyusun kebijakan, pedoman, dan SOP BCMS PT KINRA dengan mengadopsi dokumen Holding.', u_a1, v_pic, '2026-10-15', '2026-12-31')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Adopsi dan penyesuaian substansi kebijakan, pedoman, SOP dari Holding', '2026-10-15', '2026-10-21', 50);
  perform pg_temp.akt(p, 2, 'Penyusunan draft dokumen', '2026-10-22', '2026-11-07');
  perform pg_temp.akt(p, 3, 'Reviu internal', '2026-11-08', '2026-11-21');
  perform pg_temp.akt(p, 4, 'Persetujuan dan pengesahan', '2026-11-22', '2026-11-30');
  perform pg_temp.akt(p, 5, 'Sosialisasi dan implementasi', '2026-12-01', '2026-12-07');
  insert into issues (project_id, org_unit_id, judul, dampak, owner_id)
  values (p, u_a1, 'Substansi dokumen BCMS Holding belum sesuai proses bisnis PT KINRA', 'Penyusunan draft dokumen tertunda', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Menyesuaikan substansi kebijakan, pedoman, dan SOP BCMS dengan proses bisnis PT KINRA', v_pic, '2026-10-23');

  insert into projects (kode, nama, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai, kriteria_selesai)
  values ('A.1.3', 'Penilaian Risk Maturity Index (RMI) oleh Tim BPKP', u_a1, v_pic, '2026-06-15', '2026-10-21',
          'Hasil penilaian RMI diterima. Hasil: skor 2,00 (Fase Berkembang), diterima 19 Okt 2026.')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Penentuan pelaksanaan dan pengumpulan data RMI', '2026-06-15', '2026-06-28', 0, '2026-06-28');
  perform pg_temp.akt(p, 2, 'Ekspose dan entry meeting penilaian RMI', '2026-07-01', '2026-07-21', 0, '2026-07-21');
  perform pg_temp.akt(p, 3, 'Penilaian RMI oleh BPKP', '2026-07-22', '2026-09-28', 0, '2026-09-28');
  perform pg_temp.akt(p, 4, 'Notisi dan laporan hasil penilaian RMI', '2026-10-01', '2026-10-21', 0, '2026-10-19');

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('A.1.5', 'Penyusunan RKAP Manajemen Risiko 2027',
          'Risk register, RAM, RAS, rencana aksi mitigasi, dan risiko utama 2027.', u_a1, v_pic, '2026-10-15', '2026-12-31')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Pembuatan Risk Register', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 2, 'Pembuatan RAM', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 3, 'Pembuatan RAS', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 4, 'Pembuatan Rencana Aksi Mitigasi', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 5, 'Pembuatan Risiko Utama', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 6, 'Koordinasi dengan seluruh bagian (penyamaan persepsi risiko perusahaan)', '2026-10-15', '2026-10-21');
  insert into issues (project_id, org_unit_id, judul, dampak, owner_id)
  values (p, u_a1, 'Persepsi bagian terkait atas identifikasi, penyebab, dampak, dan tingkat risiko belum sama', 'Risiko utama perusahaan belum dapat ditetapkan', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Koordinasi dengan seluruh bagian untuk konfirmasi dan validasi risiko serta penetapan risiko utama', v_pic, '2026-10-30');

  insert into projects (kode, nama, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('A.1.6', 'Tindak Lanjut Saran Perbaikan Hasil Penilaian RMI', u_a1, v_pic, '2026-10-15', '2026-12-31')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Reviu atas notisi hasil penilaian RMI', '2026-10-15', '2026-10-21', 50);
  perform pg_temp.akt(p, 2, 'Identifikasi dan inventarisasi saran perbaikan dari BPKP', '2026-10-22', '2026-10-31');
  perform pg_temp.akt(p, 3, 'Analisis dan identifikasi penerapan manajemen risiko', '2026-11-01', '2026-11-14');
  perform pg_temp.akt(p, 4, 'Penyusunan rencana aksi tindak lanjut (PIC dan bukti penyelesaian)', '2026-11-15', '2026-12-14');
  perform pg_temp.akt(p, 5, 'Koordinasi dengan bagian terkait', '2026-12-01', '2026-12-07');
  perform pg_temp.akt(p, 6, 'Pelaksanaan dan monitoring tindak lanjut saran perbaikan', '2026-12-15', '2026-12-31');
  insert into issues (project_id, org_unit_id, judul, owner_id)
  values (p, u_a1, 'Saran perbaikan BPKP perlu analisis lebih lanjut untuk menentukan prioritas', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Menyusun matriks rencana tindak lanjut saran perbaikan hasil penilaian RMI', v_pic, '2026-11-05');

  -- ---------------- A.2 Sub Bidang Sistem Manajemen ----------------
  for r in select * from (values
    ('A.2.1', 'Sertifikasi ISO 14001 (Sistem Manajemen Lingkungan)', date '2026-01-05', date '2026-02-27'),
    ('A.2.2', 'Reviu SOP Seluruh Bagian', date '2026-03-02', date '2026-06-30'),
    ('A.2.3', 'Audit Surveillance ISO 9001 (Sistem Manajemen Mutu)', date '2026-08-03', date '2026-09-08'),
    ('A.2.4', 'Audit Resertifikasi ISO 45001 (Sistem Manajemen K3)', date '2026-08-03', date '2026-09-08'),
    ('A.2.5', 'Audit Surveillance ISO 37001 (Sistem Manajemen Anti Penyuapan)', date '2026-08-17', date '2026-09-29')
  ) as t(kode, nama, mulai, selesai) loop
    insert into projects (kode, nama, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
    values (r.kode, r.nama, u_a2, v_pic, r.mulai, r.selesai) returning id into p;
    perform pg_temp.akt(p, 1, r.nama, r.mulai, r.selesai, 0, r.selesai);
  end loop;

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('A.2.6', 'Sertifikasi ISO 50001 (Sistem Manajemen Energi)',
          'Pendampingan sertifikasi oleh PT Bersinergi Tridharma Sukses sampai audit eksternal TUV.', u_a2, v_pic, '2026-10-08', '2026-12-17')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Meeting persiapan awal pendampingan ISO 50001', '2026-10-08', '2026-10-14', 0, '2026-10-19');
  perform pg_temp.akt(p, 2, 'Kick off, pengenalan dasar persyaratan SMEn & sosialisasi kebijakan SMEn', '2026-10-15', '2026-10-21', 0, '2026-10-22');
  perform pg_temp.akt(p, 3, 'Persiapan tim SMEn, data energi 1 tahun, data energi signifikan, proyek peningkatan', '2026-10-15', '2026-10-31');
  perform pg_temp.akt(p, 4, 'Training pemahaman implementasi ISO 50001', '2026-10-15', '2026-10-31');
  perform pg_temp.akt(p, 5, 'Workshop penyusunan target, program, dan risiko SMEn', '2026-10-15', '2026-10-31');
  perform pg_temp.akt(p, 6, 'Training internal auditor SMEn', '2026-10-22', '2026-10-31');
  perform pg_temp.akt(p, 7, 'Sosialisasi manual SMEn', '2026-11-01', '2026-11-07');
  perform pg_temp.akt(p, 8, 'Sosialisasi SOP & implementasi', '2026-11-01', '2026-11-30');
  perform pg_temp.akt(p, 9, 'Implementasi SMEn (penyusunan dokumen & catatan)', '2026-11-01', '2026-11-30');
  perform pg_temp.akt(p, 10, 'Internal audit', '2026-11-01', '2026-11-30');
  perform pg_temp.akt(p, 11, 'Tinjauan manajemen', '2026-11-22', '2026-11-30');
  perform pg_temp.akt(p, 12, 'Eksternal audit TUV stage 1', '2026-11-22', '2026-11-30');
  perform pg_temp.akt(p, 13, 'Eksternal audit TUV stage 2', '2026-12-08', '2026-12-14');
  perform pg_temp.akt(p, 14, 'Perbaikan hasil audit TUV', '2026-12-01', '2026-12-17');
  insert into issues (project_id, org_unit_id, judul, dampak, owner_id)
  values (p, u_a2, 'Data energi, dokumen pendukung, sumber daya, dan PIC tiap bagian belum teridentifikasi',
          'Tahapan sertifikasi berisiko mundur dari timeline audit', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Koordinasi dengan konsultan dan seluruh bagian untuk identifikasi kebutuhan data, sumber daya, dan PIC', v_pic, '2026-10-31');

  insert into projects (kode, nama, org_unit_id, pic_id)
  values ('A.2.7', 'Peningkatan Kualitas K3', u_a2, v_pic);   -- tetap Draf sampai charter lengkap

  -- ---------------- B.1 IT Strategy & Governance ----------------
  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('B.1.1', 'Pendataan Kebutuhan Digitalisasi tiap Bagian',
          'Dasar identifikasi, prioritas, dan perencanaan pengembangan sistem informasi perusahaan.', u_b1, v_pic, '2026-10-08', '2026-11-07')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Pembuatan aplikasi pendataan kebutuhan digitalisasi', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 2, 'Penyampaian memo kepada seluruh bagian', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 3, 'Distribusi link pendataan kepada seluruh bagian', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 4, 'Sesi wawancara untuk memvalidasi kebutuhan', '2026-10-22', '2026-10-31', 50);
  perform pg_temp.akt(p, 5, 'Rekapitulasi dan identifikasi kebutuhan digitalisasi tiap bagian', '2026-10-22', '2026-11-07', 25);
  insert into issues (project_id, org_unit_id, judul, owner_id)
  values (p, u_b1, 'Pengumpulan data kebutuhan digitalisasi dari seluruh bagian belum selesai', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Koordinasi dan monitoring setiap bagian agar formulir kebutuhan digitalisasi diisi lengkap', v_pic, '2026-10-19');

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('B.1.2', 'Sosialisasi Penggunaan Aplikasi e-Office',
          'Meningkatkan pemahaman pegawai atas aplikasi e-Office untuk digitalisasi administrasi dan persuratan.', u_b1, v_pic, '2026-10-22', '2026-10-31')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Penjadwalan sosialisasi kepada seluruh staf', '2026-10-22', '2026-10-28', 75);
  perform pg_temp.akt(p, 2, 'Simulasi dan pendampingan', '2026-10-29', '2026-10-31');
  perform pg_temp.akt(p, 3, 'Evaluasi', '2026-10-29', '2026-10-31');
  insert into issues (project_id, org_unit_id, judul, owner_id)
  values (p, u_b1, 'Belum seluruh pegawai memahami alur dan tata cara penggunaan e-Office', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Menyiapkan materi sosialisasi, panduan penggunaan, dan jadwal dengan bagian terkait', v_pic, '2026-10-28');

  -- ---------------- B.2 IT Development ----------------
  for r in select * from (values
    ('B.2.1', 'Pembuatan Aplikasi Identity & Access Management (IAM)', date '2026-10-01', date '2026-10-14'),
    ('B.2.2', 'Pembuatan Homepage Portal Aplikasi & Single Sign On', date '2026-10-01', date '2026-10-14'),
    ('B.2.4', 'Pembuatan AI Vision Pembaca KWH Otomatis', date '2026-10-08', date '2026-10-20'),
    ('B.2.6', 'Pengadaan Infrastruktur Digital dan Subscription AI', date '2026-10-08', date '2026-10-26')
  ) as t(kode, nama, mulai, selesai) loop
    insert into projects (kode, nama, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
    values (r.kode, r.nama, u_b2, v_pic, r.mulai, r.selesai) returning id into p;
    perform pg_temp.akt(p, 1, r.nama, r.mulai, r.selesai, 0, r.selesai);
  end loop;

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('B.2.3', 'Pembuatan Ticketing Aduan Internal IT', 'Kanal aduan internal ke tim TI.', u_b2, v_pic, '2026-10-01', '2026-10-14')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Analisis kebutuhan sistem ticketing', '2026-10-01', '2026-10-07', 0, '2026-10-07');
  perform pg_temp.akt(p, 2, 'Pengembangan fitur pembuatan tiket aduan', '2026-10-01', '2026-10-07', 0, '2026-10-07');
  perform pg_temp.akt(p, 3, 'Pengujian pembuatan tiket, pengelolaan laporan, dan pemantauan status', '2026-10-01', '2026-10-07', 0, '2026-10-07');
  perform pg_temp.akt(p, 4, 'Evaluasi fungsionalitas dan perbaikan', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 5, 'Verifikasi akhir dan dokumentasi penggunaan', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 6, 'Penambahan fitur SLA dan ekspor laporan', '2026-10-15', '2026-10-21', 50);
  insert into issues (project_id, org_unit_id, judul, owner_id)
  values (p, u_b2, 'Sistem ticketing belum memantau batas waktu penanganan (SLA) dan belum ada ekspor laporan', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Menambahkan fitur SLA dan ekspor laporan penyelesaian, atau mengusulkannya sebagai proyek lanjutan', v_pic, '2026-10-31');

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('B.2.5', 'Pembuatan Web Dashboard Bagian Mekanikal',
          'Rekap EAP dan kWh untuk Bagian Mekanikal, Elektrikal, Fasilitas & Keamanan.', u_b2, v_pic, '2026-10-15', '2026-10-31')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Sistem penugasan kendaraan operasional terintegrasi (logbook KM, BBM)', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 2, 'Pencatatan konsumsi listrik tenant dengan AI Vision', '2026-10-15', '2026-10-21', 0, '2026-10-24');
  perform pg_temp.akt(p, 3, 'Manajemen siklus periode konsumsi listrik dan grafik realisasi vs RKAP', '2026-10-15', '2026-10-21', 0, '2026-10-24');
  perform pg_temp.akt(p, 4, 'Standar antarmuka enterprise dan loading skeleton', '2026-10-15', '2026-10-21', 0, '2026-10-24');
  perform pg_temp.akt(p, 5, 'Integrasi hak akses berbasis peran dengan KINRA IAM', '2026-10-15', '2026-10-21', 75);

  -- ---------------- B.3 Infrastructure & Operation ----------------
  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('B.3.1', 'Pemenuhan Ketersediaan Jaringan Starlink di Gedung Graha',
          'Pemenuhan kebutuhan konektivitas jaringan internet melalui pengadaan dan pemasangan perangkat Starlink serta router pendukung di Gedung Graha untuk meningkatkan ketersediaan dan jangkauan jaringan internet pada lantai 1 dan 2.', u_b3, v_pic, '2026-10-08', '2026-10-28')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Melakukan koordinasi dengan pihak Vijja Net untuk identifikasi kebutuhan perangkat jaringan', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 2, 'Menyusun kebutuhan perangkat Starlink dan router untuk lantai 1 dan 2', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 3, 'Melakukan pengajuan persetujuan pembelian barang kepada Direktur', '2026-10-15', '2026-10-21', 75);
  perform pg_temp.akt(p, 4, 'Melakukan proses pengadaan perangkat melalui Bagian Pengadaan', '2026-10-15', '2026-10-21', 50);
  perform pg_temp.akt(p, 5, 'Melakukan pemasangan dan konfigurasi perangkat jaringan Starlink dan router', '2026-10-22', '2026-10-28');
  insert into issues (project_id, org_unit_id, judul, owner_id)
  values (p, u_b3, 'Pemenuhan kebutuhan jaringan internet di lantai 1 dan 2 Gedung Graha masih memerlukan router pendukung agar jaringan Starlink yang berada di lantai 3 dapat masuk ke lantai 1 dan 2.', v_pic) returning id into v_iss;
  insert into actions (issue_id, deskripsi, owner_id, tanggal_target)
  values (v_iss, 'Menindaklanjuti proses pengadaan perangkat bersama Bagian Pengadaan serta berkoordinasi dengan pihak Vijja Net untuk memastikan pemasangan, konfigurasi, dan pengujian konektivitas jaringan dapat dilaksanakan secepatnya.', v_pic, '2026-10-31');

  insert into projects (kode, nama, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values ('B.3.2', 'Pemasangan Starlink di Ruang Rapat Pusat Inovasi', u_b3, v_pic, '2026-10-01', '2026-10-28')
  returning id into p;
  perform pg_temp.akt(p, 1, 'Melakukan persiapan dan identifikasi kebutuhan pemasangan Starlink di Ruang Rapat Pusat Inovasi', '2026-10-01', '2026-10-07', 0, '2026-10-07');
  perform pg_temp.akt(p, 2, 'Melakukan pemasangan perangkat Starlink dan konfigurasi jaringan internet', '2026-10-08', '2026-10-14', 0, '2026-10-14');
  perform pg_temp.akt(p, 3, 'Melakukan pengujian konektivitas dan kestabilan jaringan internet', '2026-10-15', '2026-10-21', 0, '2026-10-21');
  perform pg_temp.akt(p, 4, 'Memastikan jaringan dapat digunakan untuk mendukung kegiatan rapat dan operasional perusahaan', '2026-10-22', '2026-10-28', 0, '2026-10-28');

  -- Aktifkan semua proyek bertanggal (baseline v1 dibuat otomatis), lalu tutup yang sudah selesai.
  update projects set status = 'aktif' where status = 'draf' and tanggal_mulai is not null;
  update projects set status = 'selesai', tanggal_selesai_aktual = tanggal_selesai
  where kode in ('A.1.3', 'A.2.1', 'A.2.2', 'A.2.3', 'A.2.4', 'A.2.5', 'B.2.1', 'B.2.2', 'B.2.4', 'B.2.6', 'B.3.2');

  -- Ketergantungan
  insert into project_dependencies (project_id, depends_on_id, keterangan)
  select a.id, b.id, k from (values
    ('B.2.2', 'B.2.1', 'SSO memakai identitas dari IAM'),
    ('B.2.5', 'B.2.1', 'Hak akses dashboard memakai KINRA IAM')
  ) as t(x, y, k)
  join projects a on a.kode = t.x join projects b on b.kode = t.y;

  -- Masalah tingkat unit (pengganti tabel "Current Issue")
  insert into issues (org_unit_id, judul, dampak, keparahan, owner_id) values
    (u_a1, 'Formulir RAM dari Danantara: variabel Risk Driver masih memerlukan guidance dari Holding', 'Pengisian formulir butuh waktu sampai 12 Okt 2026', 'sedang', v_pic),
    (u_a1, 'Laporan Manajemen Risiko Agustus dan September belum terkirim ke Holding', 'Tercatat sebagai keterlambatan laporan ke Holding', 'tinggi', v_pic),
    (u_a1, 'Perbaikan pengisian RKAP Manajemen Risiko hasil challenge session', 'Perbaikan dibutuhkan dalam buku RKAP', 'sedang', v_pic),
    (u_a1, 'Tanggapan atas hasil penilaian RMI belum dibuat', 'Penyerahan laporan hasil penilaian RMI terlambat', 'sedang', v_pic),
    (u_b, 'PT KINRA belum memiliki Rencana Strategis Teknologi Informasi (RSTI)', 'Belum ada panduan resmi transformasi digital kawasan', 'tinggi', v_pic),
    (u_b, 'Keterbatasan SDM TI untuk operasional dan tata kelola TI', 'Fungsi TI terbagi antara operasional harian, pengembangan, keamanan, dan IT maturity', 'tinggi', v_pic),
    (u_b, 'Pengelolaan layanan dan penanganan gangguan TI belum terstandar dan terdokumentasi', 'Kualitas layanan TI belum dapat dimonitor', 'sedang', v_pic),
    (u_b, 'Draft RKAP TI 2027 belum tersedia', null, 'tinggi', v_pic);

  -- Pekerjaan rutin (jatuh tempo tanggal 10 bulan berikutnya adalah asumsi; sesuaikan)
  insert into routine_tasks (org_unit_id, nama, frekuensi, tujuan, pic_id)
  values (u_a1, 'Laporan Manajemen Risiko Bulanan', 'bulanan', 'Holding', v_pic) returning id into p;
  insert into routine_occurrences (routine_id, periode, jatuh_tempo) values
    (p, 'Agustus 2026', '2026-09-10'), (p, 'September 2026', '2026-10-10'), (p, 'Oktober 2026', '2026-11-10');
  insert into routine_tasks (org_unit_id, nama, frekuensi, tujuan, pic_id)
  values (u_a1, 'LM Triwulanan Manajemen Risiko', 'triwulanan', 'Holding', v_pic);
end;
$$;
