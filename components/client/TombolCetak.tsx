'use client';

import { Printer } from 'lucide-react';

export default function TombolCetak({ label = 'Cetak / simpan PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      <Printer size={15} aria-hidden="true" />{label}
    </button>
  );
}
