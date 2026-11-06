-- B.2.6 Pengadaan / penyiapan infrastruktur digital: samakan dengan "Dokumentasi Setup Infrastruktur VPS"
-- (Setup Infrastruktur Server (VPS) Hosting & Database, target W4 Oktober 2026, progres 100%).
-- Jalankan sekali di SQL Editor Studio sebagai postgres. Satu transaksi: bila ada galat, tidak ada yang tersimpan.
--
-- Diubah: deskripsi, target selesai (28 Okt), enam aktivitas (semua Selesai di W4 Oktober), baseline aktif,
-- PICA, isian update periode berjalan, serta ruang lingkup/deliverable/kriteria selesai bila masih kosong.
-- Nama proyek tidak diubah. Aktivitas lama diganti seluruhnya.

begin;

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
    nama = coalesce(p_nama, nama), deskripsi = p_deskripsi, tanggal_selesai = p_target,
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

do $$
begin
  perform pg_temp.sinkron('B.2.6', 'infrastruktur', null,
    'Penyiapan tiga VPS Hostinger (testing, production, database) untuk hosting aplikasi web perusahaan menggunakan Coolify, database Supabase self-hosted per aplikasi, serta pengamanan dan backup otomatis harian.',
    '2026-10-28',
    '[["Menyiapkan VPS Testing (187.124.138.32): Ubuntu 26.04, Coolify, panel cp.seimangkeisez.co.id dengan HTTPS", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Menyiapkan VPS Production (187.124.138.44): Ubuntu 26.04, Coolify, panel cpp.seimangkeisez.co.id dengan HTTPS", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Menghubungkan GitHub (TiKinra) dan alur deploy aplikasi Next.js: testing dari branch main, production dari branch deploy", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Membangun 12 instance Supabase self-hosted di VPS Database (187.124.138.29) dengan domain dan SSL masing-masing", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Mengamankan server: firewall hPanel, SSL Let''s Encrypt, swap 8 GB, batas inotify, optimasi RAM (Studio dimatikan)", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"],
      ["Menyiapkan backup otomatis harian seluruh database ke server dan ke penyimpanan lokal J:\\backup database kinra", "2026-10-22", "2026-10-28", 100, "2026-10-22", "2026-10-28"]]',
    E'3 VPS aktif: Testing (cp), Production (cpp), Database (cloudkinra).\n12 database Supabase berjalan normal (semua container healthy).\nWebsite IAM testing online di iamkinratesting.seimangkeisez.co.id.\nBackup harian otomatis 01:00 WIB, tersalin ke J: setiap hari.',
    E'Upgrade RAM VPS Database sebelum menambah database baru.\nKonfigurasi SMTP email dan migrasi schema database production.\nUji coba restore backup dan atur update Coolify production secara manual.',
    'Gangguan jalur upstream AS4800 (27–28 Okt) membuat deploy dan SSL gagal; RAM VPS Database mendekati penuh setelah 12 instance.',
    'Eskalasi ke tim network Hostinger (pulih 28 Okt); swap 8 GB, batas inotify dinaikkan, dan 12 Studio dimatikan (RAM tersedia 2,3 → 5,3 GB).');

  update projects p set
    ruang_lingkup = coalesce(nullif(trim(ruang_lingkup), ''),
      E'VPS Testing dan VPS Production dengan Coolify\nAlur deploy dari GitHub (TiKinra): main ke testing, deploy ke production\nVPS Database dengan Supabase self-hosted per aplikasi\nPengamanan server dan backup otomatis harian'),
    deliverable = coalesce(nullif(trim(deliverable), ''),
      E'3 VPS aktif: Testing (cp), Production (cpp), Database (cloudkinra)\n12 instance Supabase berjalan dengan domain dan SSL masing-masing\nBackup harian otomatis ke server dan penyimpanan lokal\nDokumentasi setup infrastruktur VPS'),
    kriteria_selesai = coalesce(nullif(trim(kriteria_selesai), ''),
      E'Seluruh domain Supabase merespons normal (rest=200, pg-meta=200)\nBackup harian berstatus SUKSES'),
    tanggal_selesai_aktual = case when status = 'selesai' then date '2026-10-28' else tanggal_selesai_aktual end
  where kode = 'B.2.6';

  update projects set status = 'selesai', tanggal_selesai_aktual = '2026-10-28' where kode = 'B.2.6' and status = 'aktif';
end;
$$;

alter table activities enable trigger activities_aturan;
alter table project_updates enable trigger project_updates_alur;

commit;
