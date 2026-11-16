import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabase } from './supabase/server';
import { bolehMenu } from './menu';
import type { Peran } from './types';

export interface Pengguna {
  id: string; email: string; nama: string; aktif: boolean; jabatan: string | null;
  peran: { role: Peran; org_unit_id: string | null }[];
}

// Pengguna yang sedang login beserta profil dan perannya. Satu kali per permintaan.
export const penggunaSaatIni = cache(async (): Promise<Pengguna> => {
  const sb = await supabase();
  // Verifikasi JWT lokal (ES256) tanpa bolak-balik ke server Auth; status aktif tetap dibaca dari profil.
  const { data } = await sb.auth.getClaims();
  const user = data?.claims.sub ? { id: data.claims.sub, email: data.claims.email } : null;
  if (!user) redirect('/login');

  const [{ data: profil }, { data: peran }] = await Promise.all([
    sb.from('profiles').select('nama,aktif,jabatan').eq('id', user.id).maybeSingle(),
    sb.from('user_roles').select('role,org_unit_id').eq('user_id', user.id),
  ]);
  return {
    id: user.id,
    email: user.email ?? '',
    nama: profil?.nama ?? user.email ?? '',
    aktif: profil?.aktif ?? false,
    jabatan: profil?.jabatan ?? null,
    peran: (peran ?? []) as Pengguna['peran'],
  };
});

// Tolak halaman menu yang tidak sesuai peran pengguna (menu disembunyikan, URL langsung diarahkan ke dasbor).
export async function wajibMenu(href: string): Promise<Pengguna> {
  const saya = await penggunaSaatIni();
  if (!bolehMenu(saya.peran.map(r => r.role), href)) redirect('/');
  return saya;
}

export const bolehReview = (p: Pengguna) => p.peran.some(r => ['admin', 'kabag', 'kasubag'].includes(r.role));
