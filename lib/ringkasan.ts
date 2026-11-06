import 'server-only';
import { daftarProyek } from './data';
import { hariIni } from './format';
import { supabase } from './supabase/server';
import type { Kesehatan, ProyekKesehatan } from './types';

const URUTAN: Kesehatan[] = ['selesai', 'belum_mulai', 'sesuai', 'data_belum_lengkap', 'waspada', 'terlambat', 'kritis'];
const peringkat = (s: Kesehatan | null) => (s ? URUTAN.indexOf(s) : -1);
const tambahHari = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Laporan dicetak kapan saja, bukan per minggu: "perubahan terbaru" dihitung mundur dari tanggal cetak.
export const JENDELA_PERUBAHAN = 30;

export interface Ringkasan {
  catatan: string | null;
  hariIni: string;
  aktif: ProyekKesehatan[];
  jumlah: Record<'kritis' | 'terlambat' | 'waspada' | 'sesuai' | 'lainnya' | 'selesai', number>;
  bidang: { kode: string; nama: string; kritis: number; terlambat: number; waspada: number; sesuai: number; lainnya: number }[];
  keputusan: Permintaan[];
  dukunganLain: number;
  perhatian: (ProyekKesehatan & { masalah: string | null; tindakan: string | null })[];
  perubahan: { selesai: { kode: string; nama: string }[]; baseline: { kode: string; nama: string; versi: number }[]; baru: { kode: string; nama: string }[] };
  mendatang: { kode: string; aktivitas: string; tanggal: string; milestone: boolean; proyek: string }[];
  isuUnit: { judul: string; keparahan: string; unit: string }[];
}

export interface Permintaan {
  id: string; permintaan: string; dampak_bila_tidak: string | null; tenggat: string;
  proyek_kode: string | null; ditujukan_nama: string; diajukan_nama: string | null; lewat_tenggat: boolean;
}

// Menyusun seluruh isi ringkasan eksekutif dari data; tidak ada angka yang diketik manusia selain catatan Kabag.
// `pilihan` (id proyek) membatasi ringkasan pada proyek yang dicetak; tanpa pilihan, seluruh portofolio.
export async function muatRingkasan(pilihan?: Set<string>): Promise<Ringkasan> {
  const sb = await supabase();
  const portofolio = await daftarProyek();
  const semua = pilihan ? portofolio.filter(p => pilihan.has(p.id)) : portofolio;
  const kodeDipilih = new Set(semua.map(p => p.kode));
  const masuk = (kode: string | null | undefined) => !pilihan || (!!kode && kodeDipilih.has(kode));
  const hari = hariIni();
  const sejak = tambahHari(hari, -JENDELA_PERUBAHAN);

  const [{ data: catatan }, { data: unitBidang }] = await Promise.all([
    sb.from('catatan_kabag').select('isi').maybeSingle(),
    sb.from('org_units').select('kode,nama').eq('level', 'bidang').order('kode'),
  ]);

  const aktif = semua.filter(p => p.status === 'aktif');
  const hitung = (rows: { status_kesehatan: Kesehatan | null }[], s: Kesehatan) => rows.filter(r => r.status_kesehatan === s).length;
  const jumlah = {
    kritis: hitung(aktif, 'kritis'),
    terlambat: hitung(aktif, 'terlambat'),
    waspada: hitung(aktif, 'waspada'),
    sesuai: hitung(aktif, 'sesuai'),
    lainnya: aktif.filter(p => !['kritis', 'terlambat', 'waspada', 'sesuai'].includes(p.status_kesehatan ?? '')).length,
    selesai: semua.filter(p => p.status === 'selesai').length,
  };

  const bidang = (unitBidang ?? []).map(b => {
    const rows = aktif.filter(p => p.unit_kode.split('.')[0] === b.kode);
    return {
      kode: b.kode, nama: b.nama,
      kritis: hitung(rows, 'kritis'), terlambat: hitung(rows, 'terlambat'), waspada: hitung(rows, 'waspada'), sesuai: hitung(rows, 'sesuai'),
      lainnya: rows.filter(p => !['kritis', 'terlambat', 'waspada', 'sesuai'].includes(p.status_kesehatan ?? '')).length,
    };
  });

  const idsPerhatian = aktif.filter(p => p.status_kesehatan === 'kritis' || p.status_kesehatan === 'terlambat')
    .sort((a, b) => peringkat(b.status_kesehatan) - peringkat(a.status_kesehatan) || (a.spi ?? 0) - (b.spi ?? 0))
    .slice(0, 5);

  const [{ data: dukungan }, { data: issues }, { data: selesai }, { data: baseline }, { data: baru }, { data: akt }, { data: isu }] = await Promise.all([
    sb.from('v_dukungan_terbuka').select('id,jenis,permintaan,dampak_bila_tidak,tenggat,proyek_kode,ditujukan_nama,diajukan_nama,lewat_tenggat').order('tenggat'),
    idsPerhatian.length
      ? sb.from('issues').select('project_id,judul,created_at,actions(deskripsi,status)').in('project_id', idsPerhatian.map(p => p.id)).eq('status', 'terbuka').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    sb.from('projects').select('kode,nama').eq('status', 'selesai').gte('tanggal_selesai_aktual', sejak),
    sb.from('baselines').select('versi,projects!baselines_project_id_fkey(kode,nama)').eq('status', 'disetujui').gt('versi', 1).gte('diputuskan_at', sejak),
    sb.from('projects').select('kode,nama').gte('created_at', sejak),
    sb.from('activities').select('nama,rencana_selesai,milestone,status,projects!inner(kode,nama,status)')
      .eq('projects.status', 'aktif').not('status', 'in', '(selesai,dibatalkan)').gte('rencana_selesai', hari).lte('rencana_selesai', tambahHari(hari, 28)),
    sb.from('issues').select('judul,keparahan,org_units(kode)').is('project_id', null).eq('status', 'terbuka'),
  ]);

  type Isu = { project_id: string; judul: string; actions: { deskripsi: string; status: string }[] };
  const perhatian = idsPerhatian.map(p => {
    const m = ((issues ?? []) as Isu[]).find(i => i.project_id === p.id);
    const a = m?.actions.find(x => x.status !== 'selesai' && x.status !== 'dibatalkan');
    return { ...p, masalah: m?.judul ?? null, tindakan: a?.deskripsi ?? null };
  });

  const KEPARAHAN = ['kritis', 'tinggi', 'sedang', 'rendah'];
  type Akt = { nama: string; rencana_selesai: string; milestone: boolean; projects: { kode: string; nama: string } };
  const semuaDukungan = ((dukungan ?? []) as (Permintaan & { jenis: string })[]).filter(d => masuk(d.proyek_kode));

  return {
    catatan: catatan?.isi ?? null,
    hariIni: hari,
    aktif,
    jumlah,
    bidang,
    keputusan: semuaDukungan.filter(d => d.jenis === 'keputusan'),
    dukunganLain: semuaDukungan.filter(d => d.jenis !== 'keputusan').length,
    perhatian,
    perubahan: {
      selesai: ((selesai ?? []) as { kode: string; nama: string }[]).filter(p => masuk(p.kode)),
      baseline: ((baseline ?? []) as unknown as { versi: number; projects: { kode: string; nama: string } | null }[])
        .flatMap(b => (b.projects && masuk(b.projects.kode) ? [{ ...b.projects, versi: b.versi }] : [])),
      baru: ((baru ?? []) as { kode: string; nama: string }[]).filter(p => masuk(p.kode)),
    },
    mendatang: ((akt ?? []) as unknown as Akt[]).filter(a => masuk(a.projects.kode))
      .sort((a, b) => Number(b.milestone) - Number(a.milestone) || a.rencana_selesai.localeCompare(b.rencana_selesai))
      .slice(0, 6)
      .sort((a, b) => a.rencana_selesai.localeCompare(b.rencana_selesai))
      .map(a => ({ kode: a.projects.kode, proyek: a.projects.nama, aktivitas: a.nama, tanggal: a.rencana_selesai, milestone: a.milestone })),
    // Isu tingkat unit tidak melekat pada proyek; hanya tampil untuk ringkasan seluruh portofolio.
    isuUnit: pilihan ? [] : ((isu ?? []) as unknown as { judul: string; keparahan: string; org_units: { kode: string } | null }[])
      .sort((a, b) => KEPARAHAN.indexOf(a.keparahan) - KEPARAHAN.indexOf(b.keparahan))
      .slice(0, 3)
      .map(i => ({ judul: i.judul, keparahan: i.keparahan, unit: i.org_units?.kode ?? '' })),
  };
}
