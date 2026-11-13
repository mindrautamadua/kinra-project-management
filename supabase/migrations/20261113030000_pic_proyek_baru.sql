-- PIC juga dapat membuat proyek baru (Draf) di unit perannya, sama seperti Operator
-- (20261113020000_operator_proyek_baru.sql): melengkapi dan menghapus Draf buatannya sendiri.
-- Mengaktifkan proyek tetap oleh Kasubag, Kabag, atau Admin.

create or replace function fn_boleh_ubah_proyek(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select fn_sistem() or exists (
    select 1 from projects p
    where p.id = p_project
      and (p.pic_id = auth.uid()
           or fn_punya_peran('{admin,kabag,kasubag}', p.org_unit_id)
           or exists (select 1 from project_pics pp join pics x on x.id = pp.pic_id
                      where pp.project_id = p.id and x.profile_id = auth.uid())
           or (p.status = 'draf' and p.created_by = auth.uid() and fn_punya_peran('{operator,pic}', p.org_unit_id)))
  );
$$;

drop policy if exists tambah on projects;
create policy tambah on projects for insert to authenticated
  with check (fn_punya_peran('{admin,kabag,kasubag,operator,pic}', org_unit_id) and status = 'draf');

drop policy if exists hapus on projects;
create policy hapus on projects for delete to authenticated
  using (status = 'draf' and (fn_punya_peran('{admin,kabag,kasubag}', org_unit_id)
                              or (created_by = auth.uid() and fn_punya_peran('{operator,pic}', org_unit_id))));

notify pgrst, 'reload schema';
