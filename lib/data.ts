import 'server-only';
import { supabase } from './supabase/server';
import type { Aktivitas, Masalah, Periode, Pic, ProyekKesehatan, Sasaran, UpdateMingguan } from './types';

type Hasil = PromiseLike<{ data: unknown; error: { message: string } | null }>;

// Lempar galat yang jelas bila query gagal, alih-alih menampilkan data kosong secara diam-diam.
// Klien tanpa tipe hasil generate; bentuk baris ditetapkan lewat parameter T.
async function q<T>(p: Hasil, nama: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${nama}: ${error.message}`);
  return data as T;
}

// PostgREST dapat mengembalikan numeric sebagai string; paksa jadi number.
function num<T>(rows: T[], keys: (keyof T)[]): T[] {
  return rows.map(r => {
    const o = { ...r } as Record<keyof T, unknown>;
    for (const k of keys) if (o[k] != null) o[k] = Number(o[k]);
    return o as T;
  });
}

const KOLOM_ANGKA: (keyof ProyekKesehatan)[] = ['progres_rencana', 'progres_aktual', 'spi', 'masalah_terbuka', 'aksi_terlambat', 'dukungan_menunggu', 'ketergantungan_terbuka'];

export async function periodeBerjalan(): Promise<Periode> {
  const sb = await supabase();
  return q<Periode>(sb.rpc('fn_periode_berjalan').single(), 'fn_periode_berjalan');
}

export async function daftarProyek(): Promise<ProyekKesehatan[]> {
  const sb = await supabase();
  const rows = await q<ProyekKesehatan[]>(sb.from('v_proyek_kesehatan').select('*').order('kode'), 'v_proyek_kesehatan');
  return num(rows, KOLOM_ANGKA);
}

export interface Dukungan {
  id: string; permintaan: string; dampak_bila_tidak: string | null; tenggat: string; status: string;
  ditujukan_ke: string; ditujukan_nama: string; diajukan_nama: string | null;
  proyek_kode: string | null; proyek_nama: string | null; project_id: string | null; lewat_tenggat: boolean;
}

export async function dukunganTerbuka(): Promise<Dukungan[]> {
  const sb = await supabase();
  return q<Dukungan[]>(sb.from('v_dukungan_terbuka').select('*').order('tenggat'), 'v_dukungan_terbuka');
}

export interface Pemeriksaan {
  belumDiajukan: { kode: string; nama: string }[];
  rebaseline: { kode: string; nama: string }[];
  aksiTerlambat: number;
  drafTanpaData: { kode: string; nama: string }[];
  rutinTerlambat: { nama: string; periode: string }[];
}

// Pemeriksaan kualitas laporan minggu berjalan (panel "Pemeriksaan otomatis").
export async function pemeriksaan(periode: Periode, proyek: ProyekKesehatan[]): Promise<Pemeriksaan> {
  const sb = await supabase();
  const hari = new Date().toISOString().slice(0, 10);
  const [updates, rebaseline, aksi, draf, rutin] = await Promise.all([
    q<{ project_id: string; status: string }[]>(sb.from('project_updates').select('project_id,status').eq('period_id', periode.id), 'project_updates'),
    q<{ projects: { kode: string; nama: string } | null }[]>(
      sb.from('baselines').select('projects!baselines_project_id_fkey(kode,nama)').eq('status', 'disetujui').gt('versi', 1)
        .gte('diputuskan_at', periode.tanggal_mulai), 'baselines'),
    q<{ id: string }[]>(sb.from('actions').select('id').in('status', ['terbuka', 'berjalan']).lt('tanggal_target', hari), 'actions'),
    q<{ kode: string; nama: string }[]>(sb.from('projects').select('kode,nama').eq('status', 'draf').or('tanggal_selesai.is.null,tanggal_mulai.is.null'), 'projects'),
    q<{ periode: string; routine_tasks: { nama: string } | null }[]>(
      sb.from('routine_occurrences').select('periode,routine_tasks(nama)').is('dikirim_at', null).lt('jatuh_tempo', hari), 'routine_occurrences'),
  ]);
  const sudah = new Set(updates.filter(u => !['draf', 'dikembalikan'].includes(u.status)).map(u => u.project_id));
  return {
    belumDiajukan: proyek.filter(p => p.status === 'aktif' && !sudah.has(p.id)).map(p => ({ kode: p.kode, nama: p.nama })),
    rebaseline: rebaseline.flatMap(r => (r.projects ? [r.projects] : [])),
    aksiTerlambat: aksi.length,
    drafTanpaData: draf,
    rutinTerlambat: rutin.map(r => ({ nama: r.routine_tasks?.nama ?? '–', periode: r.periode })),
  };
}

export interface DetailProyek {
  proyek: {
    id: string; kode: string; nama: string; deskripsi: string | null; status: string; kriteria_selesai: string | null;
    anggaran_rp_juta: number | null; tanggal_mulai: string | null; tanggal_selesai: string | null;
    tujuan: string | null; manfaat: string | null; ruang_lingkup: string | null; di_luar_lingkup: string | null; deliverable: string | null;
    sponsor_id: string | null; pic_id: string | null; org_unit_id: string;
    org_units: { kode: string; nama: string } | null;
    pic: { nama: string; jabatan: string | null } | null; sponsor: { nama: string; jabatan: string | null } | null;
  };
  // PIC dari master, PIC utama di depan.
  pics: (Pic & { utama: boolean })[];
  sasaran: Pick<Sasaran, 'id' | 'sumber' | 'kode' | 'nama' | 'pilar' | 'urutan'>[];
  ketergantungan: { id: string; kode: string; nama: string; status: string; keterangan: string | null }[];
  aktivitas: Aktivitas[];
  baseline: Record<string, { rencana_mulai: string; rencana_selesai: string; bobot: number }>;
  masalah: Masalah[];
  riwayat: (UpdateMingguan & { report_periods: { label: string; tanggal_mulai: string } | null })[];
  dukungan: { id: string; permintaan: string; tenggat: string; status: string; tanggapan: string | null }[];
  ringkas: ProyekKesehatan | null;
}

export async function detailProyek(id: string): Promise<DetailProyek | null> {
  const sb = await supabase();
  const proyek = await q<DetailProyek['proyek'] & { baseline_aktif_id: string | null; project_pics: { utama: boolean; pics: Pic | null }[] } | null>(
    sb.from('projects')
      .select('id,kode,nama,deskripsi,status,kriteria_selesai,anggaran_rp_juta,tanggal_mulai,tanggal_selesai,tujuan,manfaat,ruang_lingkup,di_luar_lingkup,deliverable,sponsor_id,pic_id,org_unit_id,baseline_aktif_id,org_units(kode,nama),project_pics(utama,pics(id,nama,jabatan,org_unit_id,email,profile_id,aktif)),pic:profiles!projects_pic_id_fkey(nama,jabatan),sponsor:pics!projects_sponsor_id_fkey(nama,jabatan)')
      .eq('id', id).maybeSingle(),
    'projects');
  if (!proyek) return null;

  const [aktivitas, baseline, masalah, riwayat, dukungan, ringkas, sasaran, ketergantungan] = await Promise.all([
    q<Aktivitas[]>(sb.from('activities').select('*').eq('project_id', id).order('urutan'), 'activities'),
    proyek.baseline_aktif_id
      ? q<{ activity_id: string; rencana_mulai: string; rencana_selesai: string; bobot: number }[]>(
          sb.from('baseline_activities').select('activity_id,rencana_mulai,rencana_selesai,bobot').eq('baseline_id', proyek.baseline_aktif_id), 'baseline_activities')
      : Promise.resolve([]),
    q<Masalah[]>(sb.from('issues').select('id,jenis,judul,dampak,akar_masalah,keparahan,kemungkinan,skor_dampak,status,owner_id,actions(id,deskripsi,owner_id,tanggal_target,status)').eq('project_id', id).order('created_at', { ascending: false }), 'issues'),
    q<DetailProyek['riwayat']>(sb.from('project_updates').select('*,report_periods(label,tanggal_mulai)').eq('project_id', id), 'project_updates'),
    q<DetailProyek['dukungan']>(sb.from('support_requests').select('id,permintaan,tenggat,status,tanggapan').eq('project_id', id).order('tenggat'), 'support_requests'),
    q<ProyekKesehatan | null>(sb.from('v_proyek_kesehatan').select('*').eq('id', id).maybeSingle(), 'v_proyek_kesehatan'),
    q<{ strategic_objectives: DetailProyek['sasaran'][number] | null }[]>(
      sb.from('project_objectives').select('strategic_objectives(id,sumber,kode,nama,pilar,urutan)').eq('project_id', id), 'project_objectives'),
    q<{ keterangan: string | null; projects: Omit<DetailProyek['ketergantungan'][number], 'keterangan'> | null }[]>(
      sb.from('project_dependencies').select('keterangan,projects!project_dependencies_depends_on_id_fkey(id,kode,nama,status)').eq('project_id', id), 'project_dependencies'),
  ]);

  riwayat.sort((a, b) => (b.report_periods?.tanggal_mulai ?? '').localeCompare(a.report_periods?.tanggal_mulai ?? ''));
  const { project_pics: relasiPic, ...dataProyek } = proyek;
  return {
    proyek: dataProyek,
    pics: relasiPic.flatMap(r => (r.pics ? [{ ...r.pics, utama: r.utama }] : []))
      .sort((a, b) => Number(b.utama) - Number(a.utama) || a.nama.localeCompare(b.nama)),
    aktivitas: num(aktivitas, ['bobot', 'progres']),
    baseline: Object.fromEntries(baseline.map(b => [b.activity_id, { ...b, bobot: Number(b.bobot) }])),
    masalah,
    riwayat: num(riwayat, ['progres_rencana', 'progres_aktual', 'spi']),
    dukungan,
    ringkas: ringkas ? num([ringkas], KOLOM_ANGKA)[0] : null,
    sasaran: sasaran.flatMap(s => (s.strategic_objectives ? [s.strategic_objectives] : [])).sort((a, b) => a.urutan - b.urutan),
    ketergantungan: ketergantungan.flatMap(k => (k.projects ? [{ ...k.projects, keterangan: k.keterangan }] : [])),
  };
}

// Master PIC. Default hanya yang aktif; halaman master memuat semuanya.
export async function daftarPic(semua = false): Promise<Pic[]> {
  const sb = await supabase();
  let kueri = sb.from('pics').select('id,nama,jabatan,org_unit_id,email,profile_id,aktif').order('nama');
  if (!semua) kueri = kueri.eq('aktif', true);
  return q(kueri, 'pics');
}

// Master sasaran strategis, urut pilar. Default hanya yang aktif; halaman master memuat semuanya.
export async function daftarSasaran(semua = false): Promise<Sasaran[]> {
  const sb = await supabase();
  let kueri = sb.from('strategic_objectives').select('id,tahun,sumber,kode,nama,pilar,uraian,urutan,aktif').order('urutan').order('kode');
  if (!semua) kueri = kueri.eq('aktif', true);
  return q(kueri, 'strategic_objectives');
}

export async function profilAktif(): Promise<{ id: string; nama: string; jabatan: string | null }[]> {
  const sb = await supabase();
  return q(sb.from('profiles').select('id,nama,jabatan').eq('aktif', true).order('nama'), 'profiles');
}

export interface Unit { id: string; kode: string; nama: string; level: string }

export async function daftarUnit(): Promise<Unit[]> {
  const sb = await supabase();
  return q(sb.from('org_units').select('id,kode,nama,level').eq('aktif', true).order('kode'), 'org_units');
}
