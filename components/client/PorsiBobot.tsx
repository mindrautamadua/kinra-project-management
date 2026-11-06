'use client';

import { useEffect, useRef } from 'react';

const angka = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'));

// Menghitung ulang kolom "Porsi" setiap kali bobot, nama aktivitas baru, atau centang hapus berubah.
// Baris dihitung bila punya input [data-bobot]; baris baru hanya dihitung bila namanya terisi.
export default function PorsiBobot() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const hitung = () => {
      const baris = [...form.querySelectorAll<HTMLTableRowElement>('tr[data-baris]')].map(tr => {
        const bobot = tr.querySelector<HTMLInputElement>('[data-bobot]');
        const nama = tr.querySelector<HTMLInputElement>('[data-nama]');
        const hapus = tr.querySelector<HTMLInputElement>('[data-hapus]');
        const ikut = !hapus?.checked && (!nama || nama.value.trim() !== '');
        const b = angka(bobot?.value ?? '');
        return { tr, nilai: ikut && b > 0 ? b : 0, ikut };
      });
      const total = baris.reduce((s, r) => s + r.nilai, 0);
      for (const { tr, nilai, ikut } of baris) {
        const out = tr.querySelector('[data-porsi]');
        if (out) out.textContent = ikut && total > 0 ? `${(100 * nilai / total).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : '–';
      }
      if (ref.current) ref.current.textContent = total > 0 ? '100%' : '–';
    };
    form.addEventListener('input', hitung);
    form.addEventListener('change', hitung);
    hitung();
    return () => { form.removeEventListener('input', hitung); form.removeEventListener('change', hitung); };
  }, []);
  return <span ref={ref} />;
}
