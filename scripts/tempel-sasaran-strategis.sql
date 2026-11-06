-- Tempel sasaran strategis RJPP 2026-2030 ke proyek yang tercatat.
-- Jalankan setelah migrasi 20261030030000_sasaran_strategis_rjpp.sql, sekali di SQL Editor Studio sebagai postgres.
-- Pencocokan per kata kunci nama proyek (kode bisa berubah saat pindah unit); aturan pertama yang cocok dipakai.
-- Hanya mengisi proyek yang belum punya sasaran, sehingga pilihan manual di form Ubah charter tidak tertimpa.
-- Kode sasaran: P1.x Performance Driven, P2.x Stability and Growth, P3.x New Business Expansion, E.x Enablers.

begin;

insert into project_objectives (project_id, objective_id)
select p.id, o.id
from (
  select distinct on (p.id) p.id, a.sasaran
  from projects p
  join (values
    -- Manajemen risiko
    (1,  'ERIN|Risk Intelligence',                array['E.10']),
    (2,  'BCMS|Business Continuity',              array['E.10', 'P2.1']),
    (3,  'Risk Maturity|\mRMI\M',                 array['E.10', 'E.7']),
    (4,  '\mRKAP\M',                              array['E.10', 'E.9']),
    -- Sistem manajemen dan kepatuhan
    (5,  '14001|Manajemen Lingkungan',            array['E.6', 'E.3']),
    (6,  '50001',                                 array['E.6', 'P2.4']),
    (7,  'Dashboard Sistem Manajemen Energi',     array['P2.4', 'E.6', 'P2.3']),
    (8,  '\mSOP\M',                               array['E.4']),
    (9,  '9001|Manajemen Mutu',                   array['E.3']),
    (10, '45001|Manajemen K3',                    array['E.3', 'P2.1']),
    (11, '\mK3\M',                                array['E.3', 'P2.1']),
    (12, '37001|Anti Penyuapan',                  array['E.7']),
    -- Aplikasi dan transformasi digital
    (13, 'Kebutuhan Digitalisasi',                array['P2.3', 'P3.4']),
    (14, 'e-Office',                              array['P3.4', 'E.8']),
    (15, 'Identity|\mIAM\M',                      array['P2.3', 'E.5']),
    (16, 'Single Sign|\mSSO\M',                   array['P2.3', 'E.5']),
    (17, 'Aduan|Ticketing',                       array['E.4', 'P2.3']),
    (18, '\mkWh\M',                               array['P2.3', 'P2.1', 'E.5']),
    (19, 'Mekanikal|\mMKE\M',                     array['P2.3', 'P2.1']),
    (20, 'Sekper|Kalender',                       array['P3.4', 'E.4']),
    (21, 'Keuangan|\mSAP\M',                      array['P2.3', 'E.9']),
    (22, '\mSEO\M|Website',                       array['E.1', 'P1.2']),
    (23, 'Ekspedisi',                             array['P3.4', 'E.4']),
    (24, '\mUAT\M',                               array['E.3', 'E.5']),
    -- Infrastruktur TI
    (25, 'Infrastruktur Digital|Subscription AI', array['E.5', 'P2.3']),
    (26, 'Starlink|Jaringan',                     array['E.5'])
  ) as a(urut, pola, sasaran) on p.nama ~* a.pola
  where p.status <> 'dibatalkan'
    and not exists (select 1 from project_objectives po where po.project_id = p.id)
  order by p.id, a.urut
) p
cross join lateral unnest(p.sasaran) k
join strategic_objectives o on o.tahun = 2026 and o.sumber = 'rjpp' and o.kode = k
on conflict do nothing;

commit;

-- Hasil: sasaran per proyek. Proyek yang masih kosong dipilihkan sasarannya lewat form Ubah charter.
select p.kode, p.nama,
       coalesce(string_agg(o.kode || ' ' || o.nama, '; ' order by o.urutan), '— belum ada —') as sasaran
from projects p
left join project_objectives po on po.project_id = p.id
left join strategic_objectives o on o.id = po.objective_id
where p.status <> 'dibatalkan'
group by p.id, p.kode, p.nama
order by p.kode;
