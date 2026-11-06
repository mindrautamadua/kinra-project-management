-- B.2.10 Optimasi SEO dan Revamp Website KINRA Sei Mangkei SEZ: tandai pelaksana tiap aktivitas.
-- Revamp website (implementasi teknis di situs) dikerjakan Tim IT KINRA. Pendampingan SEO (audit, metadata,
-- konten, backlink, pemantauan, laporan) dikerjakan konsultan PT Tagme Indonesia Kreasi (Spindonesia),
-- rekanan Bagian Pemasaran.
-- Pelaksana ditambahkan di akhir nama aktivitas agar terlihat di Gantt dan charter, dan di awal catatan.
-- Aman dijalankan ulang: aktivitas yang namanya sudah memuat label pelaksana dilewati.

begin;

update activities a set
  nama    = a.nama || ' (' || v.label || ')',
  catatan = 'Pelaksana: ' || v.lengkap || '.' || coalesce(' ' || nullif(trim(a.catatan), ''), '')
from projects p,
  (values
    (1,  'Konsultan Spindonesia & Tim IT KINRA', 'Konsultan SEO PT Tagme Indonesia Kreasi (Spindonesia) bersama Tim IT KINRA dan Bagian Pemasaran'),
    (2,  'Konsultan Spindonesia', null), (3,  'Konsultan Spindonesia', null), (4,  'Konsultan Spindonesia', null),
    (5,  'Tim IT KINRA', null), (6,  'Tim IT KINRA', null), (7,  'Tim IT KINRA', null),
    (8,  'Tim IT KINRA', null), (9,  'Tim IT KINRA', null),
    (10, 'Konsultan Spindonesia', null), (11, 'Konsultan Spindonesia', null), (12, 'Konsultan Spindonesia', null),
    (13, 'Konsultan Spindonesia', null), (14, 'Konsultan Spindonesia', null), (15, 'Konsultan Spindonesia', null),
    (16, 'Konsultan Spindonesia', null), (17, 'Konsultan Spindonesia', null)
  ) as v0(urutan, label, lengkap0),
  lateral (select v0.urutan, v0.label,
    coalesce(v0.lengkap0, case v0.label
      when 'Tim IT KINRA' then 'Tim IT KINRA (revamp website)'
      else 'Konsultan SEO PT Tagme Indonesia Kreasi (Spindonesia), rekanan Bagian Pemasaran' end) as lengkap) v
where p.kode = 'B.2.10' and a.project_id = p.id and a.urutan = v.urutan
  and a.nama not like '%(Tim IT KINRA)' and a.nama not like '%(Konsultan Spindonesia%';

commit;

-- Pembaruan 6 Nov 2026 (sudah diterapkan langsung ke database lewat REST, dicatat di sini sebagai riwayat):
-- Revamp = Tim IT KINRA membangun website baru dengan Next.js dan Supabase, Go Live 31 Desember 2026.
-- * Aktivitas konsultan 10–17 digeser menjadi urutan 12–19.
-- * Aktivitas IT 5–9 (perbaikan schema, CLS, LCP, code cleanup, on-page di website lama) diubah menjadi:
--   5 Analisis dan perancangan website baru (9–20 Nov), 6 Fondasi Next.js + Supabase, CMS, inquiry (16 Nov–11 Des),
--   7 Halaman utama memenuhi Core Web Vitals (23 Nov–18 Des), 8 Metadata, schema JSON-LD, on-page (7–18 Des),
--   9 Migrasi konten, redirect 301, sitemap XML (14–22 Des).
-- * Aktivitas baru: 10 UAT dan QA SEO (21–29 Des), 11 Go Live (31 Des, milestone).
-- * Charter: deskripsi, ruang lingkup, deliverable, dan kriteria selesai memuat pembangunan website baru.

-- Manfaat (hanya bila masih kosong).
update projects set manfaat =
  E'Calon investor lebih mudah menemukan KINRA lewat pencarian Google dan asisten AI\n'
  || E'Leads dan inquiry investor dari website bertambah dan dapat dilacak\n'
  || E'Website lebih cepat dan nyaman diakses di ponsel karena Core Web Vitals lulus\n'
  || E'Konten dan artikel dapat diperbarui sendiri oleh Pemasaran lewat CMS tanpa bergantung vendor\n'
  || 'Website dikelola Tim IT KINRA dengan teknologi yang sama dengan aplikasi KINRA lain (Next.js dan Supabase)'
where kode = 'B.2.10' and nullif(trim(manfaat), '') is null;

-- Pembaruan 6 Nov 2026 (diterapkan lewat REST, dicatat sebagai riwayat):
-- * Tujuan memuat Go Live website baru 31 Desember 2026.
-- * Pekerjaan dihitung mulai 5 November 2026: proyek 5 Nov 2026 – 4 Nov 2027 (durasi 12 bulan tetap).
--   Aktivitas konsultan (1–4, 12–19) digeser +35 hari; aktivitas 5 mulai 5 Nov; aktivitas IT 6–11 dan Go Live tetap.
--   Label batch artikel menjadi (Desember) dan (Januari–Maret); ruang lingkup artikel menjadi Des 2026–Mar 2027.
