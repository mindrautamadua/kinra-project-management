-- Master PIC dan PIC proyek lebih dari satu orang. Sponsor dan PIC aktivitas dialihkan di 20261027080000.
-- PIC tidak harus punya akun aplikasi; bila ditautkan ke profil (profile_id), orang tersebut boleh mengubah proyeknya.
-- projects.pic_id dipertahankan untuk kompatibilitas dan diisi otomatis dari PIC utama yang punya akun.

create table pics (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (length(trim(nama)) > 0),
  jabatan     text,
  org_unit_id uuid references org_units (id),
  email       text,
  profile_id  uuid unique references profiles (id) on delete set null,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index on pics (lower(trim(nama)));

create table project_pics (
  project_id uuid not null references projects (id) on delete cascade,
  pic_id     uuid not null references pics (id),
  utama      boolean not null default false,
  primary key (project_id, pic_id)
);
create unique index on project_pics (project_id) where utama;
create index on project_pics (pic_id);

create trigger set_updated_at before update on pics for each row execute function trg_set_updated_at();
create trigger audit after insert or update or delete on pics for each row execute function trg_audit();
create trigger audit after insert or update or delete on project_pics for each row execute function trg_audit();

-- Data awal: setiap profil yang pernah menjadi PIC proyek masuk master, lalu relasinya dipindah.
insert into pics (nama, jabatan, org_unit_id, email, profile_id)
select pr.nama, pr.jabatan, pr.org_unit_id, pr.email, pr.id
from profiles pr
where exists (select 1 from projects p where p.pic_id = pr.id);

insert into project_pics (project_id, pic_id, utama)
select p.id, x.id, true
from projects p join pics x on x.profile_id = p.pic_id;

alter table projects alter column pic_id drop not null;

-- PIC proyek (lewat akun yang ditautkan) atau admin/kabag/kasubag pada unit proyek.
create or replace function fn_boleh_ubah_proyek(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select fn_sistem() or exists (
    select 1 from projects p
    where p.id = p_project
      and (p.pic_id = auth.uid()
           or fn_punya_peran('{admin,kabag,kasubag}', p.org_unit_id)
           or exists (select 1 from project_pics pp join pics x on x.id = pp.pic_id
                      where pp.project_id = p.id and x.profile_id = auth.uid()))
  );
$$;

-- Nama PIC di view menjadi gabungan semua PIC proyek, PIC utama di depan.
create or replace view v_proyek_kesehatan with (security_invoker = true) as
select
  p.id,
  p.kode,
  p.nama,
  p.status,
  p.org_unit_id,
  u.kode as unit_kode,
  u.nama as unit_nama,
  p.pic_id,
  coalesce(
    (select string_agg(x.nama, ', ' order by pp.utama desc, x.nama)
     from project_pics pp join pics x on x.id = pp.pic_id where pp.project_id = p.id),
    pic.nama, '–') as pic_nama,
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
left join profiles pic on pic.id = p.pic_id
left join baselines b on b.id = p.baseline_aktif_id
cross join lateral fn_progres_proyek(p.id, current_date) h
left join lateral (
  select pu.status_override, pu.status, rp.label as periode_label
  from project_updates pu join report_periods rp on rp.id = pu.period_id
  where pu.project_id = p.id
  order by rp.tanggal_mulai desc
  limit 1
) lu on true;

-- RLS: semua pengguna aktif dapat membaca. Master dikelola admin/kabag/kasubag; PIC proyek dikelola pengubah proyek.
alter table pics enable row level security;
alter table project_pics enable row level security;
create policy baca on pics for select to authenticated using (fn_pengguna_aktif());
create policy baca on project_pics for select to authenticated using (fn_pengguna_aktif());
create function fn_kelola_master_pic() returns boolean
language sql stable security definer set search_path = public as $$
  select fn_sistem() or exists (
    select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'kabag', 'kasubag')
  );
$$;
grant execute on function fn_kelola_master_pic() to authenticated;

create policy kelola on pics for all to authenticated
  using (fn_kelola_master_pic()) with check (fn_kelola_master_pic());
create policy kelola on project_pics for all to authenticated
  using (fn_boleh_ubah_proyek(project_id)) with check (fn_boleh_ubah_proyek(project_id));

grant select, insert, update, delete on pics, project_pics to authenticated;
