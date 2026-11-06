-- B.3.1 Pemenuhan Ketersediaan Jaringan Starlink di Gedung Graha: samakan data dengan laporan progres
-- PIC (slide B3.1, Oktober 2026). Jalankan sekali di SQL Editor Studio sebagai postgres.
--
-- Yang diubah:
--   * Deskripsi proyek dan target selesai (W4 Oktober = 28 Okt), termasuk baseline aktif.
--   * Lima aktivitas: nama, jadwal, dan status. Aktivitas diubah di tempat (berdasarkan urutan),
--     bukan dihapus, supaya riwayat dan snapshot tetap utuh.
--   * Teks PI/CA pada masalah terbuka proyek ini.
--   * Isian "Yang telah dilakukan" dan "Rencana minggu depan" pada update periode berjalan.
--
-- Progres aktivitas yang masih berjalan adalah perkiraan (slide tidak mencantumkan angka per aktivitas):
-- 3 = 75%, 4 = 50%, 5 = 0%. PIC dapat mengoreksinya di formulir update mingguan.

begin;

do $$
declare
  p uuid;
  v_baseline uuid;
  v_periode uuid;
  v_iss uuid;
  v_upd project_updates;
begin
  select id, baseline_aktif_id into p, v_baseline from projects where kode = 'B.3.1';
  if p is null then raise exception 'Proyek B.3.1 tidak ditemukan.'; end if;

  update projects set
    deskripsi = 'Pemenuhan kebutuhan konektivitas jaringan internet melalui pengadaan dan pemasangan perangkat Starlink '
             || 'serta router pendukung di Gedung Graha untuk meningkatkan ketersediaan dan jangkauan jaringan internet '
             || 'pada lantai 1 dan 2.',
    tanggal_selesai = '2026-10-28'
  where id = p;

  -- Aktivitas: (urutan, nama, rencana mulai, rencana selesai, progres, aktual mulai, aktual selesai)
  update activities a set
    nama = v.nama, rencana_mulai = v.mulai, rencana_selesai = v.selesai,
    progres = v.progres,
    status = (case when v.progres = 100 then 'selesai' when v.progres > 0 then 'berjalan' else 'belum_mulai' end)::activity_status,
    aktual_mulai = v.aktual_mulai, aktual_selesai = v.aktual_selesai
  from (values
    (1, 'Melakukan koordinasi dengan pihak Vijja Net untuk identifikasi kebutuhan perangkat jaringan',
        date '2026-10-08', date '2026-10-14', 100, date '2026-10-08', date '2026-10-14'),
    (2, 'Menyusun kebutuhan perangkat Starlink dan router untuk lantai 1 dan 2',
        date '2026-10-08', date '2026-10-14', 100, date '2026-10-08', date '2026-10-14'),
    (3, 'Melakukan pengajuan persetujuan pembelian barang kepada Direktur',
        date '2026-10-15', date '2026-10-21', 75, date '2026-10-15', null::date),
    (4, 'Melakukan proses pengadaan perangkat melalui Bagian Pengadaan',
        date '2026-10-15', date '2026-10-21', 50, date '2026-10-15', null::date),
    (5, 'Melakukan pemasangan dan konfigurasi perangkat jaringan Starlink dan router',
        date '2026-10-22', date '2026-10-28', 0, null::date, null::date)
  ) as v(urutan, nama, mulai, selesai, progres, aktual_mulai, aktual_selesai)
  where a.project_id = p and a.urutan = v.urutan;

  if (select count(*) from activities where project_id = p and urutan between 1 and 5) <> 5 then
    raise exception 'Aktivitas B.3.1 urutan 1–5 tidak lengkap; periksa data sebelum menjalankan skrip.';
  end if;

  -- Baseline aktif mengikuti jadwal baru.
  if v_baseline is not null then
    update baseline_activities b set nama = a.nama, rencana_mulai = a.rencana_mulai, rencana_selesai = a.rencana_selesai
    from activities a
    where b.baseline_id = v_baseline and b.activity_id = a.id and a.project_id = p;
    -- Aktivitas di luar slide (mis. urutan 6) tetap dipertahankan; target baseline tidak boleh lebih awal darinya.
    update baselines set tanggal_selesai = greatest(date '2026-10-28',
      (select max(rencana_selesai) from activities where project_id = p and status <> 'dibatalkan'))
    where id = v_baseline;
  end if;

  -- PICA: perbarui masalah terbuka pertama beserta aksinya.
  select id into v_iss from issues where project_id = p and status = 'terbuka' order by created_at limit 1;
  if v_iss is null then
    raise exception 'Masalah terbuka B.3.1 tidak ditemukan; catat PICA lewat aplikasi terlebih dahulu.';
  end if;
  update issues set judul = 'Pemenuhan kebutuhan jaringan internet di lantai 1 dan 2 Gedung Graha masih memerlukan router '
                         || 'pendukung agar jaringan Starlink yang berada di lantai 3 dapat masuk ke lantai 1 dan 2.'
  where id = v_iss;
  update actions set deskripsi = 'Menindaklanjuti proses pengadaan perangkat bersama Bagian Pengadaan serta berkoordinasi '
                              || 'dengan pihak Vijja Net untuk memastikan pemasangan, konfigurasi, dan pengujian konektivitas '
                              || 'jaringan dapat dilaksanakan secepatnya.'
  where id = (select id from actions where issue_id = v_iss and status <> 'dibatalkan' order by created_at limit 1);

  -- Update periode berjalan.
  select id into v_periode from report_periods where tanggal_mulai <= current_date order by tanggal_mulai desc limit 1;
  if v_periode is null then raise exception 'Periode laporan berjalan tidak ditemukan.'; end if;
  select * into v_upd from project_updates where project_id = p and period_id = v_periode;
  if v_upd.id is null then
    insert into project_updates (project_id, period_id) values (p, v_periode) returning * into v_upd;
  end if;
  -- Isi teks saja; trigger alur dimatikan sementara agar update yang sudah diajukan tetap dapat diisi.
  alter table project_updates disable trigger project_updates_alur;
  update project_updates set
    sudah_dilakukan = E'Koordinasi dengan pihak Vijja Net untuk pendataan peralatan yang dibutuhkan untuk pemasangan router baru di lantai 1 dan 2\n'
                   || 'Pengajuan kepada Direktur untuk pembelian alat untuk pemenuhan konektivitas jaringan internet',
    rencana_berikut = 'Pembelian barang melalui pengadaan barang di Bagian Pengadaan'
  where id = v_upd.id;
  alter table project_updates enable trigger project_updates_alur;
end;
$$;

commit;
