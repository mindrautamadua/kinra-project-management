'use client';

import { useEffect, useRef } from 'react';

// Pada formulir update: tanggal aktual selesai menjadi wajib ketika progres aktivitas diubah ke Selesai,
// sehingga browser menolak pengiriman sebelum ke server dan isian lain di formulir tidak hilang.
export default function WajibTanggalSelesai() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const sesuaikan = (pilih: HTMLSelectElement) => {
      const tanggal = form.querySelector<HTMLInputElement>(`input[name="selesai_${pilih.name.slice(5)}"]`);
      if (tanggal) tanggal.required = pilih.value === '100';
    };
    form.querySelectorAll<HTMLSelectElement>('select[name^="prog_"]').forEach(sesuaikan);
    const ubah = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement && t.name.startsWith('prog_')) sesuaikan(t);
    };
    form.addEventListener('change', ubah);
    return () => form.removeEventListener('change', ubah);
  }, []);

  return <span ref={ref} hidden />;
}
