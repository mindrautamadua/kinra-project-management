-- KINRA Project Hub — fungsi pendukung aplikasi web.

-- Profil dibuat otomatis saat akun baru terdaftar di Supabase Auth, dalam keadaan NONAKTIF.
-- Admin mengaktifkan dan memberi peran (lihat scripts/aktifkan-pengguna.sql), sehingga pendaftaran
-- mandiri tidak otomatis membuka akses ke data.
create function trg_auth_user_baru() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nama, email, aktif)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), split_part(new.email, '@', 1)),
    new.email,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_baru after insert on auth.users
  for each row execute function trg_auth_user_baru();

-- Periode minggu berjalan; dibuat bila belum ada (pengganti pg_cron pada instalasi self-hosted).
create function fn_periode_berjalan() returns report_periods
language plpgsql security definer set search_path = public as $$
declare
  v report_periods;
  v_id uuid;
begin
  if not fn_pengguna_aktif() then
    raise exception 'Akun belum aktif.';
  end if;
  -- Dipanggil terpisah: di dalam WHERE, fungsi volatile tidak dieksekusi bila tabel masih kosong.
  v_id := fn_buka_periode(current_date);
  select * into v from report_periods where id = v_id;
  return v;
end;
$$;

-- Proyek aktif yang boleh diisi update oleh pengguna saat ini.
create function fn_proyek_dapat_diubah() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from projects where status = 'aktif' and fn_boleh_ubah_proyek(id);
$$;

-- Laporan yang menunggu review dan boleh diputuskan pengguna saat ini.
create function fn_antrean_review() returns setof uuid
language sql stable security definer set search_path = public as $$
  select u.id
  from project_updates u
  join projects p on p.id = u.project_id
  where u.status in ('diajukan', 'direview')
    and fn_punya_peran('{admin,kabag,kasubag}', p.org_unit_id);
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on audit_log, activity_snapshots, baselines, baseline_activities from authenticated;
grant execute on function fn_periode_berjalan() to authenticated;
grant execute on function fn_proyek_dapat_diubah() to authenticated;
grant execute on function fn_antrean_review() to authenticated;
grant execute on function fn_boleh_ubah_proyek(uuid) to authenticated;
revoke all on all tables in schema public from anon;
