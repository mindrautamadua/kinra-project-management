-- Foto kegiatan per aktivitas proyek, dicetak di halaman Lampiran laporan.
-- Memakai tabel attachments (entitas = 'activity') dan bucket Storage privat 'lampiran'.
-- Jalankan di SQL Editor Studio sebagai postgres.

alter table attachments
  add column if not exists keterangan       text,
  add column if not exists tanggal_kegiatan date;

-- Bucket privat: foto dibaca lewat signed URL dari server. Batas 10 MB per file, hanya gambar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lampiran', 'lampiran', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Foto aktivitas hanya boleh diunggah pengelola proyek atau PIC aktivitas tersebut.
create or replace function fn_boleh_unggah_aktivitas(p_activity uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from activities a
    where a.id = p_activity and (fn_boleh_ubah_proyek(a.project_id) or a.pic_id = auth.uid())
  );
$$;
revoke execute on function fn_boleh_unggah_aktivitas(uuid) from public, anon;
grant execute on function fn_boleh_unggah_aktivitas(uuid) to authenticated;

drop policy if exists tambah on attachments;
create policy tambah on attachments for insert to authenticated
  with check (
    diunggah_oleh = auth.uid() and fn_pengguna_aktif()
    and (entitas <> 'activity' or fn_boleh_unggah_aktivitas(entitas_id))
  );
drop policy if exists ubah on attachments;
create policy ubah on attachments for update to authenticated
  using (diunggah_oleh = auth.uid() or fn_admin())
  with check (diunggah_oleh = auth.uid() or fn_admin());

-- Objek Storage: path 'aktivitas/<project_id>/<activity_id>/<nama>'.
drop policy if exists lampiran_baca on storage.objects;
create policy lampiran_baca on storage.objects for select to authenticated
  using (bucket_id = 'lampiran' and public.fn_pengguna_aktif());
drop policy if exists lampiran_tambah on storage.objects;
create policy lampiran_tambah on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lampiran' and public.fn_pengguna_aktif()
    and (storage.foldername(name))[1] = 'aktivitas'
    and public.fn_boleh_unggah_aktivitas(((storage.foldername(name))[3])::uuid)
  );
drop policy if exists lampiran_hapus on storage.objects;
create policy lampiran_hapus on storage.objects for delete to authenticated
  using (bucket_id = 'lampiran' and (owner = auth.uid() or public.fn_admin()));

notify pgrst, 'reload schema';
