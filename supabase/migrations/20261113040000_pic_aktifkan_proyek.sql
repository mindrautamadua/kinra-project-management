-- PIC boleh mengaktifkan proyek Draf (mengunci baseline v1): PIC proyek di Master PIC yang akunnya ditautkan,
-- atau pemegang peran PIC di unit proyek. Sebelumnya hanya Kasubag, Kabag, atau Admin.
-- Aturan lain tidak berubah: menutup Selesai oleh Kabag/Admin, menunda/membatalkan oleh Kabag/Admin.
-- Salinan trg_projects_aturan dari 20261026000000_init_project_hub.sql dengan pemeriksaan aktivasi yang diperluas.

create or replace function trg_projects_aturan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.baseline_aktif_id is distinct from old.baseline_aktif_id
     and current_setting('app.ubah_baseline', true) is distinct from 'on' then
    raise exception 'Baseline aktif hanya dapat diganti melalui persetujuan re-baseline.';
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'aktif' then
        -- PIC proyek (lewat Master PIC) atau pemegang peran PIC di unit proyek juga boleh mengaktifkan.
        if not (fn_sistem() or fn_punya_peran('{admin,kabag,kasubag,pic}', new.org_unit_id)
                or exists (select 1 from project_pics pp join pics x on x.id = pp.pic_id
                           where pp.project_id = new.id and x.profile_id = auth.uid())) then
          raise exception 'Hanya PIC proyek, Kasubag, Kabag, atau Admin yang dapat mengaktifkan proyek.';
        end if;
        if new.tanggal_mulai is null or new.tanggal_selesai is null then
          raise exception 'Proyek harus memiliki tanggal mulai dan selesai sebelum diaktifkan.';
        end if;
        if not exists (select 1 from activities where project_id = new.id and status <> 'dibatalkan') then
          raise exception 'Proyek harus memiliki minimal satu aktivitas sebelum diaktifkan.';
        end if;
      when 'selesai' then
        if not (fn_sistem() or fn_punya_peran('{admin,kabag}', new.org_unit_id)) then
          raise exception 'Hanya Kabag atau Admin yang dapat menutup proyek.';
        end if;
        if exists (
          select 1 from activities
          where project_id = new.id and status not in ('selesai', 'dibatalkan')
        ) then
          raise exception 'Proyek tidak dapat ditandai Selesai: masih ada aktivitas yang belum selesai.';
        end if;
        new.tanggal_selesai_aktual := coalesce(new.tanggal_selesai_aktual, current_date);
      when 'ditunda', 'dibatalkan' then
        if not (fn_sistem() or fn_punya_peran('{admin,kabag}', new.org_unit_id)) then
          raise exception 'Hanya Kabag atau Admin yang dapat menunda atau membatalkan proyek.';
        end if;
      when 'draf' then
        raise exception 'Proyek yang sudah berjalan tidak dapat dikembalikan ke Draf.';
    end case;
  end if;

  return new;
end;
$$;
