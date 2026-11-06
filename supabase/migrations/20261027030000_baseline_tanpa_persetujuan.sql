-- Perubahan baseline langsung berlaku tanpa persetujuan Kabag (keputusan pemilik produk, 27 Okt 2026).
-- Siapa pun yang boleh mengubah proyek (PIC, Kasubag/Kabag unit, Admin) dapat menetapkan baseline baru.
-- Pengaman yang tetap ada: alasan wajib, versi lama tersimpan, setiap perubahan tercatat di audit_log,
-- dan dasbor menampilkan proyek yang mengganti baseline pada minggu berjalan.
create or replace function fn_ajukan_baseline(p_project uuid, p_alasan text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_status project_status;
  v_id uuid;
begin
  if not fn_boleh_ubah_proyek(p_project) then
    raise exception 'Anda tidak berwenang mengubah baseline proyek ini.';
  end if;
  select status into v_status from projects where id = p_project;
  if v_status not in ('aktif', 'ditunda') then
    raise exception 'Baseline hanya dapat diperbarui untuk proyek Aktif atau Ditunda.';
  end if;
  if coalesce(length(trim(p_alasan)), 0) < 10 then
    raise exception 'Alasan perubahan baseline wajib diisi (minimal 10 karakter).';
  end if;

  -- Pengajuan lama (alur persetujuan sebelumnya) yang masih menggantung digantikan.
  update baselines
  set status = 'ditolak', diputuskan_oleh = auth.uid(), diputuskan_at = now(),
      catatan_keputusan = 'Digantikan baseline baru tanpa alur persetujuan'
  where project_id = p_project and status = 'diajukan';

  v_id := fn_salin_baseline(p_project, trim(p_alasan), 'disetujui');
  perform set_config('app.ubah_baseline', 'on', true);
  update projects set baseline_aktif_id = v_id where id = p_project;
  perform set_config('app.ubah_baseline', 'off', true);
  return v_id;
end;
$$;
