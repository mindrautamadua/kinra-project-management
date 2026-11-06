'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, TriangleAlert } from 'lucide-react';
import { masuk, type StatusLogin } from '@/app/login/actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<StatusLogin | undefined, FormData>(masuk, undefined);
  const [lihat, setLihat] = useState(false);

  return (
    <form action={action} className="login-form" noValidate>
      <div className="field">
        <label htmlFor="email">Email</label>
        <div className="input-wrap">
          <Mail size={17} aria-hidden="true" />
          <input id="email" name="email" type="email" autoComplete="username" inputMode="email" required
            defaultValue={state?.email} placeholder="nama@kinra.co.id" aria-invalid={!!state?.pesan || undefined} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="input-wrap">
          <LockKeyhole size={17} aria-hidden="true" />
          <input id="password" name="password" type={lihat ? 'text' : 'password'} autoComplete="current-password" required
            placeholder="••••••••" aria-invalid={!!state?.pesan || undefined} />
          <button type="button" className="toggle-pw" onClick={() => setLihat(v => !v)}
            aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={lihat}>
            {lihat ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <div className="login-error" role="alert" aria-live="polite">
        {state?.pesan && <><TriangleAlert size={16} aria-hidden="true" />{state.pesan}</>}
      </div>

      <button type="submit" className="btn-masuk" disabled={pending}>
        {pending ? <><Loader2 size={18} className="spin" aria-hidden="true" />Memeriksa…</> : <>Masuk<ArrowRight size={18} aria-hidden="true" /></>}
      </button>
    </form>
  );
}
