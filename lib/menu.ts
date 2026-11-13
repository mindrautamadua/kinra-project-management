import type { Peran } from './types';

// Menu yang tampil per peran. Pengguna dengan beberapa peran mendapat gabungan menunya.
// Akun aktif tanpa peran diperlakukan sebagai Pembaca. Halaman juga menolak dibuka langsung lewat URL (lihat wajibMenu).
const SEMUA: Peran[] = ['admin', 'direksi', 'kabag', 'kasubag', 'pic', 'operator', 'anggota', 'pembaca'];
export const AKSES_MENU: Record<string, Peran[]> = {
  '/': SEMUA,
  '/proyek': SEMUA,
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
