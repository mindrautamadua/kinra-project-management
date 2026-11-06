import { LogOut, UserRoundX } from 'lucide-react';
import { Suspense } from 'react';
import IndikatorProses from '@/components/client/IndikatorProses';
import NavLinks from '@/components/client/NavLinks';
import TombolTema from '@/components/client/TombolTema';
import TombolSidebar from '@/components/client/TombolSidebar';
import { keluar } from '@/app/login/actions';
import { periodeBerjalan } from '@/lib/data';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import { tgl } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const saya = await penggunaSaatIni();

  if (!saya.aktif) {
    return (
      <main className="kosong-penuh">
        <UserRoundX size={36} aria-hidden="true" />
        <h2>Akun belum diaktifkan</h2>
        <p className="muted">Akun <b>{saya.email}</b> sudah terdaftar tetapi belum diberi akses. Hubungi admin Bagian TI untuk mengaktifkan akun dan menetapkan peran Anda.</p>
        <form action={keluar}><button className="btn-keluar" type="submit"><LogOut size={15} aria-hidden="true" />Keluar</button></form>
      </main>
    );
  }

  const periode = await periodeBerjalan();
  const sb = await supabase();
  const [{ data: dapat }, { data: sudah }] = await Promise.all([
    sb.rpc('fn_proyek_dapat_diubah'),
    sb.from('project_updates').select('project_id').eq('period_id', periode.id).not('status', 'in', '(draf,dikembalikan)'),
  ]);
  const sudahSet = new Set((sudah ?? []).map(u => u.project_id));
  const belum = ((dapat ?? []) as string[]).filter(id => !sudahSet.has(id)).length;
  const batas = new Date(periode.batas_input).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  return (
    <div className="shell">
      <Suspense fallback={null}><IndikatorProses /></Suspense>
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/kinra-logo-tosca.png" alt="Kinra Sei Mangkei" width={168} height={72} />
          <div className="brand-sub">Project Hub</div>
        </div>
        <NavLinks badgeUpdate={belum} />
        <div className="side-card">
          <div className="side-label">Periode laporan</div>
          <b>{periode.label}</b>
          <p>{tgl(periode.tanggal_mulai, false)}–{tgl(periode.tanggal_akhir)} · batas input {batas} WIB</p>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <div className="topbar-left">
            <TombolSidebar />
            <div className="crumbs"><span className="muted">PT KINRA</span><span className="sep">/</span><b>Project Hub</b></div>
          </div>
          <div className="topbar-right">
            <TombolTema />
            <div className="akun">
              <span className="akun-email" title={saya.email}>{saya.nama}</span>
              <form action={keluar}><button className="btn-keluar" type="submit" aria-label="Keluar"><LogOut size={15} aria-hidden="true" /></button></form>
            </div>
          </div>
        </header>
        <NavLinks badgeUpdate={belum} varian="mobile" />
        <main>{children}</main>
        <footer className="footer">
          Status proyek dihitung sistem dari baseline dan progres aktivitas (SPI = % aktual ÷ % rencana). Sesuai ≥ 0,95 · Waspada ≥ 0,85 · Terlambat ≥ 0,70 · Kritis &lt; 0,70 atau lewat tenggat baseline.
        </footer>
      </div>
    </div>
  );
}
