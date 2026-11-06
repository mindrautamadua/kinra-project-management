-- Update mingguan tanpa proses review. Update yang diajukan langsung final, tetapi PIC masih dapat
-- mengeditnya selama periode belum ditutup. Setiap simpan ulang menghitung ulang progres dan status
-- kesehatan serta menjalankan validasi yang sama seperti saat pertama diajukan.
-- diajukan_at tetap mencatat pengajuan pertama, sehingga kepatuhan tepat waktu tidak berubah karena edit.
-- Status Direview, Dikembalikan, dan Disetujui tidak dipakai lagi; enum dibiarkan untuk data lama.

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
  if not (fn_sistem() or fn_boleh_ubah_proyek(new.project_id)) then
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

-- Bekukan progres aktivitas saat laporan dikunci di akhir periode (sebelumnya saat disetujui).
create or replace function trg_project_updates_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('disetujui', 'terkunci') and old.status not in ('disetujui', 'terkunci') then
    insert into activity_snapshots (update_id, activity_id, progres, status, aktual_mulai, aktual_selesai)
    select new.id, a.id, a.progres, a.status, a.aktual_mulai, a.aktual_selesai
    from activities a where a.project_id = new.project_id
    on conflict do nothing;
  end if;
  return null;
end;
$$;

-- Menutup periode: kunci semua update yang sudah diajukan.
create or replace function fn_tutup_periode(p_period uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (fn_sistem() or fn_admin()) then
    raise exception 'Hanya sistem atau Admin yang dapat menutup periode.';
  end if;
  update project_updates set status = 'terkunci'
  where period_id = p_period and status in ('diajukan', 'direview', 'disetujui');
  update report_periods set ditutup_at = now() where id = p_period;
end;
$$;

-- Tidak ada lagi antrean review.
create or replace function fn_antrean_review() returns setof uuid
language sql stable security definer set search_path = public as $$
  select null::uuid where false;
$$;

-- Update yang sedang direview dianggap sudah diajukan.
alter table project_updates disable trigger project_updates_alur;
update project_updates set status = 'diajukan' where status = 'direview';
alter table project_updates enable trigger project_updates_alur;
