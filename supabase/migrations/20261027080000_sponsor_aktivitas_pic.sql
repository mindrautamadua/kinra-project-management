-- Sponsor proyek dan PIC aktivitas dipilih dari master PIC (sebelumnya akun profil; saat migrasi keduanya masih kosong).
-- Jalankan setelah 20261027070000_master_pic.sql.
-- Constraint lama dilepas dulu agar id profil dapat diganti id master PIC; id yang tidak punya padanan dikosongkan.
alter table projects drop constraint projects_sponsor_id_fkey;
update projects p set sponsor_id = (select x.id from pics x where x.profile_id = p.sponsor_id) where sponsor_id is not null;
alter table projects add constraint projects_sponsor_id_fkey foreign key (sponsor_id) references pics (id);

alter table activities drop constraint activities_pic_id_fkey;
update activities a set pic_id = (select x.id from pics x where x.profile_id = a.pic_id) where pic_id is not null;
alter table activities add constraint activities_pic_id_fkey foreign key (pic_id) references pics (id);

-- PIC aktivitas yang punya akun tetap boleh memperbarui aktivitasnya sendiri.
drop policy ubah on activities;
create policy ubah on activities for update to authenticated
  using (fn_boleh_ubah_proyek(project_id) or exists (select 1 from pics x where x.id = pic_id and x.profile_id = auth.uid()))
  with check (fn_boleh_ubah_proyek(project_id) or exists (select 1 from pics x where x.id = pic_id and x.profile_id = auth.uid()));

notify pgrst, 'reload schema';
