'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;

const kembali = (p: Record<string, string>): never => {
  revalidatePath('/', 'layout');
  redirect(`/dukungan?${new URLSearchParams(p)}`);
};

export async function ajukanDukungan(form: FormData) {
  const sb = await supabase();
  const { data: { user } } = await sb.auth.getUser();
  const projectId = teks(form, 'project_id');
  let unitId = teks(form, 'org_unit_id');
  if (projectId) {
    const { data } = await sb.from('projects').select('org_unit_id').eq('id', projectId).single();
    unitId = data?.org_unit_id ?? unitId;
  }
  const permintaan = teks(form, 'permintaan');
  if (!permintaan || permintaan.length < 15) kembali({ galat: 'Tulis permintaan secara spesifik (minimal 15 karakter).', ...(projectId && { proyek: projectId }) });
  if (!unitId) kembali({ galat: 'Pilih proyek atau unit pengaju.' });

  const { error } = await sb.from('support_requests').insert({
    org_unit_id: unitId,
    jenis: form.get('jenis') === 'keputusan' ? 'keputusan' : 'dukungan',
    project_id: projectId,
    permintaan,
    dampak_bila_tidak: teks(form, 'dampak_bila_tidak'),
    ditujukan_ke: teks(form, 'ditujukan_ke'),
    tenggat: teks(form, 'tenggat'),
    diajukan_oleh: user?.id,
  });
  if (error) {
    kembali({ galat: error.message.includes('row-level security') ? 'Anda tidak berwenang mengajukan atas nama proyek/unit ini.' : error.message, ...(projectId && { proyek: projectId }) });
  }
  kembali({ ok: 'Permintaan terkirim dan tampil di "Perlu keputusan Anda" milik penerima.' });
}

export async function tanggapiDukungan(form: FormData) {
  const sb = await supabase();
  const status = String(form.get('status'));
  const tanggapan = teks(form, 'tanggapan');
  if ((status === 'dipenuhi' || status === 'ditolak') && !tanggapan) kembali({ galat: 'Tulis tanggapan saat memenuhi atau menolak permintaan.' });
  const { error } = await sb.from('support_requests').update({ status, tanggapan }).eq('id', String(form.get('id')));
  kembali(error ? { galat: error.message } : { ok: 'Tanggapan tersimpan.' });
}
