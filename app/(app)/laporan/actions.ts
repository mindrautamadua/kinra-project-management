'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { KUE_PILIHAN } from '@/lib/pilihan-laporan';

// Pilihan cetak disimpan sebagai daftar proyek yang dikecualikan, sehingga proyek baru otomatis ikut tercetak.
// Hanya proyek yang tampil di daftar saat itu yang diperbarui; pengecualian di luar filter aktif tetap dipertahankan.
export async function simpanPilihan(form: FormData) {
  const kue = await cookies();
  const tampil = new Set(form.getAll('tampil').map(String));
  const dicentang = new Set(form.getAll('p').map(String));
  const lama = (kue.get(KUE_PILIHAN)?.value ?? '').split(',').filter(Boolean);
  const baru = [...lama.filter(id => !tampil.has(id)), ...[...tampil].filter(id => !dicentang.has(id))];
  if (baru.length) kue.set(KUE_PILIHAN, baru.join(','), { path: '/laporan', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true });
  else kue.delete({ name: KUE_PILIHAN, path: '/laporan' });
  const kembali = String(form.get('kembali') ?? '');
  redirect(kembali.startsWith('/laporan') ? kembali : '/laporan');
}

export async function pilihSemua(form: FormData) {
  (await cookies()).delete({ name: KUE_PILIHAN, path: '/laporan' });
  const kembali = String(form.get('kembali') ?? '');
  redirect(kembali.startsWith('/laporan') ? kembali : '/laporan');
}
