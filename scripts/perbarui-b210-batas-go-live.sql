-- B.2.10 Optimasi SEO dan Revamp Website: batas proyek sampai Go Live website baru (31 Des 2026).
-- Sebelumnya proyek berjalan sampai 4 Nov 2027 termasuk pendampingan SEO pasca Go Live.
-- Aktivitas pasca Go Live (urutan 14, 15, 16, 17, 18: artikel Jan–Mar 2027, evaluasi konten, backlink, pemantauan AI)
-- dihapus (baris baseline_activities dan snapshot ikut terhapus lewat cascade); aktivitas 13 dan 19 dipangkas sampai 31 Des.
-- Hanya aktivitas yang belum mulai yang dihapus.
-- Proyek aktif: setelah skrip ini, ajukan baseline baru dari aplikasi (Ubah proyek).
-- Aman dijalankan ulang.

begin;

do $$
declare p uuid;
begin
  select id into p from projects where kode = 'B.2.10' and nama ilike '%SEO%';
  if p is null then raise exception 'Proyek B.2.10 tidak ditemukan.'; end if;

  update projects set
    tanggal_selesai = '2026-12-31',
    deskripsi = E'Pembangunan website baru KINRA Sei Mangkei SEZ oleh Tim IT KINRA dengan Next.js dan Supabase, disertai pendampingan SEO oleh konsultan PT Tagme Indonesia Kreasi (Spindonesia), rekanan Bagian Pemasaran, sampai website baru Go Live: fondasi teknis, metadata dan schema, migrasi konten, serta konten awal. Pendampingan SEO pasca Go Live (artikel 2027, backlink, visibilitas AI) di luar proyek ini.',
    tujuan = E'Website baru KINRA Sei Mangkei SEZ (Next.js dan Supabase) Go Live 31 Desember 2026 dengan fondasi SEO siap: Core Web Vitals lulus, metadata dan schema terpasang, seluruh URL lama teralihkan, dan baseline KPI tercatat sebagai acuan pengukuran pasca Go Live.',
    manfaat = E'Calon investor lebih mudah menemukan KINRA lewat pencarian Google dan asisten AI\nLeads dan inquiry investor dari website dapat dilacak sejak Go Live\nWebsite lebih cepat dan nyaman diakses di ponsel karena Core Web Vitals lulus\nKonten dan artikel dapat diperbarui sendiri oleh Pemasaran lewat CMS tanpa bergantung vendor\nWebsite dikelola Tim IT KINRA dengan teknologi yang sama dengan aplikasi KINRA lain (Next.js dan Supabase)',
    ruang_lingkup = E'Pembangunan website baru dengan Next.js dan Supabase oleh Tim IT KINRA: CMS artikel, formulir inquiry, migrasi konten, dan redirect URL lama\nPendampingan SEO oleh konsultan Spindonesia: baseline KPI dan audit teknis (CLS, LCP, unused CSS/JS)\nCore Web Vitals, metadata, dan schema landing page (Home, Siteplan, Tentang Kami) di website baru\nKalender konten dan artikel batch Desember yang tayang saat Go Live\nPengajuan sitemap ke Google Search Console saat Go Live\nLaporan kinerja bulanan November–Desember 2026',
    di_luar_lingkup = E'Pendampingan SEO pasca Go Live: produksi artikel Januari–Maret 2027, evaluasi konten dan internal linking, backlink/digital PR, serta pemantauan referral AI dan authority\nTarget peringkat keyword (7 keyword utama masuk Top 10) dan kenaikan traffic organik — diukur pasca Go Live\nPaid media (CNN, CNBC, Kompas) dan iklan berbayar\nPerubahan informasi komersial tanpa validasi KINRA',
    deliverable = E'Website baru (Next.js + Supabase) di produksi beserta CMS dan panduan pengelolaan konten\nBerita acara UAT website baru\nInception report dan baseline KPI\nTechnical SEO audit\nLaporan validasi CLS, LCP, dan CSS/JS website baru\nMetadata dan JSON-LD schema landing page\nOn-page optimization report\nKalender konten dan artikel batch Desember\nLaporan keyword ranking awal dan laporan bulanan November–Desember 2026',
    kriteria_selesai = E'Website baru Go Live paling lambat 31 Desember 2026 dan seluruh URL lama teralihkan (redirect 301)\nCLS <0,1 dan 0 URL bermasalah; LCP <2,5 detik; unused CSS/JS <20 KiB\nSitemap website baru diajukan dan terbaca di Google Search Console\nArtikel batch Desember tayang saat Go Live dan disetujui KINRA\nSeluruh deliverable diterima KINRA dan baseline KPI tercatat untuk pengukuran pasca Go Live'
  where id = p;

  update activities set nama = 'Produksi dan publikasi artikel batch Desember untuk tayang saat Go Live (Konsultan Spindonesia)', rencana_selesai = '2026-12-31' where project_id = p and urutan = 13;
  update activities set nama = 'Laporan kinerja bulanan November–Desember 2026 (Konsultan Spindonesia)', rencana_selesai = '2026-12-31', deliverable = 'Laporan bulanan November dan Desember', milestone = false where project_id = p and urutan = 19;
  delete from activities
  where project_id = p and urutan in (14, 15, 16, 17, 18) and status = 'belum_mulai' and progres = 0;
end;
$$;

commit;

-- Rapikan urutan setelah aktivitas 14–18 dihapus: laporan bulanan (dulu 19) menjadi 14.
update activities set urutan = 14
where urutan = 19 and project_id = (select id from projects where kode = 'B.2.10' and nama ilike '%SEO%')
  and not exists (select 1 from activities a join projects p on p.id = a.project_id where p.kode = 'B.2.10' and a.urutan = 14);
