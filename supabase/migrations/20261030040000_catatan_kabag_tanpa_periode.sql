-- Laporan tidak lagi per minggu: catatan Kabag untuk Direktur tidak terikat periode.
-- Satu catatan berlaku sampai Kabag menggantinya. Kolom lama report_periods.catatan_kabag dibiarkan sebagai arsip.

create table catatan_kabag (
  id          boolean primary key default true check (id),
  isi         text,
  diubah_at   timestamptz not null default now(),
  diubah_oleh uuid references profiles (id)
);

alter table catatan_kabag enable row level security;
create policy baca on catatan_kabag for select to authenticated using (fn_pengguna_aktif());
grant select on catatan_kabag to authenticated;

-- Bawa catatan terakhir yang pernah ditulis.
insert into catatan_kabag (isi)
select coalesce((select catatan_kabag from report_periods where catatan_kabag is not null order by tanggal_mulai desc limit 1), null);

drop function if exists fn_simpan_catatan_kabag(uuid, text);

create function fn_simpan_catatan_kabag(p_catatan text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from user_roles where user_id = auth.uid() and role in ('kabag', 'admin')) then
    raise exception 'Hanya Kabag atau Admin yang dapat menulis catatan untuk Direktur.';
  end if;
  insert into catatan_kabag (id, isi, diubah_at, diubah_oleh) values (true, nullif(trim(p_catatan), ''), now(), auth.uid())
  on conflict (id) do update set isi = excluded.isi, diubah_at = excluded.diubah_at, diubah_oleh = excluded.diubah_oleh;
end;
$$;

grant execute on function fn_simpan_catatan_kabag(text) to authenticated;
