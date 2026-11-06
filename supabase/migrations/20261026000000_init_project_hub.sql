-- KINRA Project Hub — skema awal
-- Lihat docs/PRD.md. Nomor FR-xx dan §x merujuk ke dokumen tersebut.
--
-- Konvensi:
--   * Nama tabel dalam bahasa Inggris (konsisten dengan Supabase), nama kolom bisnis dalam bahasa Indonesia.
--   * Uang dalam Rp juta (numeric), tanggal tanpa zona (date), waktu kejadian timestamptz.
--   * Semua tabel memakai RLS. Baca: semua pengguna aktif. Tulis: sesuai cakupan unit (PRD §9.3).
--   * auth.uid() bernilai null untuk service role / pg_cron; fungsi otorisasi menganggapnya "sistem".

-- =====================================================================
-- 1. Tipe enum
-- =====================================================================

create type unit_level as enum ('direktorat', 'bagian', 'bidang', 'sub_bidang');
create type app_role as enum ('admin', 'direksi', 'kabag', 'kasubag', 'pic', 'anggota', 'pembaca');
create type project_status as enum ('draf', 'aktif', 'ditunda', 'selesai', 'dibatalkan');
create type activity_status as enum ('belum_mulai', 'berjalan', 'selesai', 'dibatalkan');
-- Urutan nilai = urutan keparahan (dipakai fn_peringkat_kesehatan).
create type health_status as enum (
  'selesai', 'belum_mulai', 'sesuai', 'data_belum_lengkap', 'waspada', 'terlambat', 'kritis'
);
create type update_status as enum ('draf', 'diajukan', 'direview', 'dikembalikan', 'disetujui', 'terkunci');
create type baseline_status as enum ('diajukan', 'disetujui', 'ditolak');
create type issue_kind as enum ('masalah', 'risiko');
create type issue_status as enum ('terbuka', 'ditutup');
create type severity_level as enum ('rendah', 'sedang', 'tinggi', 'kritis');
create type action_status as enum ('terbuka', 'berjalan', 'selesai', 'dibatalkan');
create type support_status as enum ('diajukan', 'diproses', 'dipenuhi', 'ditolak');
create type objective_source as enum ('rjpp', 'rkap', 'kpi');
create type routine_frequency as enum ('mingguan', 'bulanan', 'triwulanan', 'semesteran', 'tahunan');

-- =====================================================================
-- 2. Organisasi dan pengguna (FR-01..04)
-- =====================================================================

create table org_units (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references org_units (id) on delete restrict,
  level      unit_level not null,
  kode       text not null unique,          -- 'A', 'A.1', 'B.2'
  nama       text not null,
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);
create index on org_units (parent_id);

-- Satu baris per akun KINRA IAM yang pernah login.
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nama        text not null,
  nik         text unique,
  jabatan     text,
  email       text unique,
  org_unit_id uuid references org_units (id),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- org_unit_id null = berlaku untuk seluruh perusahaan (admin, direksi).
-- Peran pada sebuah unit berlaku juga untuk seluruh unit turunannya.
create table user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  role        app_role not null,
  org_unit_id uuid references org_units (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique nulls not distinct (user_id, role, org_unit_id)
);
create index on user_roles (user_id);

-- =====================================================================
-- 3. Sasaran strategis (FR-13)
-- =====================================================================

create table strategic_objectives (
  id     uuid primary key default gen_random_uuid(),
  tahun  int not null,
  sumber objective_source not null,
  kode   text not null,
  nama   text not null,
  unique (tahun, sumber, kode)
);

-- =====================================================================
-- 4. Proyek, aktivitas, baseline (FR-10..26)
-- =====================================================================

create table projects (
  id                     uuid primary key default gen_random_uuid(),
  kode                   text not null unique,       -- 'A.1.1', 'B2.3' (FR-11)
  nama                   text not null,
  deskripsi              text,
  org_unit_id            uuid not null references org_units (id),
  pic_id                 uuid not null references profiles (id),
  sponsor_id             uuid references profiles (id),
  status                 project_status not null default 'draf',
  tanggal_mulai          date,                       -- rencana kerja saat ini; pembanding resmi ada di baseline
  tanggal_selesai        date,
  tanggal_selesai_aktual date,
  kriteria_selesai       text,
  anggaran_rp_juta       numeric(14, 2) check (anggaran_rp_juta >= 0),
  baseline_aktif_id      uuid,                       -- FK ditambahkan setelah tabel baselines
  created_by             uuid references profiles (id) default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (tanggal_selesai >= tanggal_mulai)
);
create index on projects (org_unit_id);
create index on projects (pic_id);
create index on projects (status);

create table project_objectives (
  project_id   uuid not null references projects (id) on delete cascade,
  objective_id uuid not null references strategic_objectives (id) on delete cascade,
  primary key (project_id, objective_id)
);

-- "project_id bergantung pada depends_on_id" (FR-14)
create table project_dependencies (
  project_id    uuid not null references projects (id) on delete cascade,
  depends_on_id uuid not null references projects (id) on delete cascade,
  keterangan    text,
  primary key (project_id, depends_on_id),
  check (project_id <> depends_on_id)
);

create table activities (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects (id) on delete cascade,
  urutan           int not null default 1,
  nama             text not null,
  pic_id           uuid references profiles (id),
  bobot            numeric(6, 2) not null default 1 check (bobot > 0),       -- FR-21, dinormalisasi saat hitung
  rencana_mulai    date,
  rencana_selesai  date,
  aktual_mulai     date,
  aktual_selesai   date,
  progres          smallint not null default 0 check (progres in (0, 25, 50, 75, 100)),  -- FR-22
  status           activity_status not null default 'belum_mulai',
  kriteria_selesai text,
  catatan          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (rencana_selesai >= rencana_mulai),
  check (aktual_selesai >= aktual_mulai),
  check ((progres = 100) = (status = 'selesai')),
  check (status <> 'selesai' or aktual_selesai is not null)
);
create index on activities (project_id, urutan);
create index on activities (pic_id);

-- Salinan rencana yang dikunci. Status proyek selalu dihitung terhadap baseline aktif (§8.1).
create table baselines (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects (id) on delete cascade,
  versi              int not null,
  tanggal_selesai    date not null,
  alasan             text not null,
  status             baseline_status not null default 'diajukan',
  diajukan_oleh      uuid references profiles (id),
  diajukan_at        timestamptz not null default now(),
  diputuskan_oleh    uuid references profiles (id),
  diputuskan_at      timestamptz,
  catatan_keputusan  text,
  unique (project_id, versi)
);

create table baseline_activities (
  baseline_id     uuid not null references baselines (id) on delete cascade,
  activity_id     uuid not null references activities (id) on delete cascade,
  nama            text not null,
  bobot           numeric(6, 2) not null,
  rencana_mulai   date not null,
  rencana_selesai date not null,
  primary key (baseline_id, activity_id)
);

alter table projects
  add constraint projects_baseline_aktif_fk foreign key (baseline_aktif_id) references baselines (id);

-- =====================================================================
-- 5. Periode dan update mingguan (FR-30..36)
-- =====================================================================

create table report_periods (
  id            uuid primary key default gen_random_uuid(),
  tanggal_mulai date not null unique,      -- Senin
  tanggal_akhir date not null,             -- Jumat; tanggal acuan perhitungan progres
  batas_input   timestamptz not null,
  label         text not null,             -- 'M4 Oktober 2026'
  ditutup_at    timestamptz,
  check (tanggal_akhir >= tanggal_mulai)
);

create table project_updates (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects (id) on delete cascade,
  period_id         uuid not null references report_periods (id),
  sudah_dilakukan   text,
  rencana_berikut   text,
  -- Diisi sistem saat diajukan (FR-32); tidak dapat diketik PIC.
  progres_rencana   numeric(5, 2),
  progres_aktual    numeric(5, 2),
  spi               numeric(6, 3),
  status_kesehatan  health_status,
  -- Override hanya boleh memperburuk status (§8.2).
  status_override   health_status,
  alasan_override   text,
  status            update_status not null default 'draf',
  diajukan_oleh     uuid references profiles (id),
  diajukan_at       timestamptz,
  direview_oleh     uuid references profiles (id),
  direview_at       timestamptz,
  disetujui_oleh    uuid references profiles (id),
  disetujui_at      timestamptz,
  catatan_reviewer  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, period_id),
  check (status_override is null or length(trim(alasan_override)) > 0)
);
create index on project_updates (period_id, status);

-- Progres aktivitas yang dibekukan saat laporan disetujui (FR-34).
create table activity_snapshots (
  update_id      uuid not null references project_updates (id) on delete cascade,
  activity_id    uuid not null references activities (id) on delete cascade,
  progres        smallint not null,
  status         activity_status not null,
  aktual_mulai   date,
  aktual_selesai date,
  primary key (update_id, activity_id)
);

-- =====================================================================
-- 6. Masalah, risiko, aksi, dukungan (FR-40..52)
-- =====================================================================

-- project_id null = masalah tingkat unit (pengganti tabel "Current Issue").
create table issues (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects (id) on delete cascade,
  org_unit_id  uuid not null references org_units (id),
  jenis        issue_kind not null default 'masalah',
  judul        text not null,
  dampak       text,
  akar_masalah text,
  keparahan    severity_level not null default 'sedang',
  kemungkinan  smallint check (kemungkinan between 1 and 5),   -- hanya risiko
  skor_dampak  smallint check (skor_dampak between 1 and 5),   -- hanya risiko
  owner_id     uuid not null references profiles (id),
  status       issue_status not null default 'terbuka',
  ditutup_at   timestamptz,
  created_by   uuid references profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (jenis <> 'risiko' or (kemungkinan is not null and skor_dampak is not null))
);
create index on issues (project_id) where status = 'terbuka';
create index on issues (org_unit_id) where status = 'terbuka';

create table actions (
  id             uuid primary key default gen_random_uuid(),
  issue_id       uuid not null references issues (id) on delete cascade,
  deskripsi      text not null,
  owner_id       uuid not null references profiles (id),     -- FR-41: selalu orang
  tanggal_target date not null,
  status         action_status not null default 'terbuka',
  selesai_at     timestamptz,
  bukti          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on actions (issue_id);
create index on actions (owner_id) where status in ('terbuka', 'berjalan');

create table support_requests (
  id               uuid primary key default gen_random_uuid(),
  org_unit_id      uuid not null references org_units (id),
  project_id       uuid references projects (id) on delete set null,
  issue_id         uuid references issues (id) on delete set null,
  permintaan       text not null,
  dampak_bila_tidak text,
  ditujukan_ke     uuid not null references profiles (id),
  tenggat          date not null,
  status           support_status not null default 'diajukan',
  tanggapan        text,
  diajukan_oleh    uuid references profiles (id) default auth.uid(),
  diajukan_at      timestamptz not null default now(),
  ditanggapi_at    timestamptz,
  updated_at       timestamptz not null default now(),
  check (status in ('diajukan', 'diproses') or length(trim(tanggapan)) > 0)
);
create index on support_requests (ditujukan_ke) where status in ('diajukan', 'diproses');

-- =====================================================================
-- 7. Pekerjaan rutin (FR-15) — mis. LM Triwulanan, laporan MR bulanan ke Holding
-- =====================================================================

create table routine_tasks (
  id          uuid primary key default gen_random_uuid(),
  org_unit_id uuid not null references org_units (id),
  nama        text not null,
  frekuensi   routine_frequency not null,
  tujuan      text,                     -- 'Holding', 'Danantara', 'BPKP'
  pic_id      uuid not null references profiles (id),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table routine_occurrences (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references routine_tasks (id) on delete cascade,
  periode     text not null,            -- 'Agustus 2026', 'TW III 2026'
  jatuh_tempo date not null,
  dikirim_at  timestamptz,
  bukti       text,
  catatan     text,
  unique (routine_id, periode)
);

-- =====================================================================
-- 8. Lampiran dan audit (FR-26, FR-70)
-- =====================================================================

create table attachments (
  id            uuid primary key default gen_random_uuid(),
  entitas       text not null check (entitas in ('project', 'activity', 'issue', 'action', 'support_request', 'project_update')),
  entitas_id    uuid not null,
  storage_path  text not null,          -- path di bucket Supabase Storage 'lampiran'
  nama_file     text not null,
  ukuran_byte   bigint,
  diunggah_oleh uuid not null references profiles (id) default auth.uid(),
  created_at    timestamptz not null default now()
);
create index on attachments (entitas, entitas_id);

create table audit_log (
  id        bigint generated always as identity primary key,
  tabel     text not null,
  record_id uuid,
  aksi      text not null,
  data_lama jsonb,
  data_baru jsonb,
  pelaku    uuid,
  waktu     timestamptz not null default now()
);
create index on audit_log (tabel, record_id);

-- =====================================================================
-- 9. Fungsi otorisasi
-- =====================================================================

create function fn_pengguna_aktif() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif);
$$;

-- Benar bila pengguna memegang salah satu peran pada unit tersebut atau unit induknya.
create function fn_punya_peran(p_peran app_role[], p_unit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  with recursive induk as (
    select id, parent_id from org_units where id = p_unit
    union all
    select o.id, o.parent_id from org_units o join induk on o.id = induk.parent_id
  )
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any (p_peran)
      and (ur.org_unit_id is null or ur.org_unit_id in (select id from induk))
  );
$$;

create function fn_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin');
$$;

create function fn_sistem() returns boolean
language sql stable as $$
  select auth.uid() is null;
$$;

-- PIC proyek, atau admin/kabag/kasubag pada unit proyek.
create function fn_boleh_ubah_proyek(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select fn_sistem() or exists (
    select 1 from projects p
    where p.id = p_project
      and (p.pic_id = auth.uid() or fn_punya_peran('{admin,kabag,kasubag}', p.org_unit_id))
  );
$$;

-- =====================================================================
-- 10. Fungsi perhitungan (§8)
-- =====================================================================

-- Fraksi rencana sebuah aktivitas pada tanggal t: 0 sebelum mulai, 1 setelah selesai, linear di antaranya.
create function fn_fraksi_rencana(p_mulai date, p_selesai date, p_tanggal date) returns numeric
language sql immutable as $$
  select case
    when p_mulai is null or p_selesai is null then 0
    when p_tanggal < p_mulai then 0
    when p_tanggal >= p_selesai then 1
    else (p_tanggal - p_mulai + 1)::numeric / (p_selesai - p_mulai + 1)
  end;
$$;

-- % rencana dan % aktual proyek pada tanggal t, terhadap baseline aktif (§8.1).
-- Proyek tanpa baseline (draf) dihitung dari rencana kerja saat ini.
-- Aktivitas yang belum masuk baseline tidak dihitung sampai re-baseline disetujui.
create function fn_progres_proyek(p_project uuid, p_tanggal date default current_date)
returns table (progres_rencana numeric, progres_aktual numeric, jml_aktivitas int, tanggal_selesai_baseline date)
language sql stable security definer set search_path = public as $$
  with p as (select * from projects where id = p_project),
  rencana as (
    select ba.bobot, ba.rencana_mulai, ba.rencana_selesai, a.progres
    from p
    join baseline_activities ba on ba.baseline_id = p.baseline_aktif_id
    join activities a on a.id = ba.activity_id
    where a.status <> 'dibatalkan'
    union all
    select a.bobot, a.rencana_mulai, a.rencana_selesai, a.progres
    from p
    join activities a on a.project_id = p.id
    where p.baseline_aktif_id is null and a.status <> 'dibatalkan'
  )
  select
    round(100 * sum(bobot * fn_fraksi_rencana(rencana_mulai, rencana_selesai, p_tanggal)) / nullif(sum(bobot), 0), 2),
    round(sum(bobot * progres) / nullif(sum(bobot), 0), 2),
    count(*)::int,
    coalesce(
      (select b.tanggal_selesai from p join baselines b on b.id = p.baseline_aktif_id),
      (select tanggal_selesai from p)
    )
  from rencana;
$$;

-- Status kesehatan proyek (§8.2). Null untuk proyek draf, ditunda, dibatalkan.
create function fn_kesehatan(
  p_status project_status,
  p_rencana numeric,
  p_aktual numeric,
  p_selesai_baseline date,
  p_jml_aktivitas int,
  p_tanggal date
) returns health_status
language sql immutable as $$
  select (case
    when p_status = 'selesai' then 'selesai'
    when p_status <> 'aktif' then null
    when coalesce(p_jml_aktivitas, 0) = 0 or p_selesai_baseline is null then 'data_belum_lengkap'
    when p_tanggal > p_selesai_baseline then 'kritis'
    when coalesce(p_rencana, 0) = 0 and coalesce(p_aktual, 0) = 0 then 'belum_mulai'
    when p_rencana < 10 then
      case
        when p_rencana - p_aktual <= 5 then 'sesuai'
        when p_rencana - p_aktual <= 10 then 'waspada'
        else 'terlambat'
      end
    when p_aktual / p_rencana >= 0.95 then 'sesuai'
    when p_aktual / p_rencana >= 0.85 then 'waspada'
    when p_aktual / p_rencana >= 0.70 then 'terlambat'
    else 'kritis'
  end)::health_status;
$$;

create function fn_peringkat_kesehatan(p health_status) returns int
language sql immutable as $$
  select array_position(enum_range(null::health_status), p);
$$;

create function fn_lebih_buruk(a health_status, b health_status) returns health_status
language sql immutable as $$
  select case
    when a is null then b
    when b is null then a
    when fn_peringkat_kesehatan(a) >= fn_peringkat_kesehatan(b) then a
    else b
  end;
$$;

-- =====================================================================
-- 11. Periode laporan
-- =====================================================================

create function fn_label_periode(p_jumat date) returns text
language sql immutable as $$
  select 'M' || ceil(extract(day from p_jumat) / 7.0)::int || ' '
    || (array['Januari','Februari','Maret','April','Mei','Juni','Juli',
              'Agustus','September','Oktober','November','Desember'])[extract(month from p_jumat)::int]
    || ' ' || extract(year from p_jumat)::int;
$$;

-- Membuka periode untuk minggu yang memuat p_tanggal. Idempoten.
-- Jadwalkan dengan pg_cron: select cron.schedule('buka-periode', '0 0 * * 1', 'select fn_buka_periode()');
create function fn_buka_periode(p_tanggal date default current_date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_senin date := date_trunc('week', p_tanggal)::date;
  v_id uuid;
begin
  insert into report_periods (tanggal_mulai, tanggal_akhir, batas_input, label)
  values (
    v_senin,
    v_senin + 4,
    ((v_senin + 3) + time '17:00') at time zone 'Asia/Jakarta',
    fn_label_periode(v_senin + 4)
  )
  on conflict (tanggal_mulai) do nothing;

  select id into v_id from report_periods where tanggal_mulai = v_senin;
  return v_id;
end;
$$;

-- =====================================================================
-- 12. Baseline (FR-23, FR-24)
-- =====================================================================

create function fn_salin_baseline(p_project uuid, p_alasan text, p_status baseline_status)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_project projects;
  v_id uuid;
begin
  select * into v_project from projects where id = p_project;

  if exists (
    select 1 from activities
    where project_id = p_project and status <> 'dibatalkan'
      and (rencana_mulai is null or rencana_selesai is null)
  ) then
    raise exception 'Semua aktivitas harus memiliki tanggal rencana mulai dan selesai sebelum baseline dibuat.';
  end if;

  insert into baselines (project_id, versi, tanggal_selesai, alasan, status, diajukan_oleh,
                         diputuskan_oleh, diputuskan_at)
  values (
    p_project,
    coalesce((select max(versi) from baselines where project_id = p_project), 0) + 1,
    v_project.tanggal_selesai,
    p_alasan,
    p_status,
    auth.uid(),
    case when p_status = 'disetujui' then auth.uid() end,
    case when p_status = 'disetujui' then now() end
  )
  returning id into v_id;

  insert into baseline_activities (baseline_id, activity_id, nama, bobot, rencana_mulai, rencana_selesai)
  select v_id, id, nama, bobot, rencana_mulai, rencana_selesai
  from activities
  where project_id = p_project and status <> 'dibatalkan';

  return v_id;
end;
$$;

-- Dipanggil PIC/Kasubag dari aplikasi: menyalin rencana kerja saat ini sebagai usulan baseline baru.
create function fn_ajukan_baseline(p_project uuid, p_alasan text) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not fn_boleh_ubah_proyek(p_project) then
    raise exception 'Anda tidak berwenang mengajukan baseline untuk proyek ini.';
  end if;
  if coalesce(length(trim(p_alasan)), 0) < 20 then
    raise exception 'Alasan re-baseline wajib diisi (minimal 20 karakter).';
  end if;
  if exists (select 1 from baselines where project_id = p_project and status = 'diajukan') then
    raise exception 'Masih ada pengajuan baseline yang belum diputuskan.';
  end if;
  return fn_salin_baseline(p_project, p_alasan, 'diajukan');
end;
$$;

-- Dipanggil Kabag/Admin untuk menyetujui atau menolak re-baseline.
create function fn_putuskan_baseline(p_baseline uuid, p_setuju boolean, p_catatan text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_baseline baselines;
  v_unit uuid;
begin
  select * into v_baseline from baselines where id = p_baseline for update;
  select org_unit_id into v_unit from projects where id = v_baseline.project_id;

  if not (fn_sistem() or fn_punya_peran('{admin,kabag}', v_unit)) then
    raise exception 'Hanya Kabag atau Admin yang dapat memutuskan baseline.';
  end if;
  if v_baseline.status <> 'diajukan' then
    raise exception 'Baseline ini sudah diputuskan.';
  end if;

  update baselines
  set status = case when p_setuju then 'disetujui' else 'ditolak' end::baseline_status,
      diputuskan_oleh = auth.uid(),
      diputuskan_at = now(),
      catatan_keputusan = p_catatan
  where id = p_baseline;

  if p_setuju then
    perform set_config('app.ubah_baseline', 'on', true);
    update projects set baseline_aktif_id = p_baseline where id = v_baseline.project_id;
    perform set_config('app.ubah_baseline', 'off', true);
  end if;
end;
$$;

-- =====================================================================
-- 13. Trigger aturan bisnis
-- =====================================================================

create function trg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Proyek: transisi status dan perlindungan baseline (FR-12, §8.4 butir 5).
create function trg_projects_aturan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.baseline_aktif_id is distinct from old.baseline_aktif_id
     and current_setting('app.ubah_baseline', true) is distinct from 'on' then
    raise exception 'Baseline aktif hanya dapat diganti melalui persetujuan re-baseline.';
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'aktif' then
        if not (fn_sistem() or fn_punya_peran('{admin,kabag,kasubag}', new.org_unit_id)) then
          raise exception 'Hanya Kasubag, Kabag, atau Admin yang dapat mengaktifkan proyek.';
        end if;
        if new.tanggal_mulai is null or new.tanggal_selesai is null then
          raise exception 'Proyek harus memiliki tanggal mulai dan selesai sebelum diaktifkan.';
        end if;
        if not exists (select 1 from activities where project_id = new.id and status <> 'dibatalkan') then
          raise exception 'Proyek harus memiliki minimal satu aktivitas sebelum diaktifkan.';
        end if;
      when 'selesai' then
        if not (fn_sistem() or fn_punya_peran('{admin,kabag}', new.org_unit_id)) then
          raise exception 'Hanya Kabag atau Admin yang dapat menutup proyek.';
        end if;
        if exists (
          select 1 from activities
          where project_id = new.id and status not in ('selesai', 'dibatalkan')
        ) then
          raise exception 'Proyek tidak dapat ditandai Selesai: masih ada aktivitas yang belum selesai.';
        end if;
        new.tanggal_selesai_aktual := coalesce(new.tanggal_selesai_aktual, current_date);
      when 'ditunda', 'dibatalkan' then
        if not (fn_sistem() or fn_punya_peran('{admin,kabag}', new.org_unit_id)) then
          raise exception 'Hanya Kabag atau Admin yang dapat menunda atau membatalkan proyek.';
        end if;
      when 'draf' then
        raise exception 'Proyek yang sudah berjalan tidak dapat dikembalikan ke Draf.';
    end case;
  end if;

  return new;
end;
$$;

create trigger projects_aturan before update on projects
  for each row execute function trg_projects_aturan();

-- Baseline v1 dibuat otomatis saat proyek pertama kali diaktifkan (FR-23).
create function trg_projects_baseline_awal() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if new.status = 'aktif' and old.status = 'draf' and new.baseline_aktif_id is null then
    v_id := fn_salin_baseline(new.id, 'Baseline awal saat proyek diaktifkan', 'disetujui');
    perform set_config('app.ubah_baseline', 'on', true);
    update projects set baseline_aktif_id = v_id where id = new.id;
    perform set_config('app.ubah_baseline', 'off', true);
  end if;
  return null;
end;
$$;

create trigger projects_baseline_awal after update of status on projects
  for each row execute function trg_projects_baseline_awal();

-- Aktivitas: konsistensi progres/status (FR-22).
create function trg_activities_aturan() returns trigger
language plpgsql as $$
declare
  v_status_proyek project_status;
begin
  select status into v_status_proyek from projects where id = new.project_id;
  if v_status_proyek in ('selesai', 'dibatalkan') then
    raise exception 'Aktivitas pada proyek yang sudah Selesai/Dibatalkan tidak dapat diubah.';
  end if;

  if new.status = 'selesai' then
    new.progres := 100;
    if new.aktual_selesai is null then
      raise exception 'Isi tanggal aktual selesai untuk aktivitas "%".', new.nama;
    end if;
  elsif new.progres = 100 then
    raise exception 'Progres 100%% hanya dapat dicapai dengan menandai aktivitas "%" Selesai.', new.nama;
  end if;

  if new.status = 'belum_mulai' and new.progres > 0 then
    new.status := 'berjalan';
  end if;
  if new.status in ('berjalan', 'selesai') and new.aktual_mulai is null then
    new.aktual_mulai := coalesce(new.aktual_selesai, current_date);
  end if;

  return new;
end;
$$;

create trigger activities_aturan before insert or update on activities
  for each row execute function trg_activities_aturan();

-- Update mingguan: alur persetujuan, validasi, dan perhitungan (FR-32, FR-33, §8.4).
create function trg_project_updates_alur() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_project projects;
  v_periode report_periods;
  v_hitung record;
  v_akhir health_status;
begin
  select * into v_project from projects where id = new.project_id;

  if tg_op = 'INSERT' then
    if new.status <> 'draf' then
      raise exception 'Update baru harus berstatus Draf.';
    end if;
    if v_project.status <> 'aktif' then
      raise exception 'Update mingguan hanya untuk proyek berstatus Aktif.';
    end if;
    return new;
  end if;

  if old.status in ('disetujui', 'terkunci')
     and not (old.status = 'disetujui' and new.status = 'terkunci') then
    raise exception 'Laporan yang sudah disetujui tidak dapat diubah. Catat koreksi di periode berikutnya.';
  end if;

  if new.status is not distinct from old.status then
    if old.status in ('diajukan', 'direview')
       and (new.sudah_dilakukan, new.rencana_berikut, new.status_override, new.alasan_override)
           is distinct from (old.sudah_dilakukan, old.rencana_berikut, old.status_override, old.alasan_override) then
      raise exception 'Laporan sedang direview. Minta reviewer mengembalikannya untuk mengubah isi.';
    end if;
    if new.status_override is not null and new.status_kesehatan is not null
       and fn_lebih_buruk(new.status_override, new.status_kesehatan) <> new.status_override then
      raise exception 'Override hanya boleh memperburuk status, bukan memperbaikinya.';
    end if;
    return new;
  end if;

  case new.status
    when 'diajukan' then
      if old.status not in ('draf', 'dikembalikan') then
        raise exception 'Hanya laporan Draf atau Dikembalikan yang dapat diajukan.';
      end if;
      if not fn_boleh_ubah_proyek(new.project_id) then
        raise exception 'Anda tidak berwenang mengajukan update proyek ini.';
      end if;
      if coalesce(length(trim(new.sudah_dilakukan)), 0) < 20
         or coalesce(length(trim(new.rencana_berikut)), 0) < 20 then
        raise exception 'Isi "Yang telah dilakukan" dan "Rencana minggu depan" (masing-masing minimal 20 karakter).';
      end if;
      if exists (
        select 1 from project_updates u
        where u.period_id = new.period_id and u.project_id <> new.project_id
          and (lower(trim(u.sudah_dilakukan)) = lower(trim(new.sudah_dilakukan))
               or lower(trim(u.rencana_berikut)) = lower(trim(new.rencana_berikut)))
      ) then
        raise exception 'Isian sama persis dengan update proyek lain pada periode ini. Tulis update khusus untuk proyek ini.';
      end if;

      select * into v_periode from report_periods where id = new.period_id;
      select * into v_hitung from fn_progres_proyek(new.project_id, v_periode.tanggal_akhir);

      new.progres_rencana := v_hitung.progres_rencana;
      new.progres_aktual := v_hitung.progres_aktual;
      new.spi := case when v_hitung.progres_rencana > 0
                      then round(v_hitung.progres_aktual / v_hitung.progres_rencana, 3) end;
      new.status_kesehatan := fn_kesehatan(v_project.status, v_hitung.progres_rencana, v_hitung.progres_aktual,
                                           v_hitung.tanggal_selesai_baseline, v_hitung.jml_aktivitas,
                                           v_periode.tanggal_akhir);

      if new.status_override is not null
         and fn_lebih_buruk(new.status_override, new.status_kesehatan) <> new.status_override then
        raise exception 'Override hanya boleh memperburuk status, bukan memperbaikinya.';
      end if;

      v_akhir := fn_lebih_buruk(new.status_kesehatan, new.status_override);
      if v_akhir in ('terlambat', 'kritis') and not exists (
        select 1 from issues i join actions a on a.issue_id = i.id
        where i.project_id = new.project_id and i.status = 'terbuka' and a.status <> 'dibatalkan'
      ) then
        raise exception 'Status proyek %: catat minimal satu Masalah terbuka beserta Aksi korektif (PICA) sebelum mengajukan.', v_akhir;
      end if;

      new.diajukan_oleh := auth.uid();
      new.diajukan_at := now();

    when 'direview', 'dikembalikan' then
      if old.status not in ('diajukan', 'direview') then
        raise exception 'Laporan belum diajukan.';
      end if;
      if not (fn_sistem() or fn_punya_peran('{admin,kabag,kasubag}', v_project.org_unit_id)) then
        raise exception 'Hanya Kasubag, Kabag, atau Admin yang dapat mereview laporan.';
      end if;
      if new.status = 'dikembalikan' and coalesce(length(trim(new.catatan_reviewer)), 0) = 0 then
        raise exception 'Tulis catatan saat mengembalikan laporan.';
      end if;
      new.direview_oleh := auth.uid();
      new.direview_at := now();

    when 'disetujui' then
      if old.status not in ('diajukan', 'direview') then
        raise exception 'Laporan belum diajukan.';
      end if;
      if not (fn_sistem() or fn_punya_peran('{admin,kabag}', v_project.org_unit_id)) then
        raise exception 'Hanya Kabag atau Admin yang dapat menyetujui laporan.';
      end if;
      new.disetujui_oleh := auth.uid();
      new.disetujui_at := now();

    when 'terkunci' then
      if not (fn_sistem() or fn_admin()) then
        raise exception 'Laporan dikunci oleh sistem saat periode ditutup.';
      end if;

    when 'draf' then
      raise exception 'Gunakan status Dikembalikan untuk membuka kembali laporan.';
  end case;

  return new;
end;
$$;

create trigger project_updates_alur before insert or update on project_updates
  for each row execute function trg_project_updates_alur();

-- Bekukan progres aktivitas saat laporan disetujui (FR-34).
create function trg_project_updates_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'disetujui' and old.status <> 'disetujui' then
    insert into activity_snapshots (update_id, activity_id, progres, status, aktual_mulai, aktual_selesai)
    select new.id, a.id, a.progres, a.status, a.aktual_mulai, a.aktual_selesai
    from activities a where a.project_id = new.project_id
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger project_updates_snapshot after update of status on project_updates
  for each row execute function trg_project_updates_snapshot();

-- Menutup periode: kunci semua laporan disetujui. Jadwalkan Senin pagi untuk periode minggu lalu.
create function fn_tutup_periode(p_period uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (fn_sistem() or fn_admin()) then
    raise exception 'Hanya sistem atau Admin yang dapat menutup periode.';
  end if;
  update project_updates set status = 'terkunci' where period_id = p_period and status = 'disetujui';
  update report_periods set ditutup_at = now() where id = p_period;
end;
$$;

create function trg_issues_aturan() returns trigger
language plpgsql as $$
begin
  if new.project_id is not null then
    new.org_unit_id := (select org_unit_id from projects where id = new.project_id);
  end if;
  if new.status = 'ditutup' and old.status is distinct from 'ditutup' then
    new.ditutup_at := now();
  end if;
  return new;
end;
$$;

create trigger issues_aturan before insert or update on issues
  for each row execute function trg_issues_aturan();

create function trg_actions_aturan() returns trigger
language plpgsql as $$
begin
  if new.status = 'selesai' and old.status is distinct from 'selesai' then
    new.selesai_at := now();
  end if;
  return new;
end;
$$;

create trigger actions_aturan before insert or update on actions
  for each row execute function trg_actions_aturan();

create function trg_support_aturan() returns trigger
language plpgsql as $$
begin
  if new.status in ('dipenuhi', 'ditolak') and old.status in ('diajukan', 'diproses') then
    new.ditanggapi_at := now();
  end if;
  return new;
end;
$$;

create trigger support_aturan before update on support_requests
  for each row execute function trg_support_aturan();

-- updated_at
create trigger set_updated_at before update on profiles for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on projects for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on activities for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on project_updates for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on issues for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on actions for each row execute function trg_set_updated_at();
create trigger set_updated_at before update on support_requests for each row execute function trg_set_updated_at();

-- Audit trail (FR-70)
create function trg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (tabel, record_id, aksi, data_lama, data_baru, pelaku)
  values (
    tg_table_name,
    (coalesce(to_jsonb(new), to_jsonb(old)) ->> 'id')::uuid,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

create trigger audit after insert or update or delete on projects for each row execute function trg_audit();
create trigger audit after insert or update or delete on activities for each row execute function trg_audit();
create trigger audit after insert or update or delete on baselines for each row execute function trg_audit();
create trigger audit after insert or update or delete on project_updates for each row execute function trg_audit();
create trigger audit after insert or update or delete on issues for each row execute function trg_audit();
create trigger audit after insert or update or delete on actions for each row execute function trg_audit();
create trigger audit after insert or update or delete on support_requests for each row execute function trg_audit();
create trigger audit after insert or update or delete on user_roles for each row execute function trg_audit();

-- =====================================================================
-- 14. View untuk dasbor (FR-60)
-- =====================================================================

-- Kondisi terkini setiap proyek, dihitung pada hari ini.
create view v_proyek_kesehatan with (security_invoker = true) as
select
  p.id,
  p.kode,
  p.nama,
  p.status,
  p.org_unit_id,
  u.kode as unit_kode,
  u.nama as unit_nama,
  p.pic_id,
  pic.nama as pic_nama,
  p.tanggal_mulai,
  p.tanggal_selesai,
  h.tanggal_selesai_baseline,
  b.versi as versi_baseline,
  h.progres_rencana,
  h.progres_aktual,
  case when h.progres_rencana > 0 then round(h.progres_aktual / h.progres_rencana, 3) end as spi,
  fn_lebih_buruk(
    fn_kesehatan(p.status, h.progres_rencana, h.progres_aktual, h.tanggal_selesai_baseline, h.jml_aktivitas, current_date),
    lu.status_override
  ) as status_kesehatan,
  lu.status_override is not null as ada_override,
  lu.periode_label as update_terakhir,
  lu.status as status_update_terakhir,
  (select count(*) from issues i where i.project_id = p.id and i.status = 'terbuka') as masalah_terbuka,
  (select count(*) from actions a join issues i on i.id = a.issue_id
    where i.project_id = p.id and a.status in ('terbuka', 'berjalan') and a.tanggal_target < current_date) as aksi_terlambat,
  (select count(*) from support_requests s
    where s.project_id = p.id and s.status in ('diajukan', 'diproses')) as dukungan_menunggu,
  (select count(*) from project_dependencies d join projects dp on dp.id = d.depends_on_id
    where d.project_id = p.id and dp.status not in ('selesai', 'dibatalkan')) as ketergantungan_terbuka
from projects p
join org_units u on u.id = p.org_unit_id
join profiles pic on pic.id = p.pic_id
left join baselines b on b.id = p.baseline_aktif_id
cross join lateral fn_progres_proyek(p.id, current_date) h
left join lateral (
  select pu.status_override, pu.status, rp.label as periode_label
  from project_updates pu join report_periods rp on rp.id = pu.period_id
  where pu.project_id = p.id
  order by rp.tanggal_mulai desc
  limit 1
) lu on true;

-- Kepatuhan update per periode (metrik §3).
create view v_kepatuhan_update with (security_invoker = true) as
select
  rp.id as period_id,
  rp.label,
  p.org_unit_id,
  count(*) as proyek_aktif,
  count(*) filter (where pu.status in ('diajukan', 'direview', 'disetujui', 'terkunci')
                     and pu.diajukan_at <= rp.batas_input) as tepat_waktu,
  count(*) filter (where pu.id is null or pu.status in ('draf', 'dikembalikan')) as belum_diajukan
from report_periods rp
join projects p on p.status = 'aktif'
  and (p.tanggal_mulai is null or p.tanggal_mulai <= rp.tanggal_akhir)
left join project_updates pu on pu.project_id = p.id and pu.period_id = rp.id
group by rp.id, rp.label, p.org_unit_id;

-- Daftar "Perlu keputusan Anda" (FR-52).
create view v_dukungan_terbuka with (security_invoker = true) as
select
  s.*,
  pr.kode as proyek_kode,
  pr.nama as proyek_nama,
  ke.nama as ditujukan_nama,
  dari.nama as diajukan_nama,
  s.tenggat < current_date as lewat_tenggat
from support_requests s
left join projects pr on pr.id = s.project_id
join profiles ke on ke.id = s.ditujukan_ke
left join profiles dari on dari.id = s.diajukan_oleh
where s.status in ('diajukan', 'diproses');

-- =====================================================================
-- 15. Row Level Security (PRD §9.3)
-- =====================================================================

alter table org_units            enable row level security;
alter table profiles             enable row level security;
alter table user_roles           enable row level security;
alter table strategic_objectives enable row level security;
alter table projects             enable row level security;
alter table project_objectives   enable row level security;
alter table project_dependencies enable row level security;
alter table activities           enable row level security;
alter table baselines            enable row level security;
alter table baseline_activities  enable row level security;
alter table report_periods       enable row level security;
alter table project_updates      enable row level security;
alter table activity_snapshots   enable row level security;
alter table issues               enable row level security;
alter table actions              enable row level security;
alter table support_requests     enable row level security;
alter table routine_tasks        enable row level security;
alter table routine_occurrences  enable row level security;
alter table attachments          enable row level security;
alter table audit_log            enable row level security;

-- Baca: semua pengguna aktif (transparansi internal, PRD §13 butir 1).
do $$
declare t text;
begin
  foreach t in array array[
    'org_units', 'profiles', 'user_roles', 'strategic_objectives', 'projects', 'project_objectives',
    'project_dependencies', 'activities', 'baselines', 'baseline_activities', 'report_periods',
    'project_updates', 'activity_snapshots', 'issues', 'actions', 'support_requests',
    'routine_tasks', 'routine_occurrences', 'attachments'
  ] loop
    execute format('create policy baca on %I for select to authenticated using (fn_pengguna_aktif())', t);
  end loop;
end;
$$;

-- Master data: hanya Admin.
do $$
declare t text;
begin
  foreach t in array array['org_units', 'profiles', 'user_roles', 'strategic_objectives', 'report_periods'] loop
    execute format('create policy admin_tulis on %I for all to authenticated using (fn_admin()) with check (fn_admin())', t);
  end loop;
end;
$$;

create policy audit_baca on audit_log for select to authenticated
  using (fn_admin() or exists (select 1 from user_roles where user_id = auth.uid() and role in ('kabag', 'direksi')));

-- Proyek
create policy tambah on projects for insert to authenticated
  with check (fn_punya_peran('{admin,kabag,kasubag}', org_unit_id) and status = 'draf');
create policy ubah on projects for update to authenticated
  using (fn_boleh_ubah_proyek(id))
  with check (fn_boleh_ubah_proyek(id));
create policy hapus on projects for delete to authenticated
  using (status = 'draf' and fn_punya_peran('{admin,kabag,kasubag}', org_unit_id));

create policy kelola on project_objectives for all to authenticated
  using (fn_boleh_ubah_proyek(project_id)) with check (fn_boleh_ubah_proyek(project_id));
create policy kelola on project_dependencies for all to authenticated
  using (fn_boleh_ubah_proyek(project_id)) with check (fn_boleh_ubah_proyek(project_id));

-- Aktivitas: pengelola proyek, atau anggota pada aktivitas yang ditugaskan kepadanya.
create policy tambah on activities for insert to authenticated
  with check (fn_boleh_ubah_proyek(project_id));
create policy ubah on activities for update to authenticated
  using (fn_boleh_ubah_proyek(project_id) or pic_id = auth.uid())
  with check (fn_boleh_ubah_proyek(project_id) or pic_id = auth.uid());
create policy hapus on activities for delete to authenticated
  using (fn_boleh_ubah_proyek(project_id));

-- Baseline dibuat dan diputuskan lewat fn_ajukan_baseline / fn_putuskan_baseline (security definer).

-- Update mingguan: aturan alur ada di trigger.
create policy tambah on project_updates for insert to authenticated
  with check (fn_boleh_ubah_proyek(project_id));
create policy ubah on project_updates for update to authenticated
  using (fn_boleh_ubah_proyek(project_id)) with check (fn_boleh_ubah_proyek(project_id));

-- Masalah dan aksi
create policy tambah on issues for insert to authenticated
  with check (
    case when project_id is not null then fn_boleh_ubah_proyek(project_id)
         else fn_punya_peran('{admin,kabag,kasubag,pic}', org_unit_id) end
  );
create policy ubah on issues for update to authenticated
  using (
    owner_id = auth.uid()
    or case when project_id is not null then fn_boleh_ubah_proyek(project_id)
            else fn_punya_peran('{admin,kabag,kasubag}', org_unit_id) end
  );

create policy tambah on actions for insert to authenticated
  with check (exists (
    select 1 from issues i where i.id = issue_id
      and (i.owner_id = auth.uid()
           or case when i.project_id is not null then fn_boleh_ubah_proyek(i.project_id)
                   else fn_punya_peran('{admin,kabag,kasubag}', i.org_unit_id) end)
  ));
create policy ubah on actions for update to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from issues i where i.id = issue_id
      and (i.owner_id = auth.uid()
           or case when i.project_id is not null then fn_boleh_ubah_proyek(i.project_id)
                   else fn_punya_peran('{admin,kabag,kasubag}', i.org_unit_id) end)
  ));

-- Dukungan: diajukan oleh pengelola unit/proyek, ditanggapi oleh penerima.
create policy tambah on support_requests for insert to authenticated
  with check (
    diajukan_oleh = auth.uid()
    and (fn_punya_peran('{admin,kabag,kasubag,pic}', org_unit_id)
         or (project_id is not null and fn_boleh_ubah_proyek(project_id)))
  );
create policy ubah on support_requests for update to authenticated
  using (diajukan_oleh = auth.uid() or ditujukan_ke = auth.uid() or fn_admin());

-- Pekerjaan rutin
create policy kelola on routine_tasks for all to authenticated
  using (fn_punya_peran('{admin,kabag,kasubag}', org_unit_id))
  with check (fn_punya_peran('{admin,kabag,kasubag}', org_unit_id));
create policy kelola on routine_occurrences for all to authenticated
  using (exists (select 1 from routine_tasks r where r.id = routine_id
                 and (r.pic_id = auth.uid() or fn_punya_peran('{admin,kabag,kasubag}', r.org_unit_id))))
  with check (exists (select 1 from routine_tasks r where r.id = routine_id
                      and (r.pic_id = auth.uid() or fn_punya_peran('{admin,kabag,kasubag}', r.org_unit_id))));

-- Lampiran
create policy tambah on attachments for insert to authenticated
  with check (diunggah_oleh = auth.uid() and fn_pengguna_aktif());
create policy hapus on attachments for delete to authenticated
  using (diunggah_oleh = auth.uid() or fn_admin());

-- Fungsi yang dipanggil dari aplikasi
grant execute on function fn_ajukan_baseline(uuid, text) to authenticated;
grant execute on function fn_putuskan_baseline(uuid, boolean, text) to authenticated;
grant execute on function fn_progres_proyek(uuid, date) to authenticated;
-- Fungsi internal: hanya trigger, service role, dan pg_cron.
revoke execute on function fn_salin_baseline(uuid, text, baseline_status) from public, anon, authenticated;
revoke execute on function fn_tutup_periode(uuid) from public, anon, authenticated;
revoke execute on function fn_buka_periode(date) from public, anon, authenticated;
