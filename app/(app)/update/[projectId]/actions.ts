'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

const kembali = (projectId: string, p: { ok?: string; galat?: string }): never => {
  revalidatePath(`/update/${projectId}`);
  revalidatePath('/');
  redirect(`/update/${projectId}?${new URLSearchParams(p as Record<string, string>).toString()}`);
};

const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;

// Simpan progres aktivitas dan isian update. Mengembalikan pesan galat dari database bila ada.
async function simpanIsi(form: FormData): Promise<{ projectId: string; updateId: string; galat?: string }> {
  const sb = await supabase();
  const projectId = String(form.get('project_id'));
  const periodId = String(form.get('period_id'));

  const { data: aktivitas, error: eAkt } = await sb.from('activities').select('id,nama,progres,status,aktual_selesai').eq('project_id', projectId);
  if (eAkt) return { projectId, updateId: '', galat: eAkt.message };
  for (const a of aktivitas ?? []) {
    const nilai = form.get(`prog_${a.id}`);
    if (nilai == null || a.status === 'dibatalkan') continue;
    const progres = Number(nilai);
    const tglSelesai = teks(form, `selesai_${a.id}`);
    let ubah: Record<string, unknown> | null = null;
    if (progres === 100) {
      if (!tglSelesai) return { projectId, updateId: '', galat: `Isi tanggal aktual selesai untuk aktivitas "${a.nama}".` };
      if (a.status !== 'selesai' || a.aktual_selesai !== tglSelesai) ubah = { status: 'selesai', progres: 100, aktual_selesai: tglSelesai };
    } else if (a.status === 'selesai' || a.progres !== progres) {
      ubah = { progres, status: progres === 0 && a.status === 'belum_mulai' ? 'belum_mulai' : 'berjalan', aktual_selesai: null };
    }
    if (ubah) {
      const { error } = await sb.from('activities').update(ubah).eq('id', a.id);
      if (error) return { projectId, updateId: '', galat: error.message };
    }
  }

  const isi = {
    sudah_dilakukan: teks(form, 'sudah_dilakukan'),
    rencana_berikut: teks(form, 'rencana_berikut'),
    status_override: teks(form, 'status_override'),
    alasan_override: teks(form, 'alasan_override'),
  };
  const { data: ada } = await sb.from('project_updates').select('id').eq('project_id', projectId).eq('period_id', periodId).maybeSingle();
  if (ada) {
    const { error } = await sb.from('project_updates').update(isi).eq('id', ada.id);
    return { projectId, updateId: ada.id, galat: error?.message };
  }
  const { data, error } = await sb.from('project_updates').insert({ project_id: projectId, period_id: periodId, ...isi }).select('id').single();
  return { projectId, updateId: data?.id ?? '', galat: error?.message };
}

export async function simpanDraf(form: FormData) {
  const r = await simpanIsi(form);
  kembali(r.projectId, r.galat ? { galat: r.galat } : { ok: 'Draf tersimpan.' });
}

export async function ajukan(form: FormData) {
  const r = await simpanIsi(form);
  if (r.galat) kembali(r.projectId, { galat: r.galat });
  const sb = await supabase();
  const { data: lama } = await sb.from('project_updates').select('status').eq('id', r.updateId).single();
  const sudah = lama?.status === 'diajukan';
  // Update yang sudah diajukan disimpan ulang dengan status yang sama; database menghitung ulang progres dan status.
  const { error } = await sb.from('project_updates').update({ status: 'diajukan' }).eq('id', r.updateId);
  kembali(r.projectId, error ? { galat: error.message } : { ok: sudah ? 'Perubahan update tersimpan.' : 'Update diajukan.' });
}

const KEPARAHAN = ['rendah', 'sedang', 'tinggi', 'kritis'];
const skor = (form: FormData, k: string) => { const n = Number(form.get(k)); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };

// Kolom bersama masalah/risiko. Risiko wajib punya skor kemungkinan dan dampak 1–5 (lihat check di tabel issues).
function isiMasalah(form: FormData, projectId: string) {
  const jenis = form.get('jenis') === 'risiko' ? 'risiko' : 'masalah';
  const kemungkinan = jenis === 'risiko' ? skor(form, 'kemungkinan') : null;
  const skor_dampak = jenis === 'risiko' ? skor(form, 'skor_dampak') : null;
  if (jenis === 'risiko' && (!kemungkinan || !skor_dampak)) kembali(projectId, { galat: 'Risiko wajib diisi skor kemungkinan dan dampak (1–5).' });
  return {
    jenis, kemungkinan, skor_dampak,
    judul: teks(form, 'judul'),
    dampak: teks(form, 'dampak'),
    akar_masalah: teks(form, 'akar_masalah'),
    keparahan: KEPARAHAN.includes(String(form.get('keparahan'))) ? String(form.get('keparahan')) : 'sedang',
    owner_id: String(form.get('owner_id')),
  };
}

export async function tambahPica(form: FormData) {
  const projectId = String(form.get('project_id'));
  const sb = await supabase();
  const { data: issue, error } = await sb.from('issues').insert({
    project_id: projectId,
    org_unit_id: String(form.get('org_unit_id')),
    ...isiMasalah(form, projectId),
  }).select('id').single();
  if (error) kembali(projectId, { galat: error.message });
  const { error: eAksi } = await sb.from('actions').insert({
    issue_id: issue!.id,
    deskripsi: teks(form, 'aksi'),
    owner_id: teks(form, 'aksi_owner_id') ?? String(form.get('owner_id')),
    tanggal_target: teks(form, 'tanggal_target'),
  });
  kembali(projectId, eAksi ? { galat: `Masalah tersimpan, tetapi aksi gagal: ${eAksi.message}` } : { ok: 'Masalah dan aksi korektif dicatat.' });
}

export async function ubahMasalah(form: FormData) {
  const projectId = String(form.get('project_id'));
  const sb = await supabase();
  const { error } = await sb.from('issues').update(isiMasalah(form, projectId)).eq('id', String(form.get('issue_id')));
  kembali(projectId, error ? { galat: error.message } : { ok: 'Masalah diperbarui.' });
}

export async function tambahAksiPica(form: FormData) {
  const projectId = String(form.get('project_id'));
  const sb = await supabase();
  const { error } = await sb.from('actions').insert({
    issue_id: String(form.get('issue_id')),
    deskripsi: teks(form, 'aksi'),
    owner_id: teks(form, 'owner_id'),
    tanggal_target: teks(form, 'tanggal_target'),
  });
  kembali(projectId, error ? { galat: error.message } : { ok: 'Aksi korektif ditambahkan.' });
}

// Tandai aksi selesai, atau tutup / buka kembali masalah (field status: 'ditutup' | 'terbuka').
export async function ubahPica(form: FormData) {
  const projectId = String(form.get('project_id'));
  const sb = await supabase();
  const actionId = teks(form, 'action_id');
  const issueId = teks(form, 'issue_id');
  const status = form.get('status') === 'terbuka' ? 'terbuka' : 'ditutup';
  const { error } = actionId
    ? await sb.from('actions').update({ status: 'selesai' }).eq('id', actionId)
    : await sb.from('issues').update({ status }).eq('id', issueId!);
  const pesan = actionId ? 'Aksi ditandai selesai.' : status === 'ditutup' ? 'Masalah ditutup.' : 'Masalah dibuka kembali.';
  kembali(projectId, error ? { galat: error.message } : { ok: pesan });
}
