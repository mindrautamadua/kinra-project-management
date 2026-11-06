-- Proyek yang seluruh aktivitasnya sudah tuntas (progres aktual 100%) tidak lagi dihitung Kritis hanya karena
-- tanggal laporan melewati tanggal selesai baseline. Sebelumnya, contoh B.3.3: aktivitas selesai 30 Okt,
-- baseline selesai 5 Nov, periode laporan berakhir 6 Nov, sehingga status menjadi Kritis padahal 100% = 100%.
-- Aturan baru: lewat tanggal selesai baseline tetap Kritis selama progres aktual masih di bawah 100%;
-- bila sudah 100%, statusnya Sesuai sampai proyek ditutup Selesai.
-- Cerminan di aplikasi: hitungKesehatan di lib/format.ts.
-- Update mingguan yang sudah tersimpan menghitung ulang statusnya saat disimpan ulang.

create or replace function fn_kesehatan(
  p_status project_status,
  p_rencana numeric,
  p_aktual numeric,
  p_selesai_baseline date,
  p_jml_aktivitas int,
  p_tanggal date
) returns health_status
language sql immutable as $$
  select (case
    when p_status = 'selesai' then 'selesai'
    when p_status <> 'aktif' then null
    when coalesce(p_jml_aktivitas, 0) = 0 or p_selesai_baseline is null then 'data_belum_lengkap'
    when coalesce(p_aktual, 0) >= 100 then 'sesuai'
    when p_tanggal > p_selesai_baseline then 'kritis'
    when coalesce(p_rencana, 0) = 0 and coalesce(p_aktual, 0) = 0 then 'belum_mulai'
    when p_rencana < 10 then
      case
        when p_rencana - p_aktual <= 5 then 'sesuai'
        when p_rencana - p_aktual <= 10 then 'waspada'
        else 'terlambat'
      end
    when p_aktual / p_rencana >= 0.95 then 'sesuai'
    when p_aktual / p_rencana >= 0.85 then 'waspada'
    when p_aktual / p_rencana >= 0.70 then 'terlambat'
    else 'kritis'
  end)::health_status;
$$;
