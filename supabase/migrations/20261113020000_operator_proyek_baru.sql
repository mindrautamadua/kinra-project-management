-- Operator dapat membuat proyek baru (Draf) di unitnya dan melengkapinya selama masih Draf:
-- charter, PIC, sasaran strategis, dan rencana kerja. Mengaktifkan proyek tetap oleh Kasubag, Kabag, atau Admin
-- (trg_projects_aturan); setelah aktif, Operator kembali hanya mengisi update mingguan.
-- Juga menambah fn_proyek_saya untuk filter "Proyek saya" di daftar proyek.
-- Jalankan setelah 20261113010000_peran_operator.sql.

-- Sama seperti 20261027070000_master_pic.sql, ditambah: pembuat proyek Draf yang memegang peran Operator di unit proyek.
create or replace function fn_boleh_ubah_proyek(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select fn_sistem() or exists (
    select 1 from projects p
    where p.id = p_project
      and (p.pic_id = auth.uid()
           or fn_punya_peran('{admin,kabag,kasubag}', p.org_unit_id)
           or exists (select 1 from project_pics pp join pics x on x.id = pp.pic_id
                      where pp.project_id = p.id and x.profile_id = auth.uid())
           or (p.status = 'draf' and p.created_by = auth.uid() and fn_punya_peran('{operator}', p.org_unit_id)))
  );
$$;

drop policy if exists tambah on projects;
create policy tambah on projects for insert to authenticated
  with check (fn_punya_peran('{admin,kabag,kasubag,operator}', org_unit_id) and status = 'draf');

drop policy if exists hapus on projects;
create policy hapus on projects for delete to authenticated
  using (status = 'draf' and (fn_punya_peran('{admin,kabag,kasubag}', org_unit_id)
                              or (created_by = auth.uid() and fn_punya_peran('{operator}', org_unit_id))));

-- Proyek yang dipegang pengguna: dapat diisi update atau diubah (PIC, Operator/Kasubag/Kabag unit), atau dibuatnya sendiri.
create or replace function fn_proyek_saya() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from projects where created_by = auth.uid() or fn_boleh_update_proyek(id);
$$;
revoke execute on function fn_proyek_saya() from public, anon;
grant execute on function fn_proyek_saya() to authenticated;

notify pgrst, 'reload schema';
