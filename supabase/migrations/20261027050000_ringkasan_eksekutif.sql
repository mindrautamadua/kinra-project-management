-- Ringkasan eksekutif untuk Direktur: snapshot status mingguan (untuk tren), catatan Kabag per periode,
-- penanda milestone pada aktivitas, dan jenis permintaan (dukungan / keputusan).

-- Status setiap proyek per periode. Diperbarui selama periode berjalan; berhenti berubah setelah periode ditutup.
-- Perbandingan dengan periode sebelumnya menghasilkan tren ▲▼ di ringkasan.
create table portfolio_snapshots (
  period_id        uuid not null references report_periods (id) on delete cascade,
  project_id       uuid not null references projects (id) on delete cascade,
  project_status   project_status not null,
  status_kesehatan health_status,
  progres_rencana  numeric(5, 2),
  progres_aktual   numeric(5, 2),
  spi              numeric(6, 3),
  diambil_at       timestamptz not null default now(),
  primary key (period_id, project_id)
);

alter table portfolio_snapshots enable row level security;
create policy baca on portfolio_snapshots for select to authenticated using (fn_pengguna_aktif());
grant select on portfolio_snapshots to authenticated;

create function fn_snapshot_portofolio() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_period uuid;
  v_jumlah integer;
begin
  if not (fn_sistem() or fn_pengguna_aktif()) then
    raise exception 'Akun belum aktif.';
  end if;
  v_period := fn_buka_periode(current_date);
  if exists (select 1 from report_periods where id = v_period and ditutup_at is not null) then
    return 0;
  end if;

  insert into portfolio_snapshots (period_id, project_id, project_status, status_kesehatan, progres_rencana, progres_aktual, spi, diambil_at)
  select v_period, id, status, status_kesehatan, progres_rencana, progres_aktual, spi, now()
  from v_proyek_kesehatan
  where status in ('aktif', 'ditunda', 'selesai')
  on conflict (period_id, project_id) do update
    set project_status = excluded.project_status, status_kesehatan = excluded.status_kesehatan,
        progres_rencana = excluded.progres_rencana, progres_aktual = excluded.progres_aktual,
        spi = excluded.spi, diambil_at = excluded.diambil_at;
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

grant execute on function fn_snapshot_portofolio() to authenticated;

-- Catatan Kabag untuk Direktur, satu per periode (maks. 3 butir, satu per baris).
alter table report_periods add column catatan_kabag text;

create function fn_simpan_catatan_kabag(p_period uuid, p_catatan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role in ('kabag', 'admin')) then
    raise exception 'Hanya Kabag atau Admin yang dapat menulis catatan untuk Direktur.';
  end if;
  update report_periods set catatan_kabag = nullif(trim(p_catatan), '') where id = p_period;
end;
$$;

grant execute on function fn_simpan_catatan_kabag(uuid, text) to authenticated;

-- Milestone: aktivitas penting yang ditonjolkan di bagian "4 minggu ke depan".
alter table activities add column milestone boolean not null default false;

-- Jenis permintaan: "keputusan" tampil terpisah di ringkasan Direktur.
alter table support_requests add column jenis text not null default 'dukungan' check (jenis in ('dukungan', 'keputusan'));

-- View v_dukungan_terbuka memakai s.*; bangun ulang agar memuat kolom baru (kolom baru di tengah, jadi drop + create).
drop view v_dukungan_terbuka;
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

grant select on v_dukungan_terbuka to authenticated;
