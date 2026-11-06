import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function konfigSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi di .env.local');
  return { url, key };
}

// Klien per permintaan yang membawa JWT pengguna, sehingga RLS dan trigger di database
// (auth.uid()) menjadi sumber otorisasi. Aplikasi tidak memakai service key.
export async function supabase() {
  const store = await cookies();
  const { url, key } = konfigSupabase();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: daftar => {
        // Server Component tidak boleh menulis cookie; penyegaran token ditangani proxy.ts.
        try { daftar.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });
}
