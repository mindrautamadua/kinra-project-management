-- Charter B.2.15 Investor Acquisition Dashboard (status Draf; charter sebelumnya kosong).
-- Referensi kebutuhan: sumber-data/Zonasi KEK Sei Mangkei - Saleable, Soldout, Unsaleable (Update September 2026).xlsx
--   Masterplan 1.933,8 Ha (realisasi 598,1 Ha, 30,9%); saleable 208 kavling 1.071,5 Ha dengan harga Rp625.000–818.000/m2;
--   sold out 98 kavling 433 Ha. Dashboard menghubungkan inventaris kavling ini dengan pipeline calon investor.
-- Executive Command Center Fase 1 (B.1) bergantung pada proyek ini: modul Pemasaran ECC (30 Nov–11 Des) memakai data
-- okupansi dan pipeline dari dashboard ini dan validasi data ECC dimulai 14 Des, sehingga data untuk ECC dijadwalkan
-- siap 4 Des (aktivitas 4), sehingga ECC punya sepekan sebelum modulnya selesai; go live dashboard 23 Des, sebelum UAT ECC selesai 22 Des dan go live ECC 30 Des.
-- Proyek dimulai 16 November 2026.
-- Aman dijalankan ulang: charter dan jadwal ditimpa, aktivitas dibuat bila belum ada atau jadwalnya diperbarui per urutan,
-- sasaran dan ketergantungan tidak terduplikasi.

begin;

do $$
declare
  p   uuid;
  ecc uuid;
begin
  select id into p from projects where kode = 'B.2.15' and nama ilike '%Investor Acquisition%';
  if p is null then raise exception 'Proyek B.2.15 Investor Acquisition Dashboard tidak ditemukan.'; end if;
  select id into ecc from projects where kode = 'B.1' and nama ilike '%Executive Command Center%';
  if ecc is null then raise exception 'Proyek B.1 Executive Command Center tidak ditemukan.'; end if;

  update projects set
    tanggal_mulai = '2026-11-16', tanggal_selesai = '2026-12-23',
    deskripsi = E'Dashboard akuisisi investor KEK Sei Mangkei yang menghubungkan inventaris lahan dengan pipeline calon investor. Inventaris memakai data zonasi Bagian Pemasaran (masterplan per zona; kavling saleable, sold out, dan unsaleable dengan luas dan harga per m2), sedangkan pipeline mencatat calon investor dari leads hingga perjanjian lahan beserta kavling yang diminati. Data okupansi dan pipeline menjadi sumber modul Pemasaran Executive Command Center Fase 1 (B.1).',
    tujuan = E'Menyediakan satu sumber data lahan tersedia dan pipeline calon investor yang mutakhir, agar Bagian Pemasaran dan pimpinan dapat menawarkan kavling yang sesuai kebutuhan investor, memantau konversi tiap tahapan, dan mengukur capaian okupansi lahan terhadap masterplan.',
    manfaat = E'Ketersediaan kavling (lokasi, luas, harga per m2) dapat dilihat seketika saat menanggapi calon investor, tanpa membuka spreadsheet zonasi\nOkupansi per zona terhadap masterplan dan sisa lahan saleable terpantau berkala\nKavling yang sedang ditawarkan atau dicadangkan untuk calon investor tercatat sehingga tidak ditawarkan ganda\nKonversi antartahapan pipeline dan calon investor yang tertahan cepat terlihat sehingga tindak lanjut dapat diprioritaskan\nModul Pemasaran Executive Command Center memakai angka okupansi dan pipeline yang sama dengan Bagian Pemasaran',
    ruang_lingkup = E'Masterplan per zona (Industri, Logistik, Pariwisata, Sarana Pelayanan Kawasan, Ruang Terbuka Hijau): luas rencana, realisasi, persentase realisasi, dan sisa okupansi\nInventaris kavling per zona dan ROW dengan status saleable, sold out, atau unsaleable, luas (Ha dan m2), dan harga per m2\nMigrasi data awal dari file "Zonasi KEK Sei Mangkei - Saleable, Soldout, Unsaleable (Update September 2026)" dan formulir pembaruan berkala oleh Bagian Pemasaran\nPipeline calon investor: profil perusahaan, sektor dan jenis pelaku usaha sesuai zona, kebutuhan lahan, nilai investasi, kavling yang diminati, PIC pemasaran, dan riwayat interaksi\nTahapan pipeline yang disepakati Bagian Pemasaran (leads, inquiry, kunjungan lapangan, LOI, MoU, perjanjian sewa/jual beli lahan, realisasi investasi); kavling berstatus dicadangkan selama negosiasi dan sold out setelah perjanjian\nVisualisasi okupansi per zona, ketersediaan kavling, potensi nilai penjualan lahan saleable (luas x harga per m2), serta funnel dan konversi pipeline\nPenyediaan data okupansi dan pipeline untuk modul Pemasaran Executive Command Center (B.1)\nIntegrasi IAM dan portal SSO, hak akses per peran (Pemasaran, pimpinan, Direksi)',
    di_luar_lingkup = E'Peta interaktif atau GIS kavling (dapat diusulkan sebagai pengembangan lanjutan)\nPengelolaan tenant setelah beroperasi (pemakaian listrik, layanan) — ditangani Dashboard MKE dan modul Tenant ECC\nPenagihan dan pencatatan keuangan transaksi lahan — ditangani Dashboard Keuangan (SAP)\nPenetapan harga lahan dan perubahan masterplan (dashboard hanya mencatat keputusan Bagian Pemasaran)\nOtomasi pemasaran (email blast, kampanye iklan) serta revamp website dan SEO — ditangani B.2.10',
    deliverable = E'Definisi tahapan pipeline, status kavling, dan kamus data yang disepakati Bagian Pemasaran\nData zonasi dan inventaris kavling termigrasi dari file zonasi September 2026\nData okupansi dan pipeline untuk modul Pemasaran Executive Command Center\nInvestor Acquisition Dashboard di produksi\nBerita acara UAT\nPanduan pengguna, termasuk prosedur pembaruan data zonasi',
    kriteria_selesai = E'Total luas dan jumlah kavling per zona dan status di dashboard sama dengan file zonasi September 2026, dikonfirmasi Bagian Pemasaran\nCalon investor aktif dari catatan Bagian Pemasaran termigrasi beserta tahapan dan kavling yang diminati\nData okupansi dan pipeline dipakai modul Pemasaran Executive Command Center sebelum validasi data ECC (14 Des)\nUAT bersama Bagian Pemasaran dinyatakan sesuai\nRilis produksi dan dapat dibuka dari portal SSO'
  where id = p;

  if not exists (select 1 from activities where project_id = p) then
    insert into activities (project_id, urutan, nama, rencana_mulai, rencana_selesai, deliverable, milestone)
    values
      (p, 1, 'Melakukan analisis kebutuhan bersama Bagian Pemasaran: tahapan pipeline, status kavling, dan indikator okupansi berdasarkan file zonasi', '2026-11-16', '2026-11-20', 'Definisi tahapan, status kavling, dan kamus data', false),
      (p, 2, 'Melakukan perancangan model data (zona, kavling, calon investor, tahapan) dan tampilan dashboard', '2026-11-19', '2026-11-25', 'Rancangan tampilan dan struktur data', false),
      (p, 3, 'Melakukan migrasi data masterplan dan inventaris kavling dari file zonasi September 2026 serta rekonsiliasi totalnya', '2026-11-24', '2026-11-27', 'Data zonasi dan kavling termigrasi', false),
      (p, 4, 'Melakukan penyediaan data okupansi per zona dan pipeline untuk modul Pemasaran Executive Command Center (B.1)', '2026-11-30', '2026-12-04', 'Data siap dipakai ECC', true),
      (p, 5, 'Melakukan pengembangan pencatatan calon investor, tahapan pipeline, kavling diminati, dan riwayat interaksi, serta integrasi IAM dan portal SSO', '2026-11-26', '2026-12-05', null, false),
      (p, 6, 'Melakukan pengembangan formulir pembaruan status kavling dan data zonasi oleh Bagian Pemasaran', '2026-12-01', '2026-12-05', null, false),
      (p, 7, 'Melakukan pengembangan visualisasi okupansi per zona, ketersediaan kavling, potensi nilai penjualan, serta funnel dan konversi pipeline', '2026-12-03', '2026-12-11', null, false),
      (p, 8, 'Melakukan migrasi data calon investor aktif dari catatan Bagian Pemasaran', '2026-12-07', '2026-12-11', 'Data pipeline termigrasi', false),
      (p, 9, 'Melakukan pengujian penerimaan pengguna (UAT) bersama Bagian Pemasaran dan perbaikan hasil pengujian', '2026-12-14', '2026-12-19', 'Berita acara UAT', false),
      (p, 10, 'Melakukan rilis produksi dan penyusunan panduan pengguna', '2026-12-21', '2026-12-23', 'Dashboard di produksi dan panduan pengguna', false),
      (p, 11, 'Go Live Investor Acquisition Dashboard', '2026-12-23', '2026-12-23', null, true);
  else
    update activities a set nama = v.nama, rencana_mulai = v.rm::date, rencana_selesai = v.rs::date, deliverable = v.dl, milestone = v.ms
    from (values
      (1, 'Melakukan analisis kebutuhan bersama Bagian Pemasaran: tahapan pipeline, status kavling, dan indikator okupansi berdasarkan file zonasi', '2026-11-16', '2026-11-20', 'Definisi tahapan, status kavling, dan kamus data', false),
      (2, 'Melakukan perancangan model data (zona, kavling, calon investor, tahapan) dan tampilan dashboard', '2026-11-19', '2026-11-25', 'Rancangan tampilan dan struktur data', false),
      (3, 'Melakukan migrasi data masterplan dan inventaris kavling dari file zonasi September 2026 serta rekonsiliasi totalnya', '2026-11-24', '2026-11-27', 'Data zonasi dan kavling termigrasi', false),
      (4, 'Melakukan penyediaan data okupansi per zona dan pipeline untuk modul Pemasaran Executive Command Center (B.1)', '2026-11-30', '2026-12-04', 'Data siap dipakai ECC', true),
      (5, 'Melakukan pengembangan pencatatan calon investor, tahapan pipeline, kavling diminati, dan riwayat interaksi, serta integrasi IAM dan portal SSO', '2026-11-26', '2026-12-05', null, false),
      (6, 'Melakukan pengembangan formulir pembaruan status kavling dan data zonasi oleh Bagian Pemasaran', '2026-12-01', '2026-12-05', null, false),
      (7, 'Melakukan pengembangan visualisasi okupansi per zona, ketersediaan kavling, potensi nilai penjualan, serta funnel dan konversi pipeline', '2026-12-03', '2026-12-11', null, false),
      (8, 'Melakukan migrasi data calon investor aktif dari catatan Bagian Pemasaran', '2026-12-07', '2026-12-11', 'Data pipeline termigrasi', false),
      (9, 'Melakukan pengujian penerimaan pengguna (UAT) bersama Bagian Pemasaran dan perbaikan hasil pengujian', '2026-12-14', '2026-12-19', 'Berita acara UAT', false),
      (10, 'Melakukan rilis produksi dan penyusunan panduan pengguna', '2026-12-21', '2026-12-23', 'Dashboard di produksi dan panduan pengguna', false),
      (11, 'Go Live Investor Acquisition Dashboard', '2026-12-23', '2026-12-23', null, true)
    ) as v(urutan, nama, rm, rs, dl, ms)
    where a.project_id = p and a.urutan = v.urutan;
  end if;

  insert into project_objectives (project_id, objective_id)
  select p, id from strategic_objectives where kode in ('P1.1', 'P1.3', 'P1.5', 'P2.3')
  on conflict do nothing;

  -- ECC bergantung pada dashboard ini; dashboard memakai KINRA IAM untuk hak akses.
  insert into project_dependencies (project_id, depends_on_id, keterangan)
  values (ecc, p, 'Sumber data modul Pemasaran (okupansi lahan dan pipeline calon investor), dibutuhkan paling lambat 11 Des')
  on conflict (project_id, depends_on_id) do update set keterangan = excluded.keterangan;
  insert into project_dependencies (project_id, depends_on_id, keterangan)
  select p, id, 'Hak akses dashboard memakai KINRA IAM' from projects where kode = 'B.2.1'
  on conflict do nothing;
end;
$$;

commit;
