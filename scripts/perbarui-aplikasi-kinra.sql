-- Sinkronkan proyek aplikasi KINRA (IT Development) dengan "Laporan Progres Aplikasi KINRA - 30 Okt 2026".
-- Jalankan sekali di SQL Editor Studio sebagai postgres. Seluruh skrip satu transaksi: bila ada galat,
-- tidak ada yang tersimpan.
--
-- Pemetaan kode PDF -> database (dicocokkan per nama, kode lama tidak diubah):
--   B2.1 IAM            -> B.2.1
--   B2.2 Portal SSO     -> B.2.2
--   B2.3 Portal Aduan   -> B.2.3
--   B2.4 Dashboard MKE  -> B.2.5 (Web Dashboard Bagian Mekanikal)
--   B2.5 Dashboard Sekper -> B.2.7 (ruang rapat); B.2.8 kalender tidak diubah
--   B2.6 Ekspedisi BMRTI  -> proyek baru, kode B.2.x berikutnya
--   B2.7 UAT TI           -> proyek baru, kode B.2.x berikutnya
--
-- Per proyek: nama, deskripsi, target selesai, aktivitas (diganti lima aktivitas sesuai slide), baseline aktif,
-- PICA (masalah terbuka pertama), dan isian update periode berjalan (Update sd saat ini, Next actions).
-- Minggu ke-n = hari (n-1)*7+1 s.d. n*7 pada bulan itu, sama dengan kolom Gantt aplikasi.
-- Progres aktivitas yang masih berjalan tidak tercantum di slide; dipakai 75%. PIC dapat mengoreksinya.

begin;

-- Proyek Selesai tidak dapat diubah aktivitasnya dan update mingguan hanya untuk proyek Aktif;
-- aturan ini dimatikan sementara. Konsistensi status/progres aktivitas dijaga oleh skrip ini.
alter table activities disable trigger activities_aturan;
alter table project_updates disable trigger project_updates_alur;

-- a: array [nama, rencana_mulai, rencana_selesai, progres, aktual_mulai, aktual_selesai]
create function pg_temp.sinkron(p_kode text, p_cek text, p_nama text, p_deskripsi text, p_target date,
                                p_aktivitas jsonb, p_sudah text, p_rencana text, p_pi text, p_ca text)
returns void language plpgsql as $$
declare
  v projects;
  a jsonb;
  i int := 0;
  v_iss uuid;
  v_owner uuid;
  v_periode uuid;
  v_upd uuid;
begin
  select * into v from projects where kode = p_kode;
  if v.id is null then raise exception 'Proyek % tidak ditemukan.', p_kode; end if;
  if v.nama !~* p_cek then
    raise exception 'Proyek % bernama "%", tidak cocok dengan "%". Periksa pemetaan.', p_kode, v.nama, p_nama;
  end if;

  delete from activities where project_id = v.id;  -- baseline_activities & snapshot ikut terhapus
  for a in select * from jsonb_array_elements(p_aktivitas) loop
    i := i + 1;
    insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, progres, status, aktual_mulai, aktual_selesai)
    values (v.id, i, a->>0, (a->>1)::date, (a->>2)::date, (a->>3)::int,
            (case when (a->>3)::int = 100 then 'selesai' when (a->>3)::int > 0 then 'berjalan' else 'belum_mulai' end)::activity_status,
            (a->>4)::date, (a->>5)::date);
  end loop;

  update projects set
    nama = p_nama, deskripsi = p_deskripsi, tanggal_selesai = p_target,
    tanggal_mulai = (select min(rencana_mulai) from activities where project_id = v.id)
  where id = v.id;

  if v.baseline_aktif_id is not null then
    insert into baseline_activities (baseline_id, activity_id, nama, bobot, rencana_mulai, rencana_selesai)
    select v.baseline_aktif_id, id, nama, bobot, rencana_mulai, rencana_selesai from activities where project_id = v.id;
    update baselines set tanggal_selesai = greatest(p_target,
      (select max(rencana_selesai) from activities where project_id = v.id))
    where id = v.baseline_aktif_id;
  end if;

  -- PICA
  select id, owner_id into v_iss, v_owner from issues where project_id = v.id and status = 'terbuka' order by created_at limit 1;
  if v_iss is null then
    v_owner := coalesce(v.pic_id, (select owner_id from issues where project_id = v.id limit 1),
                        (select id from profiles where aktif order by created_at limit 1));
    insert into issues (project_id, org_unit_id, judul, owner_id) values (v.id, v.org_unit_id, p_pi, v_owner)
    returning id into v_iss;
  else
    update issues set judul = p_pi where id = v_iss;
  end if;
  if exists (select 1 from actions where issue_id = v_iss and status <> 'dibatalkan') then
    update actions set deskripsi = p_ca
    where id = (select id from actions where issue_id = v_iss and status <> 'dibatalkan' order by created_at limit 1);
  else
    insert into actions (issue_id, deskripsi, owner_id, tanggal_target) values (v_iss, p_ca, v_owner, p_target);
  end if;

  -- Update periode berjalan
  select id into v_periode from report_periods where tanggal_mulai <= current_date order by tanggal_mulai desc limit 1;
  if v_periode is null then raise exception 'Periode laporan berjalan tidak ditemukan.'; end if;
  select id into v_upd from project_updates where project_id = v.id and period_id = v_periode;
  if v_upd is null then
    insert into project_updates (project_id, period_id, sudah_dilakukan, rencana_berikut)
    values (v.id, v_periode, p_sudah, p_rencana);
  else
    update project_updates set sudah_dilakukan = p_sudah, rencana_berikut = p_rencana where id = v_upd;
  end if;
end;
$$;

-- Proyek baru (Draf) di unit dan PIC yang sama dengan B.2.1; kode B.2.x berikutnya. Tidak dibuat ulang bila sudah ada.
create function pg_temp.proyek_baru(p_nama text, p_cek text) returns text
language plpgsql as $$
declare
  v_ref projects;
  v_kode text;
  v_id uuid;
begin
  select kode into v_kode from projects where nama ~* p_cek and kode like 'B.2.%';
  if v_kode is not null then return v_kode; end if;
  select * into v_ref from projects where kode = 'B.2.1';
  v_kode := 'B.2.' || (select coalesce(max(split_part(kode, '.', 3)::int), 0) + 1 from projects where kode ~ '^B\.2\.[0-9]+$');
  insert into projects (kode, nama, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai)
  values (v_kode, p_nama, v_ref.org_unit_id, v_ref.pic_id, '2026-10-22', '2026-10-28')
  returning id into v_id;
  insert into project_pics (project_id, pic_id, utama)
  select v_id, pic_id, utama from project_pics where project_id = v_ref.id;
  return v_kode;
end;
$$;

do $$
declare
  k_ekspedisi text := pg_temp.proyek_baru('Pembuatan Aplikasi Ekspedisi BMRTI', 'ekspedisi');
  k_uat text := pg_temp.proyek_baru('Pembuatan Aplikasi UAT TI', 'UAT TI');
begin
  perform pg_temp.sinkron('B.2.1', 'IAM|Identity', 'Pembuatan Aplikasi Identity & Access Management (IAM)',
    'Pengembangan Identity and Access Management (IAM) untuk mengelola akun, data organisasi, dan hak akses pengguna terhadap aplikasi perusahaan secara terstruktur, terkontrol, dan sesuai dengan kebutuhan masing-masing bagian.',
    '2026-10-14',
    '[["Melakukan analisis kebutuhan sistem Identity and Access Management (IAM) untuk pengelolaan akun dan hak akses pengguna terhadap aplikasi perusahaan", "2026-10-01", "2026-10-07", 100, "2026-10-01", "2026-10-07"],
      ["Melakukan konfigurasi sistem serta penyesuaian fungsi pengelolaan akun dan hak akses", "2026-10-01", "2026-10-07", 100, "2026-10-08", "2026-10-28"],
      ["Melakukan pengujian fungsi autentikasi dan validasi hak akses pengguna", "2026-10-08", "2026-10-14", 100, "2026-10-08", "2026-10-28"],
      ["Melakukan evaluasi hasil pengujian dan perbaikan terhadap fungsi sistem yang belum sesuai", "2026-10-08", "2026-10-14", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pemeriksaan akhir dan penyusunan dokumentasi fungsi IAM untuk mendukung pengelolaan akses aplikasi oleh Tim IT", "2026-10-08", "2026-10-14", 100, "2026-10-22", "2026-10-28"]]',
    E'IAM berjalan di produksi (iamkinra.seimangkeisez.co.id) sejak 28 Oktober 2026.\nMaster karyawan, Bagian/Sub Bagian, perusahaan, dan Master Aplikasi beserta hak akses per aplikasi.\nMenjadi sumber data organisasi dan pusat notifikasi (lonceng & Web Push) untuk semua aplikasi KINRA.',
    'Penambahan fitur bulk untuk hak akses per bagian, bukan perorangan.',
    'Pengelolaan hak akses aplikasi masih diberikan per orang sehingga belum sepenuhnya sesuai dengan fungsi dan kebutuhan masing-masing bagian.',
    'Menyempurnakan IAM dengan menambahkan fitur pengaturan hak akses berdasarkan bagian dan fungsi pengguna.');

  perform pg_temp.sinkron('B.2.2', 'Sign|SSO|Portal', 'Pembuatan Portal Single Sign-On OneSeiMangkei SEZ',
    'Pengembangan portal satu pintu (Single Sign-On) bagi karyawan: masuk sekali dengan NIK SAP, lalu membuka aplikasi perusahaan sesuai hak akses yang diatur di IAM.',
    '2026-10-28',
    '[["Melakukan analisis alur Single Sign-On dan kebutuhan katalog aplikasi perusahaan", "2026-10-08", "2026-10-14", 100, "2026-10-08", "2026-10-14"],
      ["Melakukan pengembangan halaman masuk, katalog aplikasi, dan tiket akses sekali pakai ke setiap aplikasi", "2026-10-08", "2026-10-21", 100, "2026-10-08", "2026-10-28"],
      ["Melakukan pengujian masuk, peluncuran aplikasi, dan penolakan akses langsung tanpa portal", "2026-10-15", "2026-10-21", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan evaluasi dan perbaikan tampilan ponsel, aplikasi terpasang (PWA), dan alur keluar", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan rilis produksi dan penyusunan panduan pengguna portal", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"]]',
    E'Portal berjalan di produksi (one.seimangkeisez.co.id) sejak 28 Oktober 2026.\nKaryawan masuk dengan NIK SAP; katalog hanya menampilkan aplikasi yang diizinkan di IAM.\nAplikasi hanya dapat dibuka dari portal dengan tiket sekali pakai, di tab yang sama.',
    E'Menambahkan aplikasi baru ke katalog setelah lulus UAT.\nMemantau penggunaan dan umpan balik karyawan.',
    'Aplikasi dapat dibuka lewat tautan langsung atau banyak tab sehingga sesi pengguna sulit dikendalikan.',
    'Setiap aplikasi hanya menerima akses dari portal (tiket sekali pakai) dan dibuka di tab yang sama.');

  perform pg_temp.sinkron('B.2.3', 'aduan|ticketing', 'Pembuatan Aplikasi Portal Aduan TI',
    'Pengembangan aplikasi pelaporan gangguan dan permintaan layanan TI oleh karyawan, penanganan oleh Tim IT, serta pemantauan status aduan secara terbuka dan terukur.',
    '2026-11-07',
    '[["Melakukan analisis alur pengaduan, kategori gangguan, dan penanganan oleh Tim IT", "2026-10-08", "2026-10-14", 100, "2026-10-08", "2026-10-14"],
      ["Melakukan pengembangan formulir aduan, penanganan, dan riwayat status aduan", "2026-10-08", "2026-10-21", 100, "2026-10-08", "2026-10-28"],
      ["Melakukan integrasi dengan IAM dan portal SSO, serta notifikasi dan pembaruan otomatis", "2026-10-15", "2026-10-21", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengujian penerimaan pengguna (UAT) dan perbaikan hasil pengujian", "2026-10-22", "2026-11-07", 75, "2026-10-22", null],
      ["Melakukan rilis produksi dan penyusunan panduan pengguna", "2026-11-01", "2026-11-07", 0, null, null]]',
    E'Aplikasi selesai dikembangkan dan berjalan di lingkungan testing (patitesting).\nTerintegrasi dengan IAM, portal SSO, foto profil, dan pusat notifikasi KINRA.\nSedang dalam tahap UAT bersama pengguna.',
    E'Menyelesaikan UAT dan perbaikan temuan.\nRilis produksi pada W1 November 2026.',
    'Aplikasi belum dapat dirilis sebelum seluruh skenario UAT dinyatakan sesuai oleh pengguna.',
    'Menjalankan UAT terstruktur dan memperbaiki temuan sebelum rilis produksi.');

  perform pg_temp.sinkron('B.2.5', 'mekanikal|MKE|MEFP', 'Pembuatan Aplikasi Dashboard MKE',
    'Pengembangan dashboard operasional Bagian MEFP yang terbagi atas unit Listrik (pencatatan kWh tenant, work order) dan unit Armada (kendaraan, perjalanan, BBM), dengan tugas rutin, peta petugas, dan asisten AI (KIRA).',
    '2026-11-14',
    '[["Melakukan analisis kebutuhan operasional Bagian Mekanikal, Elektrikal, Fasilitas & Pengamanan", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengembangan modul Armada, Listrik, Tugas Rutin, Work Order, peta petugas, dan KIRA", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan integrasi dengan IAM dan portal SSO serta pengujian hak akses per peran", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan UAT dan revisi pengguna, termasuk pemisahan dashboard unit Listrik dan Armada", "2026-10-22", "2026-11-07", 75, "2026-10-22", null],
      ["Melakukan rilis produksi dan penyusunan panduan pengguna", "2026-11-08", "2026-11-14", 0, null, null]]',
    E'Aplikasi berjalan di lingkungan testing (mketesting) dan sedang UAT.\nRevisi 29 Okt: data dan dashboard dipisah per unit Listrik dan Armada; Kasubag dan Supervisor per unit diatur Superadmin.\nSkenario UAT disiapkan di aplikasi UAT TI.',
    E'UAT ulang setelah revisi unit kerja.\nPenetapan Kasubag dan Supervisor per unit, lalu rilis produksi.',
    'Unit Listrik dan Armada sama-sama memiliki tugas harian, mingguan, dan bulanan, tetapi sebelumnya tampil dalam satu dashboard.',
    'Memisahkan data, menu, dashboard, dan hak akses per unit kerja (selesai di testing, 29 Oktober 2026).');

  perform pg_temp.sinkron('B.2.7', 'rapat|sekper', 'Pembuatan Aplikasi Dashboard Sekper',
    'Pengembangan aplikasi pemesanan ruang rapat dan kalender perusahaan untuk Sekretariat Perusahaan, dengan persetujuan dua tahap, pengaturan ruang, bukti penggunaan, dan pengingat otomatis.',
    '2026-11-07',
    '[["Melakukan analisis kebutuhan pemesanan ruang rapat dan kalender perusahaan", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengembangan pemesanan, persetujuan dua tahap, kalender, dan pengingat otomatis", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengujian bentrok jadwal, pemindahan ruang, dan hak akses tim Sekper", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan UAT bersama tim Sekper dan perbaikan hasil pengujian", "2026-10-22", "2026-11-07", 75, "2026-10-22", null],
      ["Melakukan rilis produksi dan penyusunan panduan pengguna", "2026-11-01", "2026-11-07", 0, null, null]]',
    E'Aplikasi berjalan di lingkungan testing (bshtptesting) dan sedang UAT.\nAdmin/Kasubag Sekper dapat memindahkan pemesan ke ruang lain; kapasitas ruang menjadi patokan, tidak memblokir.\nPengingat H-1 dan 1 jam sebelum rapat melalui notifikasi KINRA.',
    E'Menyelesaikan UAT bersama tim Sekper.\nRilis produksi dan panduan pengguna.',
    'Permintaan ruang yang bentrok dan kebutuhan kursi tambahan perlu diatur tanpa menghambat pemesan.',
    'Fitur pengaturan ruang oleh tim Sekper dan kapasitas ruang sebagai patokan (selesai di testing).');

  perform pg_temp.sinkron(k_ekspedisi, 'ekspedisi', 'Pembuatan Aplikasi Ekspedisi BMRTI',
    'Pengembangan buku ekspedisi digital surat masuk dan surat keluar Bagian Manajemen Risiko & TI, dengan tanda tangan penerima di ponsel dan pencatatan waktu otomatis.',
    '2026-10-28',
    '[["Melakukan analisis alur ekspedisi surat masuk dan surat keluar BMRTI", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengembangan pencatatan surat, pengiriman, dan tanda tangan penerima", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengujian alur draf, kirim, dan lampiran PDF yang dapat menyusul", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan evaluasi dan perbaikan (nomor memo diisi manual dan boleh menyusul)", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan rilis produksi untuk staf BMRTI", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"]]',
    E'Aplikasi berjalan di produksi (ekspedisibmrti.seimangkeisez.co.id) sejak 28 Oktober 2026.\nPengirim/penerima diambil dari data Bagian di IAM; arah surat masuk/keluar ditentukan otomatis.\nPenerima menandatangani langsung di ponsel kurir dengan waktu tercatat otomatis.',
    'Memantau penggunaan oleh staf BMRTI dan menindaklanjuti masukan.',
    'Pencatatan ekspedisi surat sebelumnya manual dan sulit ditelusuri.',
    'Buku ekspedisi digital dengan riwayat, tanda tangan, dan lampiran yang dapat dicari.');

  perform pg_temp.sinkron(k_uat, 'UAT TI', 'Pembuatan Aplikasi UAT TI',
    'Pengembangan aplikasi internal Tim IT untuk menjalankan User Acceptance Test (UAT) aplikasi KINRA: skenario per modul, hasil uji dengan bukti foto, dan rekap laporan PDF.',
    '2026-10-28',
    '[["Melakukan analisis kebutuhan pencatatan UAT aplikasi KINRA", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan pengembangan master modul, skenario uji, sesi UAT, dan bukti foto", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan penyusunan skenario UAT pertama: Dashboard MKE (6 modul, 269 skenario)", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan evaluasi dan perbaikan tampilan serta rekap laporan PDF", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Melakukan rilis produksi untuk Tim IT", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-29"]]',
    E'Aplikasi berjalan di produksi (uat.seimangkeisez.co.id) sejak 29 Oktober 2026.\nDaftar aplikasi diambil dari IAM; hasil Sesuai/Tidak sesuai/Tidak berlaku dengan catatan dan bukti foto.\nSesi yang sudah selesai terkunci; rekap dapat diekspor ke PDF.',
    E'Menambahkan skenario UAT Portal Aduan TI dan Dashboard Sekper.\nMemperbarui skenario Dashboard MKE sesuai revisi unit kerja.',
    'Hasil UAT sebelumnya tidak terdokumentasi secara seragam antar aplikasi.',
    'Satu alat UAT dengan skenario baku per aplikasi dan laporan yang dapat dicetak.');

  -- Aplikasi yang sudah produksi (100%): aktifkan bila masih Draf (baseline v1 dibuat otomatis), lalu tutup Selesai.
  update projects set status = 'aktif' where kode in (k_ekspedisi, k_uat) and status = 'draf';
  update projects p set status = 'selesai',
    tanggal_selesai_aktual = (select max(aktual_selesai) from activities a where a.project_id = p.id)
  where kode in ('B.2.1', 'B.2.2', k_ekspedisi, k_uat) and status = 'aktif';
  update projects p set tanggal_selesai_aktual = (select max(aktual_selesai) from activities a where a.project_id = p.id)
  where kode in ('B.2.1', 'B.2.2', k_ekspedisi, k_uat) and status = 'selesai';

  raise notice 'Ekspedisi BMRTI = %, UAT TI = %', k_ekspedisi, k_uat;
end;
$$;

alter table activities enable trigger activities_aturan;
alter table project_updates enable trigger project_updates_alur;

commit;
