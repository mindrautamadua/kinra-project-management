-- Proyek baru: Penyediaan Perangkat Kerja (Laptop) untuk Kebutuhan Karyawan, sub bidang Infrastructure & Operation (B.3).
-- Sumber: slide weekly update "B3.3 Penyediaan Perangkat Kerja (Laptop)", target W4 Oktober 2026, progres 100%.
-- Kode B.3.3 di aplikasi sudah dipakai "Pengembangan Fitur Memorandum Aplikasi e-Office", jadi proyek ini memakai
-- nomor B.3.x berikutnya.
--
-- Proyek sudah tuntas: dibuat, diaktifkan (baseline v1 = tanggal target slide), lalu ditutup Selesai.
-- Minggu ke-n dipetakan seperti data awal: M1 = 1–7, M2 = 8–14, M3 = 15–21, M4 = 22–28.
-- Tujuan, manfaat, ruang lingkup, di luar lingkup, dan kriteria selesai disusun dari deskripsi dan aktivitas slide;
-- PIC dapat mengoreksinya lewat form Ubah charter. Sasaran strategis tidak disebut di slide, jadi dibiarkan kosong.
-- PIC disalin dari B.3.1 (unit yang sama).
-- Aman dijalankan ulang: bila proyek dengan nama ini sudah ada, skrip berhenti tanpa perubahan.
-- Jalankan sekali di SQL Editor Studio sebagai postgres.

begin;

do $$
declare
  v_nama text := 'Penyediaan Perangkat Kerja (Laptop) untuk Kebutuhan Karyawan';
  v_ref projects;
  v_kode text;
  p uuid;
begin
  if exists (select 1 from projects where nama = v_nama) then
    raise notice 'Proyek "%" sudah ada; tidak ada perubahan.', v_nama;
    return;
  end if;

  select * into v_ref from projects where kode = 'B.3.1';
  if v_ref.id is null then raise exception 'Proyek B.3.1 (acuan unit dan PIC) tidak ditemukan.'; end if;
  v_kode := 'B.3.' || (select coalesce(max(split_part(kode, '.', 3)::int), 0) + 1
                       from projects where kode ~ '^B\.3\.[0-9]+$');

  insert into projects (kode, nama, deskripsi, org_unit_id, pic_id, tanggal_mulai, tanggal_selesai,
                        tujuan, manfaat, ruang_lingkup, di_luar_lingkup, deliverable, kriteria_selesai)
  values (v_kode, v_nama,
    'Penyediaan perangkat kerja berupa laptop melalui skema sewa untuk mendukung produktivitas dan kelancaran '
      || 'operasional karyawan, sekaligus menyeragamkan standar perangkat kerja di lingkungan Perusahaan.',
    v_ref.org_unit_id, v_ref.pic_id, '2026-08-15', '2026-10-28',
    'Karyawan memiliki perangkat kerja (laptop) yang layak dan seragam untuk mendukung kegiatan operasional perusahaan.',
    E'Produktivitas karyawan tidak terhambat perangkat kerja yang kurang memadai\n'
      || E'Standar perangkat kerja seragam sehingga dukungan dan perawatan TI lebih mudah\n'
      || 'Skema sewa menghindari belanja modal besar dan beban perawatan perangkat',
    E'Pengajuan permohonan persetujuan penyediaan laptop kepada Direktur\n'
      || E'Pemenuhan dokumen administrasi pengadaan\n'
      || E'Upload dokumen pengadaan ke IPS dan proses pengadaan\n'
      || E'Serah terima laptop dengan penyedia\n'
      || 'Pemeriksaan laptop sebelum digunakan karyawan',
    E'Pembelian perangkat (penyediaan melalui skema sewa)\n'
      || E'Perangkat kerja selain laptop (printer, monitor, aksesori)\n'
      || 'Pengadaan lisensi perangkat lunak di luar paket sewa',
    E'Persetujuan Direktur atas permohonan penyediaan laptop\n'
      || E'Dokumen administrasi pengadaan lengkap dan terunggah di IPS\n'
      || E'Berita acara serah terima laptop dengan penyedia\n'
      || 'Hasil pemeriksaan laptop',
    E'Laptop diterima dari penyedia dan lolos pemeriksaan\n'
      || 'Laptop sudah digunakan karyawan untuk kegiatan operasional')
  returning id into p;

  insert into project_pics (project_id, pic_id, utama)
  select p, pic_id, utama from project_pics where project_id = v_ref.id;

  insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, progres, status, aktual_mulai, aktual_selesai)
  values
    (p, 1, 'Pengajuan permohonan persetujuan penyediaan perangkat kerja (laptop) untuk kebutuhan karyawan kepada Direktur',
        '2026-08-15', '2026-08-21', 100, 'selesai', '2026-08-22', '2026-08-28'),
    (p, 2, 'Pemenuhan dokumen administrasi untuk pengadaan penyediaan perangkat kerja',
        '2026-09-08', '2026-09-14', 100, 'selesai', '2026-09-15', '2026-09-21'),
    (p, 3, 'Proses upload ke IPS dokumen yang diperlukan untuk penyediaan perangkat kerja',
        '2026-09-22', '2026-09-28', 100, 'selesai', '2026-09-22', '2026-09-28'),
    (p, 4, 'Serah terima barang dengan penyedia perangkat kerja',
        '2026-10-08', '2026-10-14', 100, 'selesai', '2026-10-15', '2026-10-21'),
    (p, 5, 'Pemeriksaan perangkat kerja yang akan digunakan karyawan',
        '2026-10-22', '2026-10-28', 100, 'selesai', '2026-10-22', '2026-10-28');

  -- Aktifkan (baseline v1 terbentuk otomatis), lalu tutup sebagai Selesai.
  update projects set status = 'aktif' where id = p;
  update projects set status = 'selesai', tanggal_selesai_aktual = '2026-10-28' where id = p;

  raise notice 'Proyek % "%" dibuat dan ditutup Selesai.', v_kode, v_nama;
end;
$$;

select kode, nama, status, tanggal_mulai, tanggal_selesai, tanggal_selesai_aktual
from projects where nama = 'Penyediaan Perangkat Kerja (Laptop) untuk Kebutuhan Karyawan';

commit;
