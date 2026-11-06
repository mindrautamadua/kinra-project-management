import type { Kesehatan } from './types';

const nf = (d: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d });

export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

type N = number | null | undefined;

export const angka = (v: N, d = 0) => (v == null || Number.isNaN(v) ? '–' : nf(d).format(v));
export const persen = (v: N, d = 0) => (v == null ? '–' : `${angka(v, d)}%`);

// Input Rp juta -> "Rp339,3 M" (miliar) / "Rp850 jt"
export function rupiah(juta: N, d = 1) {
  if (juta == null) return '–';
  const abs = Math.abs(juta);
  const tanda = juta < 0 ? '−' : '';
  if (abs >= 1e6) return `${tanda}Rp${nf(2).format(abs / 1e6)} T`;
  if (abs >= 1000) return `${tanda}Rp${nf(d).format(abs / 1000)} M`;
  return `${tanda}Rp${nf(0).format(abs)} jt`;
}

// '2026-10-30' -> '30 Okt 2026' (atau '30 Okt' bila tahun = false)
export function tgl(iso: string | null | undefined, tahun = true) {
  if (!iso) return '–';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${BULAN[m - 1]}${tahun ? ` ${y}` : ''}`;
}

// Tanggal hari ini di WIB (server bisa berjalan dalam UTC).
export const hariIni = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

export type KodeStatus = 'good' | 'warn' | 'serious' | 'crit' | 'na' | 'info';

// Satu makna = satu warna + ikon + label (PRD §8.2).
export const KESEHATAN: Record<Kesehatan, { kode: KodeStatus; label: string }> = {
  selesai: { kode: 'info', label: 'Selesai' },
  belum_mulai: { kode: 'na', label: 'Belum mulai' },
  data_belum_lengkap: { kode: 'na', label: 'Data belum lengkap' },
  sesuai: { kode: 'good', label: 'Sesuai rencana' },
  waspada: { kode: 'warn', label: 'Waspada' },
  terlambat: { kode: 'serious', label: 'Terlambat' },
  kritis: { kode: 'crit', label: 'Kritis' },
};

export const STATUS_UPDATE: Record<string, { kode: KodeStatus; label: string }> = {
  draf: { kode: 'na', label: 'Draf' },
  diajukan: { kode: 'good', label: 'Terverifikasi' },
  direview: { kode: 'good', label: 'Terverifikasi' },
  dikembalikan: { kode: 'warn', label: 'Dikembalikan' },
  disetujui: { kode: 'good', label: 'Disetujui' },
  terkunci: { kode: 'good', label: 'Terkunci' },
};

export const STATUS_PROYEK: Record<string, string> = {
  draf: 'Draf', aktif: 'Aktif', ditunda: 'Ditunda', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
};

// Cerminan fn_kesehatan di database, dipakai untuk pratinjau di formulir sebelum diajukan.
// Database tetap sumber kebenaran saat update diajukan.
export function hitungKesehatan(rencana: N, aktual: N, selesaiBaseline: string | null, jmlAktivitas: number, tanggal: string): Kesehatan {
  if (!jmlAktivitas || !selesaiBaseline) return 'data_belum_lengkap';
  const r = rencana ?? 0, a = aktual ?? 0;
  // Seluruh aktivitas tuntas: tidak Kritis walau lewat tanggal selesai baseline, tinggal ditutup Selesai.
  if (a >= 100) return 'sesuai';
  if (tanggal > selesaiBaseline) return 'kritis';
  if (r === 0 && a === 0) return 'belum_mulai';
  if (r < 10) return r - a <= 5 ? 'sesuai' : r - a <= 10 ? 'waspada' : 'terlambat';
  const spi = a / r;
  return spi >= 0.95 ? 'sesuai' : spi >= 0.85 ? 'waspada' : spi >= 0.7 ? 'terlambat' : 'kritis';
}

const URUTAN: Kesehatan[] = ['selesai', 'belum_mulai', 'sesuai', 'data_belum_lengkap', 'waspada', 'terlambat', 'kritis'];
export const lebihBuruk = (a: Kesehatan, b: Kesehatan) => (URUTAN.indexOf(a) >= URUTAN.indexOf(b) ? a : b);
export const pilihanOverride = (dari: Kesehatan) => URUTAN.slice(URUTAN.indexOf(dari) + 1).filter(s => s !== 'data_belum_lengkap');
