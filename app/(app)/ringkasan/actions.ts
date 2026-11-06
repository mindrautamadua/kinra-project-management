'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

export async function simpanCatatan(form: FormData) {
  const sb = await supabase();
  const { error } = await sb.rpc('fn_simpan_catatan_kabag', { p_catatan: String(form.get('catatan') ?? '') });
  revalidatePath('/ringkasan');
  redirect(`/ringkasan?${new URLSearchParams(error ? { galat: error.message } : { ok: 'Catatan Kabag tersimpan.' })}`);
}
