import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import LoginForm from '@/components/client/LoginForm';

export const metadata: Metadata = { title: 'Masuk · KINRA Project Hub' };

export default function LoginPage() {
  return (
    <div className="login">
      <section className="login-brand" aria-label="KINRA Sei Mangkei">
        <i className="lc lc1" aria-hidden="true" /><i className="lc lc2" aria-hidden="true" />
        <i className="lc lc3" aria-hidden="true" /><i className="lc lc4" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/kinra-logo-tosca.png" alt="Kinra Sei Mangkei" width={220} height={94} className="login-logo" />
        <div className="login-copy">
          <span className="login-eyebrow">Project Hub</span>
          <h1>Satu sumber data untuk semua proyek KINRA.</h1>
          <p>Progres terhadap baseline, status yang dihitung sistem, PICA, dan dukungan yang dibutuhkan pimpinan.</p>
        </div>
        <p className="login-foot">PT Kawasan Industri Nusantara · PTPN Group</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-head">
            <span className="login-badge"><ShieldCheck size={16} aria-hidden="true" />Akses terbatas</span>
            <h2>Masuk ke Project Hub</h2>
            <p className="muted">Gunakan akun yang diaktifkan administrator.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
