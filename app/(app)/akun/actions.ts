'use server';

import { redirect } from 'next/navigation';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';

const kembali = (p: Record<string, string>): never => redirect(`/akun?${new URLSearchParams(p)}`);

// Ganti password akun sendiri. Password lama diperiksa ulang agar sesi yang tertinggal terbuka tidak bisa dipakai mengganti password.
export async function gantiPassword(form: FormData) {
  const saya = await penggunaSaatIni();
  const lama = String(form.get('lama') ?? '');
  const baru = String(form.get('baru') ?? '');
  const ulang = String(form.get('ulang') ?? '');
  if (!lama || !baru) kembali({ galat: 'Isi password lama dan password baru.' });
  if (baru.length < 8) kembali({ galat: 'Password baru minimal 8 karakter.' });
  if (baru !== ulang) kembali({ galat: 'Ulangi password baru dengan isian yang sama.' });
  if (baru === lama) kembali({ galat: 'Password baru harus berbeda dari password lama.' });

  const sb = await supabase();
  const { error: eCek } = await sb.auth.signInWithPassword({ email: saya.email, password: lama });
  if (eCek) kembali({ galat: 'Password lama salah.' });
  const { error } = await sb.auth.updateUser({ password: baru });
  if (error) kembali({ galat: `Password belum diganti: ${error.message}` });
  kembali({ ok: 'Password berhasil diganti. Gunakan password baru saat masuk berikutnya.' });
}
