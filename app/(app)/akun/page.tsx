import { CircleCheck, TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import { penggunaSaatIni } from '@/lib/sesi';
import { gantiPassword } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;

export default async function Akun({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const saya = await penggunaSaatIni();
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  return (
    <section className="section first">
      <SectionHead no="AKUN" eyebrow="Akun saya" judul={saya.nama}>
        <p className="muted">{[saya.jabatan, saya.email].filter(Boolean).join(' · ')}</p>
      </SectionHead>
      {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
      {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
      <form action={gantiPassword} className="card form-pica form-sempit">
        <h3>Ganti password</h3>
        <label>Password lama<input type="password" name="lama" required autoComplete="current-password" /></label>
        <label>Password baru<input type="password" name="baru" required minLength={8} autoComplete="new-password" /><small className="muted">Minimal 8 karakter.</small></label>
        <label>Ulangi password baru<input type="password" name="ulang" required minLength={8} autoComplete="new-password" /></label>
        <button className="btn primary">Ganti password</button>
      </form>
    </section>
  );
}
