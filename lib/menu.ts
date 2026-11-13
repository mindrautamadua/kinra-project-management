import type { Peran } from './types';

// Menu yang tampil per peran. Pengguna dengan beberapa peran mendapat gabungan menunya.
// Akun aktif tanpa peran diperlakukan sebagai Pembaca. Halaman juga menolak dibuka langsung lewat URL (lihat wajibMenu).
const SEMUA: Peran[] = ['admin', 'direksi', 'kabag', 'kasubag', 'pic', 'operator', 'anggota', 'pembaca'];
export const AKSES_MENU: Record<string, Peran[]> = {
  '/': SEMUA,
  '/proyek': SEMUA,
  '/proyek/baru': ['admin', 'kabag', 'kasubag', 'operator', 'pic'],
  '/update': ['admin', 'kabag', 'kasubag', 'pic', 'operator'],
  '/isu': SEMUA,
  '/dukungan': ['admin', 'direksi', 'kabag', 'kasubag', 'pic'],
  '/ringkasan': ['admin', 'direksi', 'kabag', 'kasubag'],
  '/laporan': SEMUA,
  '/pic': ['admin', 'kabag', 'kasubag'],
  '/sasaran': ['admin', 'direksi', 'kabag', 'kasubag'],
  '/pengguna': ['admin'],
};

export function bolehMenu(peran: Peran[], href: string): boolean {
  const efektif: Peran[] = peran.length ? peran : ['pembaca'];
  return (AKSES_MENU[href] ?? SEMUA).some(r => efektif.includes(r));
}

export const menuUntuk = (peran: Peran[]) => Object.keys(AKSES_MENU).filter(h => bolehMenu(peran, h));

// Unit tempat pengguna boleh membuat proyek: unit perannya beserta turunannya (berdasarkan awalan kode unit).
const PEMBUAT: Peran[] = ['admin', 'kabag', 'kasubag', 'operator', 'pic'];
export function unitBolehBuat<T extends { id: string; kode: string }>(peran: { role: Peran; org_unit_id: string | null }[], unit: T[]): T[] {
  const r = peran.filter(x => PEMBUAT.includes(x.role));
  if (r.some(x => x.role === 'admin' || !x.org_unit_id)) return unit;
  const akar = r.map(x => unit.find(u => u.id === x.org_unit_id)?.kode).filter((k): k is string => !!k);
  return unit.filter(u => akar.some(k => u.kode === k || u.kode.startsWith(`${k}.`)));
}
