import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabase } from './supabase/server';
import type { Peran } from './types';

export interface Pengguna {
  id: string; email: string; nama: string; aktif: boolean; jabatan: string | null;
  peran: { role: Peran; org_unit_id: string | null }[];
}

// Pengguna yang sedang login beserta profil dan perannya. Satu kali per permintaan.
export const penggunaSaatIni = cache(async (): Promise<Pengguna> => {
  const sb = await supabase();
  const { data: { user } } = await sb.auth.getUser();
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

export const bolehReview = (p: Pengguna) => p.peran.some(r => ['admin', 'kabag', 'kasubag'].includes(r.role));
