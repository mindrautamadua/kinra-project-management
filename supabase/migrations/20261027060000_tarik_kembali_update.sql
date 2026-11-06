-- PIC dapat menarik kembali update yang sudah diajukan (Diajukan -> Draf) selama reviewer belum
-- menandainya Direview. Sebelumnya hanya reviewer yang dapat membuka kembali laporan.

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
    raise exception 'Laporan yang sudah disetujui tidak dapat diubah. Catat koreksi di periode berikutnya.';
  end if;

  if new.status is not distinct from old.status then
    if old.status in ('diajukan', 'direview')
       and (new.sudah_dilakukan, new.rencana_berikut, new.status_override, new.alasan_override)
           is distinct from (old.sudah_dilakukan, old.rencana_berikut, old.status_override, old.alasan_override) then
      raise exception 'Laporan sedang direview. Minta reviewer mengembalikannya untuk mengubah isi.';
    end if;
    if new.status_override is not null and new.status_kesehatan is not null
       and fn_lebih_buruk(new.status_override, new.status_kesehatan) <> new.status_override then
      raise exception 'Override hanya boleh memperburuk status, bukan memperbaikinya.';
    end if;
    return new;
  end if;

  case new.status
    when 'diajukan' then
      if old.status not in ('draf', 'dikembalikan') then
        raise exception 'Hanya laporan Draf atau Dikembalikan yang dapat diajukan.';
      end if;
      if not fn_boleh_ubah_proyek(new.project_id) then
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

      new.diajukan_oleh := auth.uid();
      new.diajukan_at := now();

    when 'direview', 'dikembalikan' then
      if old.status not in ('diajukan', 'direview') then
        raise exception 'Laporan belum diajukan.';
      end if;
      if not (fn_sistem() or fn_punya_peran('{admin,kabag,kasubag}', v_project.org_unit_id)) then
        raise exception 'Hanya Kasubag, Kabag, atau Admin yang dapat mereview laporan.';
      end if;
      if new.status = 'dikembalikan' and coalesce(length(trim(new.catatan_reviewer)), 0) = 0 then
        raise exception 'Tulis catatan saat mengembalikan laporan.';
      end if;
      new.direview_oleh := auth.uid();
      new.direview_at := now();

    when 'disetujui' then
      if old.status not in ('diajukan', 'direview') then
        raise exception 'Laporan belum diajukan.';
      end if;
      if not (fn_sistem() or fn_punya_peran('{admin,kabag}', v_project.org_unit_id)) then
        raise exception 'Hanya Kabag atau Admin yang dapat menyetujui laporan.';
      end if;
      new.disetujui_oleh := auth.uid();
      new.disetujui_at := now();

    when 'terkunci' then
      if not (fn_sistem() or fn_admin()) then
        raise exception 'Laporan dikunci oleh sistem saat periode ditutup.';
      end if;

    when 'draf' then
      -- PIC menarik kembali laporannya sendiri selama belum mulai direview.
      if old.status <> 'diajukan' then
        raise exception 'Laporan hanya dapat ditarik kembali selama berstatus Diajukan. Setelah direview, minta reviewer mengembalikannya.';
      end if;
      if not fn_boleh_ubah_proyek(new.project_id) then
        raise exception 'Anda tidak berwenang menarik kembali update proyek ini.';
      end if;
      new.diajukan_oleh := null;
      new.diajukan_at := null;
  end case;

  return new;
end;
$$;
