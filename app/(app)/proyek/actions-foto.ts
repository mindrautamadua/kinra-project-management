'use server';

import { revalidatePath } from 'next/cache';
import { BUCKET_LAMPIRAN } from '@/lib/foto';
import { hariIni } from '@/lib/format';
import { supabase } from '@/lib/supabase/server';

export type HasilUnggah = { ok: boolean; pesan: string };

const MAKS_FOTO = 10;
const JENIS = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Foto sudah diperkecil di browser (components/client/FotoAktivitas.tsx). Otorisasi ditegakkan RLS
// attachments dan storage.objects: hanya pengelola proyek atau PIC aktivitas yang dapat mengunggah.
export async function unggahFoto(form: FormData): Promise<HasilUnggah> {
  const projectId = String(form.get('project_id') ?? '');
  const activityId = String(form.get('activity_id') ?? '');
  // Satu keterangan dan satu tanggal pelaksanaan per foto, urutannya sama dengan urutan foto.
  const tanggal = form.getAll('tanggal').map(t => String(t).trim());
  const keterangan = form.getAll('keterangan').map(k => String(k).trim() || null);
  const foto = form.getAll('foto').filter((f): f is File => f instanceof File && f.size > 0);
  if (!activityId) return { ok: false, pesan: 'Pilih aktivitas terlebih dahulu.' };
  if (foto.length === 0) return { ok: false, pesan: 'Pilih minimal satu foto.' };
  // Tanggal pelaksanaan wajib per foto: unggah dilakukan tiap Jumat, sedangkan foto bisa diambil di hari lain.
  const kosong = foto.findIndex((_, i) => !/^\d{4}-\d{2}-\d{2}$/.test(tanggal[i] ?? ''));
  if (kosong >= 0) return { ok: false, pesan: `Isi tanggal pelaksanaan foto ${kosong + 1}.` };
  if (tanggal.some(t => t > hariIni())) return { ok: false, pesan: 'Tanggal pelaksanaan tidak boleh melewati hari ini.' };
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
    ukuran_byte: foto[i].size, keterangan: keterangan[i] ?? null, tanggal_kegiatan: tanggal[i], diunggah_oleh: user?.id,
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

// tanggal: undefined = tidak diubah; '' = dikosongkan (keterangan foto memakai periode aktivitas).
export async function ubahKeteranganFoto(id: string, keterangan: string, projectId: string, tanggal?: string): Promise<HasilUnggah> {
  const sb = await supabase();
  const isi: Record<string, string | null> = { keterangan: keterangan.trim() || null };
  if (tanggal !== undefined) {
    const t = tanggal.trim();
    if (t && t > hariIni()) return { ok: false, pesan: 'Tanggal pelaksanaan tidak boleh melewati hari ini.' };
    isi.tanggal_kegiatan = t || null;
  }
  const { data, error } = await sb.from('attachments').update(isi).eq('id', id).select('id');
  if (error) return { ok: false, pesan: error.message };
  if (!data?.length) return { ok: false, pesan: 'Hanya pengunggah foto atau Admin yang dapat mengubah keterangan.' };
  revalidatePath(`/proyek/${projectId}`);
  revalidatePath(`/update/${projectId}`);
  revalidatePath('/laporan');
  return { ok: true, pesan: 'Keterangan foto disimpan.' };
}

// Versi form untuk galeri di halaman detail proyek.
export async function simpanKeteranganFoto(form: FormData) {
  await ubahKeteranganFoto(String(form.get('id') ?? ''), String(form.get('keterangan') ?? ''), String(form.get('project_id') ?? ''),
    form.has('tanggal') ? String(form.get('tanggal') ?? '') : undefined);
}
