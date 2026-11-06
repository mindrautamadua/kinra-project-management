-- Master sasaran strategis dari RJPP 2026-2030 PT KINRA (Bab III Strategi Utama dan Sasaran Perusahaan).
-- Tiga pilar strategis beserta pilar utamanya (Performance Driven, Stability and Growth, New Business Expansion)
-- dan fondasi pendukung (enablers). Sasaran dipilih per proyek di form charter; dikelola Admin di halaman Sasaran Strategis.
-- Sasaran tidak dihapus agar riwayat proyek tetap utuh; cukup dinonaktifkan sehingga tidak muncul di pilihan.

alter table strategic_objectives add column if not exists pilar text;
alter table strategic_objectives add column if not exists uraian text;
alter table strategic_objectives add column if not exists urutan int not null default 0;
alter table strategic_objectives add column if not exists aktif boolean not null default true;

insert into strategic_objectives (tahun, sumber, kode, pilar, nama, uraian, urutan) values
  (2026, 'rjpp', 'P1.1', 'Pilar 1 · Performance Driven', 'Okupansi Lahan',
   'Optimalisasi lahan eksisting, ekspansi bertahap, dan kemitraan untuk menarik tenant hilirisasi; target pemasaran lahan 100 Ha pada 2030.', 11),
  (2026, 'rjpp', 'P1.2', 'Pilar 1 · Performance Driven', 'Marketing Strategy (4P)',
   'Strategi product, price, place, dan promotion terintegrasi untuk menarik tenant hilirisasi sawit, karet, dan industri pendukung.', 12),
  (2026, 'rjpp', 'P1.3', 'Pilar 1 · Performance Driven', 'Marketing Intelligence',
   'Analisis pasar dan pendekatan geo-ekonomi untuk menentukan sektor dan wilayah pemasaran paling potensial.', 13),
  (2026, 'rjpp', 'P1.4', 'Pilar 1 · Performance Driven', 'Rantai Pasok Terintegrasi',
   'Pengembangan tenant baru yang terhubung dalam rantai pasok dan green industrial cluster berbasis ekonomi sirkular.', 14),
  (2026, 'rjpp', 'P1.5', 'Pilar 1 · Performance Driven', 'Customer Relationship Management',
   'Sistem CRM terpadu, standar layanan berbasis SLA, dan engagement tenant; target survei kepuasan minimal 81%.', 15),
  (2026, 'rjpp', 'P2.1', 'Pilar 2 · Stability and Growth', 'Penguatan Bisnis Eksisting',
   'Keandalan utilitas (reliability >99%) untuk listrik, air bersih, pengolahan limbah, tank farm, dan dry port.', 21),
  (2026, 'rjpp', 'P2.2', 'Pilar 2 · Stability and Growth', 'Pengembangan dengan Mitra Strategis',
   'Kemitraan PPP, JV, atau BOT untuk pembiayaan dan percepatan ekspansi utilitas serta infrastruktur kawasan.', 22),
  (2026, 'rjpp', 'P2.3', 'Pilar 2 · Stability and Growth', 'Peningkatan Daya Saing melalui Penerapan IT',
   'Digitalisasi dan otomasi proses bisnis untuk mengurangi proses manual; roadmap IT hingga 2027 dan IT terintegrasi untuk monitoring, billing, dan kontrol utilitas.', 23),
  (2026, 'rjpp', 'P2.4', 'Pilar 2 · Stability and Growth', 'Utilitas Berbasis Green Energy',
   'Daur ulang limbah cair menjadi air bersih, embung, konservasi air, serta pembangkit energi terbarukan (PLTS, PLTBm).', 24),
  (2026, 'rjpp', 'P3.1', 'Pilar 3 · New Business Expansion', 'Peningkatan Jasa Pelayanan',
   'Kualitas dan inovasi layanan bisnis baru (SFB, IKM, parkir, MICE, perumahan), layanan responsif, dan service excellence.', 31),
  (2026, 'rjpp', 'P3.2', 'Pilar 3 · New Business Expansion', 'New Business Initiatives',
   'Pengembangan perparkiran, perumahan, zona IKM, Standard Factory Building, dan fasilitas MICE.', 32),
  (2026, 'rjpp', 'P3.3', 'Pilar 3 · New Business Expansion', 'Mitra Strategis Bisnis Baru',
   'Kemitraan dengan investor dan operator berkualitas untuk mempercepat realisasi bisnis baru.', 33),
  (2026, 'rjpp', 'P3.4', 'Pilar 3 · New Business Expansion', 'Transformasi Digital',
   'Sistem IT terpadu untuk monitoring, billing, dan operasional serta integrasi teknologi ke seluruh proses bisnis.', 34),
  (2026, 'rjpp', 'E.1', 'Fondasi pendukung (Enablers)', 'Branding & Commercial Excellence',
   'Branding melalui stakeholder, positioning, pemasaran dan promosi, hubungan investor dan tenant, serta word of mouth.', 41),
  (2026, 'rjpp', 'E.2', 'Fondasi pendukung (Enablers)', 'Cost of Good Sales',
   'Pengendalian biaya kunci dan optimalisasi proses untuk efisiensi tanpa mengorbankan kualitas layanan.', 42),
  (2026, 'rjpp', 'E.3', 'Fondasi pendukung (Enablers)', 'Commitment to Quality',
   'Quality management system terintegrasi, standar kualitas yang konsisten, dan quality assurance di seluruh layanan.', 43),
  (2026, 'rjpp', 'E.4', 'Fondasi pendukung (Enablers)', 'Process Excellence',
   'Reviu dan perbaikan proses berkala, standar kerja dan KPI terukur, serta budaya continuous improvement.', 44),
  (2026, 'rjpp', 'E.5', 'Fondasi pendukung (Enablers)', 'New Technology',
   'Adopsi teknologi digital, platform terintegrasi untuk tenant, aset, dan data, IoT dan smart systems, serta otomasi proses.', 45),
  (2026, 'rjpp', 'E.6', 'Fondasi pendukung (Enablers)', 'Sustainable Operations',
   'Operasional ramah lingkungan, pengurangan jejak karbon melalui efisiensi dan energi terbarukan, serta pengelolaan limbah menuju zero waste.', 46),
  (2026, 'rjpp', 'E.7', 'Fondasi pendukung (Enablers)', 'Governance & Organization',
   'Penguatan model bisnis, tata kelola anak perusahaan, serta struktur organisasi yang efisien dan jelas perannya.', 47),
  (2026, 'rjpp', 'E.8', 'Fondasi pendukung (Enablers)', 'People & Culture',
   'Pelatihan, knowledge sharing, talent pool, budaya kerja AKHLAK, dan remunerasi berbasis kinerja.', 48),
  (2026, 'rjpp', 'E.9', 'Fondasi pendukung (Enablers)', 'Financial Structure & Selective Investment',
   'Keseimbangan sumber pendanaan, pengelolaan keuangan yang efisien, dan investasi selektif berbasis kajian kelayakan.', 49),
  (2026, 'rjpp', 'E.10', 'Fondasi pendukung (Enablers)', 'Proactive Risk Mitigation',
   'Identifikasi dan antisipasi risiko sejak dini serta manajemen risiko sebagai keunggulan kompetitif.', 50)
on conflict (tahun, sumber, kode) do update
  set pilar = excluded.pilar, nama = excluded.nama, uraian = excluded.uraian, urutan = excluded.urutan;

notify pgrst, 'reload schema';
