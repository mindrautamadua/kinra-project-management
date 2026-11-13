-- Peran Operator (berlaku per unit, termasuk unit turunannya, seperti Kasubag).
-- Operator boleh: mengisi dan memverifikasi update mingguan, memperbarui progres serta tanggal aktual aktivitas,
-- mencatat PICA (masalah dan aksi korektif), dan mengunggah foto kegiatan.
-- Operator tidak boleh: mengubah charter, rencana kerja (nama, jadwal, bobot, PIC aktivitas), baseline, atau status proyek.
-- Jalankan setelah 20261113000000_peran_operator_enum.sql.

-- Boleh mengisi update mingguan: pengelola proyek (fn_boleh_ubah_proyek) atau Operator pada unit proyek.
create or replace function fn_boleh_update_proyek(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select fn_boleh_ubah_proyek(p_project) or exists (
    select 1 from projects p
    where p.id = p_project and fn_punya_peran('{operator}', p.org_unit_id)
  );
$$;
revoke execute on function fn_boleh_update_proyek(uuid) from public, anon;
grant execute on function fn_boleh_update_proyek(uuid) to authenticated;

-- Daftar proyek yang perlu diisi update mingguan oleh pengguna (halaman Update mingguan dan badge menu).
create or replace function fn_proyek_dapat_diubah() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from projects where status = 'aktif' and fn_boleh_update_proyek(id);
$$;

-- Update mingguan
drop policy if exists tambah on project_updates;
create policy tambah on project_updates for insert to authenticated
  with check (fn_boleh_update_proyek(project_id));
drop policy if exists ubah on project_updates;
create policy ubah on project_updates for update to authenticated
  using (fn_boleh_update_proyek(project_id)) with check (fn_boleh_update_proyek(project_id));

-- Validasi pengajuan update: sama seperti 20261030000000_update_tanpa_review.sql, kecuali pemeriksaan wewenang
-- memakai fn_boleh_update_proyek agar Operator dapat menyimpan dan memverifikasi update.
create or replace function trg_project_updates_alur() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_project projects;
  v_periode report_periods;
  v_hitung record;
  v_akhir health_status;
begin
  select * into v_project from projects where id = new.project_id;

  if tg_op = 'INSERT' then
    if new.status <> 'draf' then
      raise exception 'Update baru harus berstatus Draf.';
    end if;
    if v_project.status <> 'aktif' then
      raise exception 'Update mingguan hanya untuk proyek berstatus Aktif.';
    end if;
    return new;
  end if;

  if old.status in ('disetujui', 'terkunci')
     and not (old.status = 'disetujui' and new.status = 'terkunci') then
    raise exception 'Periode laporan ini sudah ditutup. Catat koreksi di periode berikutnya.';
  end if;

  if new.status = 'terkunci' then
    if not (fn_sistem() or fn_admin()) then
      raise exception 'Laporan dikunci oleh sistem saat periode ditutup.';
    end if;
    return new;
  end if;

  -- Draf / Dikembalikan yang disimpan tanpa diajukan.
  if new.status in ('draf', 'dikembalikan') and new.status = old.status then
    if new.status_override is not null and new.status_kesehatan is not null
       and fn_lebih_buruk(new.status_override, new.status_kesehatan) <> new.status_override then
      raise exception 'Override hanya boleh memperburuk status, bukan memperbaikinya.';
    end if;
    return new;
  end if;

  if new.status <> 'diajukan' then
    raise exception 'Update yang sudah diajukan tetap dapat diedit; simpan ulang untuk memperbaruinya.';
  end if;

  -- Pengajuan pertama (dari Draf / Dikembalikan) atau edit update yang sudah diajukan.
  if old.status not in ('draf', 'dikembalikan', 'diajukan', 'direview') then
    raise exception 'Update ini tidak dapat diajukan.';
  end if;
  if not (fn_sistem() or fn_boleh_update_proyek(new.project_id)) then
    raise exception 'Anda tidak berwenang mengajukan update proyek ini.';
  end if;
  if coalesce(length(trim(new.sudah_dilakukan)), 0) < 20
     or coalesce(length(trim(new.rencana_berikut)), 0) < 20 then
    raise exception 'Isi "Yang telah dilakukan" dan "Rencana minggu depan" (masing-masing minimal 20 karakter).';
  end if;
  if exists (
    select 1 from project_updates u
    where u.period_id = new.period_id and u.project_id <> new.project_id
      and (lower(trim(u.sudah_dilakukan)) = lower(trim(new.sudah_dilakukan))
           or lower(trim(u.rencana_berikut)) = lower(trim(new.rencana_berikut)))
  ) then
    raise exception 'Isian sama persis dengan update proyek lain pada periode ini. Tulis update khusus untuk proyek ini.';
  end if;

  select * into v_periode from report_periods where id = new.period_id;
  select * into v_hitung from fn_progres_proyek(new.project_id, v_periode.tanggal_akhir);

  new.progres_rencana := v_hitung.progres_rencana;
  new.progres_aktual := v_hitung.progres_aktual;
  new.spi := case when v_hitung.progres_rencana > 0
                  then round(v_hitung.progres_aktual / v_hitung.progres_rencana, 3) end;
  new.status_kesehatan := fn_kesehatan(v_project.status, v_hitung.progres_rencana, v_hitung.progres_aktual,
                                       v_hitung.tanggal_selesai_baseline, v_hitung.jml_aktivitas,
                                       v_periode.tanggal_akhir);

  if new.status_override is not null
     and fn_lebih_buruk(new.status_override, new.status_kesehatan) <> new.status_override then
    raise exception 'Override hanya boleh memperburuk status, bukan memperbaikinya.';
  end if;

  v_akhir := fn_lebih_buruk(new.status_kesehatan, new.status_override);
  if v_akhir in ('terlambat', 'kritis') and not exists (
    select 1 from issues i join actions a on a.issue_id = i.id
    where i.project_id = new.project_id and i.status = 'terbuka' and a.status <> 'dibatalkan'
  ) then
    raise exception 'Status proyek %: catat minimal satu Masalah terbuka beserta Aksi korektif (PICA) sebelum mengajukan.', v_akhir;
  end if;

  if old.status not in ('diajukan', 'direview') then
    new.diajukan_oleh := auth.uid();
    new.diajukan_at := now();
  end if;

  return new;
end;
$$;

-- Aktivitas: Operator dapat memperbarui baris aktivitas, tetapi hanya kolom progres (lihat trigger di bawah).
drop policy if exists ubah on activities;
create policy ubah on activities for update to authenticated
  using (fn_boleh_update_proyek(project_id) or exists (select 1 from pics x where x.id = pic_id and x.profile_id = auth.uid()))
  with check (fn_boleh_update_proyek(project_id) or exists (select 1 from pics x where x.id = pic_id and x.profile_id = auth.uid()));

-- Selain pengelola proyek, pengubah aktivitas (Operator, PIC aktivitas) hanya boleh mengubah progres, status,
-- dan tanggal aktual, serta tidak boleh membatalkan aktivitas.
create or replace function trg_activities_hanya_progres() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if fn_sistem() or fn_boleh_ubah_proyek(old.project_id) then
    return new;
  end if;
  if (new.project_id, new.urutan, new.nama, new.pic_id, new.bobot, new.rencana_mulai, new.rencana_selesai,
      new.kriteria_selesai, new.catatan, new.milestone, new.deliverable)
     is distinct from
     (old.project_id, old.urutan, old.nama, old.pic_id, old.bobot, old.rencana_mulai, old.rencana_selesai,
      old.kriteria_selesai, old.catatan, old.milestone, old.deliverable) then
    raise exception 'Operator hanya dapat memperbarui progres dan tanggal aktual aktivitas. Perubahan rencana kerja dilakukan PIC atau Kasubag/Kabag.';
  end if;
  if new.status = 'dibatalkan' and old.status <> 'dibatalkan' then
    raise exception 'Membatalkan aktivitas hanya dapat dilakukan PIC atau Kasubag/Kabag.';
  end if;
  return new;
end;
$$;
drop trigger if exists activities_hanya_progres on activities;
create trigger activities_hanya_progres before update on activities
  for each row execute function trg_activities_hanya_progres();

-- PICA (masalah dan aksi korektif) proyek
drop policy if exists tambah on issues;
create policy tambah on issues for insert to authenticated
  with check (
    case when project_id is not null then fn_boleh_update_proyek(project_id)
         else fn_punya_peran('{admin,kabag,kasubag,pic}', org_unit_id) end
  );
drop policy if exists ubah on issues;
create policy ubah on issues for update to authenticated
  using (
    owner_id = auth.uid()
    or case when project_id is not null then fn_boleh_update_proyek(project_id)
            else fn_punya_peran('{admin,kabag,kasubag}', org_unit_id) end
  );
drop policy if exists tambah on actions;
create policy tambah on actions for insert to authenticated
  with check (exists (
    select 1 from issues i where i.id = issue_id
      and (i.owner_id = auth.uid()
           or case when i.project_id is not null then fn_boleh_update_proyek(i.project_id)
                   else fn_punya_peran('{admin,kabag,kasubag}', i.org_unit_id) end)
  ));
drop policy if exists ubah on actions;
create policy ubah on actions for update to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from issues i where i.id = issue_id
      and (i.owner_id = auth.uid()
           or case when i.project_id is not null then fn_boleh_update_proyek(i.project_id)
                   else fn_punya_peran('{admin,kabag,kasubag}', i.org_unit_id) end)
  ));

-- Foto kegiatan
create or replace function fn_boleh_unggah_aktivitas(p_activity uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from activities a
    where a.id = p_activity
      and (fn_boleh_update_proyek(a.project_id)
           or exists (select 1 from pics x where x.id = a.pic_id and x.profile_id = auth.uid()))
  );
$$;

notify pgrst, 'reload schema';
