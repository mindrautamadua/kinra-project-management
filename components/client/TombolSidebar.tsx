'use client';

import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const NAMA_COOKIE_SIDEBAR = 'kinra_sidebar';

const ciutAktif = () => document.documentElement.dataset.sidebar === 'ciut';

// Ciutkan/lebarkan sidebar. Pilihan disimpan di cookie agar server langsung merender lebar yang benar (tanpa kedip).
export default function TombolSidebar() {
  const [ciut, setCiut] = useState(false);
  useEffect(() => setCiut(ciutAktif()), []);

  const ganti = () => {
    const baru = !ciutAktif();
    if (baru) document.documentElement.dataset.sidebar = 'ciut';
    else delete document.documentElement.dataset.sidebar;
    document.cookie = `${NAMA_COOKIE_SIDEBAR}=${baru ? 'ciut' : 'lebar'}; path=/; max-age=31536000; samesite=lax`;
    setCiut(baru);
  };

  const label = ciut ? 'Lebarkan sidebar' : 'Ciutkan sidebar';
  return (
    <button type="button" className="btn-tema btn-sidebar" onClick={ganti} aria-label={label} aria-expanded={!ciut} title={label}>
      {ciut ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
    </button>
  );
}
