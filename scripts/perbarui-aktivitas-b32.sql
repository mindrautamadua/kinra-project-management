-- B.3.2 Pemasangan Starlink di Ruang Rapat Pusat Inovasi: ganti satu aktivitas gabungan dengan empat
-- aktivitas sesuai laporan progres PIC (Oktober minggu 1–4, target = realisasi, progres 100%).
-- Jalankan sekali di SQL Editor Studio sebagai postgres.
--
-- Proyek sudah berstatus Selesai, sehingga trigger activities_aturan menolak perubahan aktivitas.
-- Trigger dimatikan sementara di dalam transaksi ini saja. Baseline aktif ikut disesuaikan supaya
-- Gantt "Target" dan perhitungan progres memakai empat aktivitas baru.

begin;

alter table activities disable trigger activities_aturan;

do $$
declare
  p uuid;
  v_baseline uuid;
begin
  select id, baseline_aktif_id into p, v_baseline from projects where kode = 'B.3.2';
  if p is null then raise exception 'Proyek B.3.2 tidak ditemukan.'; end if;

  -- Baris baseline_activities dan activity_snapshots ikut terhapus (on delete cascade).
  delete from activities where project_id = p;

  insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai,
                          aktual_mulai, aktual_selesai, progres, status)
  values
    (p, 1, 'Melakukan persiapan dan identifikasi kebutuhan pemasangan Starlink di Ruang Rapat Pusat Inovasi',
        '2026-10-01', '2026-10-07', '2026-10-01', '2026-10-07', 100, 'selesai'),
    (p, 2, 'Melakukan pemasangan perangkat Starlink dan konfigurasi jaringan internet',
        '2026-10-08', '2026-10-14', '2026-10-08', '2026-10-14', 100, 'selesai'),
    (p, 3, 'Melakukan pengujian konektivitas dan kestabilan jaringan internet',
        '2026-10-15', '2026-10-21', '2026-10-15', '2026-10-21', 100, 'selesai'),
    (p, 4, 'Memastikan jaringan dapat digunakan untuk mendukung kegiatan rapat dan operasional perusahaan',
        '2026-10-22', '2026-10-28', '2026-10-22', '2026-10-28', 100, 'selesai');

  if v_baseline is not null then
    insert into baseline_activities (baseline_id, activity_id, nama, bobot, rencana_mulai, rencana_selesai)
    select v_baseline, id, nama, bobot, rencana_mulai, rencana_selesai from activities where project_id = p;
    update baselines set tanggal_selesai = '2026-10-28' where id = v_baseline;
  end if;

  update projects set tanggal_selesai = '2026-10-28', tanggal_selesai_aktual = '2026-10-28' where id = p;
end;
$$;

alter table activities enable trigger activities_aturan;

commit;
