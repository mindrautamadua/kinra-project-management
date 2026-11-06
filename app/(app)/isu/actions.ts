'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;
const KEPARAHAN = ['rendah', 'sedang', 'tinggi', 'kritis'];

const kembali = (p: Record<string, string>, jangkar = ''): never => {
  revalidatePath('/', 'layout');
  redirect(`/isu?${new URLSearchParams(p)}${jangkar}`);
};
const pesanGalat = (m: string) => (m.includes('row-level security') ? 'Anda tidak berwenang mengubah isu di unit ini.' : m);

// Isu tingkat unit (tanpa proyek): pengganti tabel "Current Issue" di slide mingguan.
export async function tambahIsu(form: FormData) {
  const sb = await supabase();
  const judul = teks(form, 'judul');
  if (!judul || judul.length < 10) kembali({ galat: 'Tulis isu secara spesifik (minimal 10 karakter).' });
  const keparahan = KEPARAHAN.includes(String(form.get('keparahan'))) ? String(form.get('keparahan')) : 'sedang';
  const { data, error } = await sb.from('issues').insert({
    project_id: null,
    org_unit_id: teks(form, 'org_unit_id'),
    judul,
    dampak: teks(form, 'dampak'),
    akar_masalah: teks(form, 'akar_masalah'),
    keparahan,
    owner_id: teks(form, 'owner_id'),
  }).select('id').single();
  if (error) kembali({ galat: pesanGalat(error.message) });
  const aksi = teks(form, 'aksi');
  if (aksi) {
    const { error: e } = await sb.from('actions').insert({
      issue_id: data!.id, deskripsi: aksi, owner_id: teks(form, 'aksi_owner_id') ?? teks(form, 'owner_id'), tanggal_target: teks(form, 'tanggal_target'),
    });
    if (e) kembali({ galat: `Isu tersimpan, tetapi aksi gagal: ${pesanGalat(e.message)}` }, `#isu-${data!.id}`);
  }
  kembali({ ok: 'Isu dicatat.' }, `#isu-${data!.id}`);
}

export async function ubahIsu(form: FormData) {
  const id = String(form.get('id'));
  const sb = await supabase();
  const { error } = await sb.from('issues').update({
    judul: teks(form, 'judul'), dampak: teks(form, 'dampak'), akar_masalah: teks(form, 'akar_masalah'),
    keparahan: String(form.get('keparahan')), owner_id: teks(form, 'owner_id'),
  }).eq('id', id);
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: 'Isu diperbarui.' }, `#isu-${id}`);
}

export async function tambahAksi(form: FormData) {
  const id = String(form.get('issue_id'));
  const sb = await supabase();
  const { error } = await sb.from('actions').insert({
    issue_id: id, deskripsi: teks(form, 'aksi'), owner_id: teks(form, 'owner_id'), tanggal_target: teks(form, 'tanggal_target'),
  });
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: 'Aksi ditambahkan.' }, `#isu-${id}`);
}

export async function ubahStatusIsu(form: FormData) {
  const sb = await supabase();
  const aksiId = teks(form, 'action_id');
  const isuId = String(form.get('issue_id'));
  const status = String(form.get('status'));
  const { error } = aksiId
    ? await sb.from('actions').update({ status }).eq('id', aksiId)
    : await sb.from('issues').update({ status }).eq('id', isuId);
  const pesan = aksiId ? 'Status aksi diperbarui.' : status === 'ditutup' ? 'Isu ditutup.' : 'Isu dibuka kembali.';
  kembali(error ? { galat: pesanGalat(error.message) } : { ok: pesan }, `#isu-${isuId}`);
}
