'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export const NAMA_COOKIE_TEMA = 'kinra_tema';
type Tema = 'light' | 'dark';

function temaAktif(): Tema {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Ganti terang/gelap. Pilihan disimpan di cookie agar server langsung merender tema yang benar (tanpa kedip).
export default function TombolTema() {
  const [tema, setTema] = useState<Tema | null>(null);
  useEffect(() => setTema(temaAktif()), []);

  const ganti = () => {
    const baru: Tema = temaAktif() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = baru;
    document.cookie = `${NAMA_COOKIE_TEMA}=${baru}; path=/; max-age=31536000; samesite=lax`;
    setTema(baru);
  };

  const label = tema === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang';
  return (
    <button type="button" className="btn-tema" onClick={ganti} aria-label={label} title={label}>
      {tema === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
    </button>
  );
}
