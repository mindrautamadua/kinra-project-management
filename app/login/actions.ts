'use server';

import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

export interface StatusLogin { pesan?: string; email?: string }

export async function masuk(_prev: StatusLogin | undefined, form: FormData): Promise<StatusLogin> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { pesan: 'Email dan password wajib diisi.', email };

  const sb = await supabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    // Pesan sengaja umum agar tidak membocorkan email mana yang terdaftar.
    return { pesan: 'Email atau password salah.', email };
  }
  redirect('/');
}

export async function keluar() {
  const sb = await supabase();
  await sb.auth.signOut();
  redirect('/login');
}
