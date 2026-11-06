import { BULAN } from './format';
import type { DetailProyek } from './data';
import type { Aktivitas } from './types';

export interface Minggu { label: string; mulai: string; akhir: string }
export interface Bulan { label: string; minggu: Minggu[] }

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const hariDalamBulan = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// Kolom minggu per bulan dengan konvensi laporan: M1 = 1–7, M2 = 8–14, M3 = 15–21, M4 = 22–28, M5 = 29–akhir.
export function kolomMinggu(dari: string, sampai: string): Bulan[] {
  const [y0, m0] = dari.split('-').map(Number);
  const [y1, m1] = sampai.split('-').map(Number);
  const hasil: Bulan[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
    const akhirBulan = hariDalamBulan(y, m);
    const minggu: Minggu[] = [];
    for (let n = 1; (n - 1) * 7 + 1 <= akhirBulan; n++) {
      minggu.push({ label: String(n), mulai: iso(y, m, (n - 1) * 7 + 1), akhir: iso(y, m, Math.min(n * 7, akhirBulan)) });
    }
    hasil.push({ label: `${BULAN[m - 1]}${hasil.length === 0 || m === 1 ? ` ${y}` : ''}`, minggu });
  }
  return hasil;
}

export const beririsan = (w: Minggu, a: string | null, b: string | null) => !!a && !!b && a <= w.akhir && b >= w.mulai;

export type StatusAktivitas = 'selesai' | 'berjalan' | 'tertunda' | 'perhatian' | 'batal';

// Legenda slide lama, kini otomatis: Selesai · Rencana/on-going · Sedikit tertunda · Perlu perhatian khusus.
export function statusAktivitas(a: Aktivitas, rencanaSelesai: string | null, hariIni: string): StatusAktivitas {
  if (a.status === 'dibatalkan') return 'batal';
  if (a.status === 'selesai') return 'selesai';
  if (!rencanaSelesai || hariIni <= rencanaSelesai) return 'berjalan';
  const telat = (Date.parse(hariIni) - Date.parse(rencanaSelesai)) / 864e5;
  return telat <= 14 ? 'tertunda' : 'perhatian';
}

export const LABEL_STATUS_AKTIVITAS: Record<StatusAktivitas, string> = {
  selesai: 'Selesai', berjalan: 'Rencana / on-going', tertunda: 'Sedikit tertunda', perhatian: 'Perlu perhatian khusus', batal: 'Dibatalkan',
};

// Rentang tampilan Gantt: dari bulan mulai paling awal sampai bulan selesai paling akhir (baseline, aktual, hari ini).
export function rentangCharter(d: DetailProyek, hariIni: string): [string, string] | null {
  const t = d.aktivitas.flatMap(a => [d.baseline[a.id]?.rencana_mulai ?? a.rencana_mulai, d.baseline[a.id]?.rencana_selesai ?? a.rencana_selesai, a.aktual_mulai, a.aktual_selesai])
    .filter(Boolean) as string[];
  if (!t.length) return null;
  if (d.proyek.status === 'aktif') t.push(hariIni);
  return [t.reduce((a, b) => (a < b ? a : b)), t.reduce((a, b) => (a > b ? a : b))];
}

// Kelengkapan charter: field yang diisi manusia. Sisanya (progres, status, PICA) dihitung sistem.
export function kelengkapan(d: DetailProyek) {
  const p = d.proyek;
  const isi: [string, boolean][] = [
    ['Tujuan', !!(p.tujuan ?? p.deskripsi)?.trim()],
    ['Ruang lingkup', !!p.ruang_lingkup?.trim()],
    ['Di luar lingkup', !!p.di_luar_lingkup?.trim()],
    ['Deliverable', !!p.deliverable?.trim() || d.aktivitas.some(a => a.deliverable?.trim())],
    ['Kriteria selesai', !!p.kriteria_selesai?.trim()],
    // Sponsor sementara tidak dihitung: ['Sponsor', !!p.sponsor],
    ['Aktivitas bertanggal', d.aktivitas.length > 0 && d.aktivitas.every(a => a.rencana_mulai && a.rencana_selesai)],
  ];
  return { terisi: isi.filter(([, ok]) => ok).length, total: isi.length, kosong: isi.filter(([, ok]) => !ok).map(([n]) => n) };
}

