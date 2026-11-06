'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;

const kembali = (p: Record<string, string>, jangkar = ''): never => {
  revalidatePath('/', 'layout');
  redirect(`/pic?${new URLSearchParams(p)}${jangkar}`);
};
const pesanGalat = (m: string) =>
  m.includes('row-level security') ? 'Hanya Admin, Kabag, atau Kasubag yang dapat mengelola master PIC.'
    : m.includes('pics_lower_idx') || m.includes('duplicate key') ? 'Nama atau akun tersebut sudah terdaftar di master PIC.' : m;

function isian(form: FormData) {
  return {
    nama: teks(form, 'nama'),
    jabatan: teks(form, 'jabatan'),
    org_unit_id: teks(form, 'org_unit_id'),
    email: teks(form, 'email'),
    profile_id: teks(form, 'profile_id'),
  };
}

export async function tambahPic(form: FormData) {
  const data = isian(form);
  if (!data.nama) kembali({ galat: 'Nama PIC wajib diisi.' });
  const sb = await supabase();
  const { data: baru, error } = await sb.from('pics').insert(data).select('id').single();
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: `${data.nama} ditambahkan ke master PIC.` }, baru ? `#pic-${baru.id}` : '');
}

export async function ubahPic(form: FormData) {
  const id = String(form.get('id'));
  const data = isian(form);
  if (!data.nama) kembali({ galat: 'Nama PIC wajib diisi.' }, `#pic-${id}`);
  const sb = await supabase();
  const { error } = await sb.from('pics').update(data).eq('id', id);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: 'Data PIC diperbarui.' }, `#pic-${id}`);
}

// PIC tidak dihapus agar riwayat proyek tetap utuh; cukup dinonaktifkan sehingga tidak muncul di pilihan.
export async function ubahAktifPic(form: FormData) {
  const id = String(form.get('id'));
  const aktif = form.get('aktif') === 'true';
  const sb = await supabase();
  const { error } = await sb.from('pics').update({ aktif }).eq('id', id);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: aktif ? 'PIC diaktifkan kembali.' : 'PIC dinonaktifkan dan tidak lagi muncul di pilihan.' }, `#pic-${id}`);
}
