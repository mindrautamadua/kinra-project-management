'use server';

import { revalidatePath } from 'next/cache';
import { BUCKET_LAMPIRAN } from '@/lib/foto';
import { supabase } from '@/lib/supabase/server';

export type HasilUnggah = { ok: boolean; pesan: string };

const MAKS_FOTO = 10;
const JENIS = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Foto sudah diperkecil di browser (components/client/FotoAktivitas.tsx). Otorisasi ditegakkan RLS
// attachments dan storage.objects: hanya pengelola proyek atau PIC aktivitas yang dapat mengunggah.
export async function unggahFoto(form: FormData): Promise<HasilUnggah> {
  const projectId = String(form.get('project_id') ?? '');
  const activityId = String(form.get('activity_id') ?? '');
  const tanggal = String(form.get('tanggal') ?? '').trim() || null;
  // Satu keterangan per foto, urutannya sama dengan urutan foto.
  const keterangan = form.getAll('keterangan').map(k => String(k).trim() || null);
  const foto = form.getAll('foto').filter((f): f is File => f instanceof File && f.size > 0);
  if (!activityId) return { ok: false, pesan: 'Pilih aktivitas terlebih dahulu.' };
  if (foto.length === 0) return { ok: false, pesan: 'Pilih minimal satu foto.' };
  if (foto.length > MAKS_FOTO) return { ok: false, pesan: `Maksimal ${MAKS_FOTO} foto sekali unggah.` };
  if (foto.some(f => !JENIS.has(f.type))) return { ok: false, pesan: 'Hanya foto JPG, PNG, atau WebP yang dapat diunggah.' };

  const sb = await supabase();
  const { data: akt } = await sb.from('activities').select('id').eq('id', activityId).eq('project_id', projectId).maybeSingle();
  if (!akt) return { ok: false, pesan: 'Aktivitas tidak ditemukan pada proyek ini.' };

  const terunggah: string[] = [];
  for (const f of foto) {
    const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `aktivitas/${projectId}/${activityId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET_LAMPIRAN).upload(path, f, { contentType: f.type });
    if (error) {
      if (terunggah.length) await sb.storage.from(BUCKET_LAMPIRAN).remove(terunggah);
      return { ok: false, pesan: error.message.includes('row-level security') ? 'Hanya pengelola proyek atau PIC aktivitas yang dapat mengunggah foto.' : `Gagal mengunggah ${f.name}: ${error.message}` };
    }
    terunggah.push(path);
  }
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('attachments').insert(terunggah.map((path, i) => ({
    entitas: 'activity', entitas_id: activityId, storage_path: path, nama_file: foto[i].name,
    ukuran_byte: foto[i].size, keterangan: keterangan[i] ?? null, tanggal_kegiatan: tanggal, diunggah_oleh: user?.id,
  })));
  if (error) {
    await sb.storage.from(BUCKET_LAMPIRAN).remove(terunggah);
    return { ok: false, pesan: `Foto gagal dicatat: ${error.message}` };
  }
  revalidatePath(`/proyek/${projectId}`);
  revalidatePath(`/update/${projectId}`);
  revalidatePath('/laporan');
  return { ok: true, pesan: `${terunggah.length} foto diunggah.` };
}

export async function hapusFotoKegiatan(id: string, projectId: string): Promise<HasilUnggah> {
  const sb = await supabase();
  const { data: f } = await sb.from('attachments').select('storage_path').eq('id', id).maybeSingle();
  if (!f) return { ok: false, pesan: 'Foto tidak ditemukan.' };
  // Baris dihapus dulu: bila RLS menolak, file di Storage tetap utuh.
  const { data: terhapus, error } = await sb.from('attachments').delete().eq('id', id).select('id');
  if (error) return { ok: false, pesan: error.message };
  if (!terhapus?.length) return { ok: false, pesan: 'Hanya pengunggah foto atau Admin yang dapat menghapus foto.' };
  await sb.storage.from(BUCKET_LAMPIRAN).remove([f.storage_path]);
  revalidatePath(`/proyek/${projectId}`);
  revalidatePath(`/update/${projectId}`);
  revalidatePath('/laporan');
  return { ok: true, pesan: 'Foto dihapus.' };
}

// Versi form untuk galeri di halaman detail proyek.
export async function hapusFoto(form: FormData) {
  await hapusFotoKegiatan(String(form.get('id') ?? ''), String(form.get('project_id') ?? ''));
}

export async function ubahKeteranganFoto(id: string, keterangan: string, projectId: string): Promise<HasilUnggah> {
  const sb = await supabase();
  const { data, error } = await sb.from('attachments').update({ keterangan: keterangan.trim() || null }).eq('id', id).select('id');
  if (error) return { ok: false, pesan: error.message };
  if (!data?.length) return { ok: false, pesan: 'Hanya pengunggah foto atau Admin yang dapat mengubah keterangan.' };
  revalidatePath(`/proyek/${projectId}`);
  revalidatePath(`/update/${projectId}`);
  revalidatePath('/laporan');
  return { ok: true, pesan: 'Keterangan disimpan.' };
}

// Versi form untuk galeri di halaman detail proyek.
export async function simpanKeteranganFoto(form: FormData) {
  await ubahKeteranganFoto(String(form.get('id') ?? ''), String(form.get('keterangan') ?? ''), String(form.get('project_id') ?? ''));
}
