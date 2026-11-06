-- Target selesai baseline mengikuti aktivitas paling akhir bila melewati target proyek.

create or replace function fn_salin_baseline(p_project uuid, p_alasan text, p_status baseline_status)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_project projects;
  v_id uuid;
begin
  select * into v_project from projects where id = p_project;

  if exists (
    select 1 from activities
    where project_id = p_project and status <> 'dibatalkan'
      and (rencana_mulai is null or rencana_selesai is null)
  ) then
    raise exception 'Semua aktivitas harus memiliki tanggal rencana mulai dan selesai sebelum baseline dibuat.';
  end if;

  insert into baselines (project_id, versi, tanggal_selesai, alasan, status, diajukan_oleh,
                         diputuskan_oleh, diputuskan_at)
  values (
    p_project,
    coalesce((select max(versi) from baselines where project_id = p_project), 0) + 1,
    -- Target baseline tidak boleh lebih awal dari aktivitas terakhir; bila rencana kerja melewati target
    -- proyek, target ikut bergeser (dan terlihat sebagai perubahan saat re-baseline diputuskan).
    greatest(
      v_project.tanggal_selesai,
      (select max(rencana_selesai) from activities where project_id = p_project and status <> 'dibatalkan')
    ),
    p_alasan,
    p_status,
    auth.uid(),
    case when p_status = 'disetujui' then auth.uid() end,
    case when p_status = 'disetujui' then now() end
  )
  returning id into v_id;

  insert into baseline_activities (baseline_id, activity_id, nama, bobot, rencana_mulai, rencana_selesai)
  select v_id, id, nama, bobot, rencana_mulai, rencana_selesai
  from activities
  where project_id = p_project and status <> 'dibatalkan';

  return v_id;
end;
$$;
