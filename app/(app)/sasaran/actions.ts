'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;

const kembali = (p: Record<string, string>, jangkar = ''): never => {
  revalidatePath('/', 'layout');
  redirect(`/sasaran?${new URLSearchParams(p)}${jangkar}`);
};
const pesanGalat = (m: string) =>
  m.includes('row-level security') ? 'Hanya Admin yang dapat mengelola master sasaran strategis.'
    : m.includes('duplicate key') ? 'Kode sasaran tersebut sudah terdaftar untuk tahun dan sumber yang sama.' : m;

function isian(form: FormData) {
  return {
    kode: teks(form, 'kode'),
    nama: teks(form, 'nama'),
    pilar: teks(form, 'pilar'),
    uraian: teks(form, 'uraian'),
    urutan: Number(teks(form, 'urutan')) || 0,
  };
}

export async function tambahSasaran(form: FormData) {
  const data = isian(form);
  if (!data.kode || !data.nama) kembali({ galat: 'Kode dan nama sasaran wajib diisi.' });
  const sb = await supabase();
  const { data: baru, error } = await sb.from('strategic_objectives')
    .insert({ ...data, tahun: Number(teks(form, 'tahun')) || 2026, sumber: teks(form, 'sumber') ?? 'rjpp' })
    .select('id').single();
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: `Sasaran ${data.kode} ditambahkan.` }, baru ? `#sasaran-${baru.id}` : '');
}

export async function ubahSasaran(form: FormData) {
  const id = String(form.get('id'));
  const data = isian(form);
  if (!data.kode || !data.nama) kembali({ galat: 'Kode dan nama sasaran wajib diisi.' }, `#sasaran-${id}`);
  const sb = await supabase();
  const { error } = await sb.from('strategic_objectives').update(data).eq('id', id);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: 'Sasaran diperbarui.' }, `#sasaran-${id}`);
}

// Sasaran tidak dihapus agar riwayat proyek tetap utuh; cukup dinonaktifkan sehingga tidak muncul di pilihan.
export async function ubahAktifSasaran(form: FormData) {
  const id = String(form.get('id'));
  const aktif = form.get('aktif') === 'true';
  const sb = await supabase();
  const { error } = await sb.from('strategic_objectives').update({ aktif }).eq('id', id);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: aktif ? 'Sasaran diaktifkan kembali.' : 'Sasaran dinonaktifkan dan tidak lagi muncul di pilihan.' }, `#sasaran-${id}`);
}
