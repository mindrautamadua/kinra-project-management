-- Menghapus proyek beserta seluruh isinya (aktivitas, baseline, update, PICA).
-- Draf: Kasubag/Kabag/Admin unit. Status lain: hanya Admin, karena menghapus riwayat laporan.
-- Alasan dicatat di audit_log; isi setiap baris yang terhapus juga tercatat lewat trigger audit
-- (cascade ke tabel anak ikut memicu trigger), sehingga data masih dapat dipulihkan.
create function fn_hapus_proyek(p_project uuid, p_alasan text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v projects;
begin
  select * into v from projects where id = p_project for update;
  if v.id is null then
    raise exception 'Proyek tidak ditemukan.';
  end if;

  if v.status = 'draf' then
    if not (fn_sistem() or fn_punya_peran('{admin,kabag,kasubag}', v.org_unit_id)) then
      raise exception 'Hanya Kasubag, Kabag, atau Admin unit ini yang dapat menghapus proyek Draf.';
    end if;
  elsif not (fn_sistem() or fn_admin()) then
    raise exception 'Proyek berstatus % hanya dapat dihapus Admin. Gunakan status Dibatalkan bila proyek tidak dilanjutkan.', v.status;
  end if;

  if coalesce(length(trim(p_alasan)), 0) < 10 then
    raise exception 'Alasan penghapusan wajib diisi (minimal 10 karakter).';
  end if;

  insert into audit_log (tabel, record_id, aksi, data_lama, data_baru, pelaku)
  values ('projects', v.id, 'hapus_proyek', to_jsonb(v), jsonb_build_object('alasan', trim(p_alasan)), auth.uid());

  delete from projects where id = p_project;
  return v.kode;
end;
$$;

revoke execute on function fn_hapus_proyek(uuid, text) from public, anon;
grant execute on function fn_hapus_proyek(uuid, text) to authenticated;
