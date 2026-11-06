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
