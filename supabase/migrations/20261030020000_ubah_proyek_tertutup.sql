-- Proyek Selesai/Dibatalkan tetap dapat diubah charternya (identitas, PIC, nama, tanggal, PIC dan deliverable aktivitas).
-- Yang tetap dikunci: menambah aktivitas, serta mengubah status/progres aktivitas (kecuali membatalkannya),
-- agar proyek Selesai tidak memiliki aktivitas yang belum selesai.
create or replace function trg_activities_aturan() returns trigger
language plpgsql as $$
declare
  v_status_proyek project_status;
begin
  select status into v_status_proyek from projects where id = new.project_id;
  if v_status_proyek in ('selesai', 'dibatalkan') then
    if tg_op = 'INSERT' then
      raise exception 'Aktivitas baru tidak dapat ditambahkan pada proyek yang sudah Selesai/Dibatalkan.';
    end if;
    if new.status <> 'dibatalkan'
       and (new.status is distinct from old.status or new.progres is distinct from old.progres) then
      raise exception 'Status dan progres aktivitas pada proyek yang sudah Selesai/Dibatalkan tidak dapat diubah.';
    end if;
  end if;

  if new.status = 'selesai' then
    new.progres := 100;
    if new.aktual_selesai is null then
      raise exception 'Isi tanggal aktual selesai untuk aktivitas "%".', new.nama;
    end if;
  elsif new.progres = 100 then
    raise exception 'Progres 100%% hanya dapat dicapai dengan menandai aktivitas "%" Selesai.', new.nama;
  end if;

  if new.status = 'belum_mulai' and new.progres > 0 then
    new.status := 'berjalan';
  end if;
  if new.status in ('berjalan', 'selesai') and new.aktual_mulai is null then
    new.aktual_mulai := coalesce(new.aktual_selesai, current_date);
  end if;

  return new;
end;
$$;
