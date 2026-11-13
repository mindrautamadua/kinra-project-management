'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DAFTAR_PERAN, PERAN } from '@/lib/peran';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import type { Peran } from '@/lib/types';

// Otorisasi ditegakkan RLS (profiles dan user_roles hanya dapat ditulis Admin); pemeriksaan di sini untuk pesan yang jelas.
const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;

const kembali = (p: Record<string, string>, jangkar = ''): never => {
  revalidatePath('/', 'layout');
  redirect(`/pengguna?${new URLSearchParams(p)}${jangkar}`);
};
const pesanGalat = (m: string) => (m.includes('row-level security') ? 'Hanya Admin yang dapat mengelola pengguna dan peran.' : m);

async function wajibAdmin() {
  const saya = await penggunaSaatIni();
  if (!saya.peran.some(r => r.role === 'admin')) kembali({ galat: 'Hanya Admin yang dapat mengelola pengguna dan peran.' });
  return saya;
}

export async function ubahProfil(form: FormData) {
  await wajibAdmin();
  const id = String(form.get('id'));
  const nama = teks(form, 'nama');
  if (!nama) kembali({ galat: 'Nama wajib diisi.' }, `#u-${id}`);
  const sb = await supabase();
  const { data, error } = await sb.from('profiles')
    .update({ nama, jabatan: teks(form, 'jabatan'), org_unit_id: teks(form, 'org_unit_id') }).eq('id', id).select('id');
  if (!error && !data?.length) kembali({ galat: 'Profil tidak dapat diubah.' }, `#u-${id}`);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: `Profil ${nama} disimpan.` }, `#u-${id}`);
}

export async function ubahAktif(form: FormData) {
  const saya = await wajibAdmin();
  const id = String(form.get('id'));
  const aktif = form.get('aktif') === 'true';
  if (id === saya.id && !aktif) kembali({ galat: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' }, `#u-${id}`);
  const sb = await supabase();
  const { data, error } = await sb.from('profiles').update({ aktif }).eq('id', id).select('nama');
  if (!error && !data?.length) kembali({ galat: 'Profil tidak dapat diubah.' }, `#u-${id}`);
  kembali(error ? { galat: pesanGalat(error.message) }
    : { ok: aktif ? `${data![0].nama} diaktifkan. Pastikan sudah diberi peran.` : `${data![0].nama} dinonaktifkan dan tidak dapat lagi membuka aplikasi.` }, `#u-${id}`);
}

export async function tambahPeran(form: FormData) {
  await wajibAdmin();
  const userId = String(form.get('user_id'));
  const role = String(form.get('role')) as Peran;
  const unit = teks(form, 'org_unit_id');
  if (!DAFTAR_PERAN.includes(role)) kembali({ galat: 'Pilih peran.' }, `#u-${userId}`);
  if (PERAN[role].perluUnit && !unit) kembali({ galat: `Peran ${PERAN[role].label} wajib diberi unit.` }, `#u-${userId}`);
  const sb = await supabase();
  const { error } = await sb.from('user_roles').insert({ user_id: userId, role, org_unit_id: PERAN[role].perluUnit ? unit : null });
  kembali(error ? { galat: error.message.includes('duplicate key') ? 'Peran tersebut sudah dimiliki pengguna ini.' : pesanGalat(error.message) }
    : { ok: `Peran ${PERAN[role].label} ditambahkan.` }, `#u-${userId}`);
}

export async function hapusPeran(form: FormData) {
  const saya = await wajibAdmin();
  const id = String(form.get('id'));
  const userId = String(form.get('user_id'));
  const sb = await supabase();
  const { data: r } = await sb.from('user_roles').select('role,user_id').eq('id', id).maybeSingle();
  if (r?.role === 'admin' && r.user_id === saya.id) kembali({ galat: 'Anda tidak dapat mencabut peran Admin dari akun Anda sendiri.' }, `#u-${userId}`);
  const { data, error } = await sb.from('user_roles').delete().eq('id', id).select('id');
  if (!error && !data?.length) kembali({ galat: 'Peran tidak dapat dicabut.' }, `#u-${userId}`);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: 'Peran dicabut.' }, `#u-${userId}`);
}
