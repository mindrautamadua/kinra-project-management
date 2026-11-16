'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Indikator global untuk tombol formulir yang menjalankan server action: tombol yang diklik menampilkan
// putaran dan teks "Memproses…", seluruh tombol di formulir itu dinonaktifkan agar tidak terkirim dua kali,
// dan garis progres tampil di atas layar. Indikator dilepas saat navigasi selesai (redirect sesudah action),
// atau paling lambat setelah 30 detik bila action tidak berpindah halaman.
// Formulir dengan atribut data-tanpa-indikator mengelola indikatornya sendiri.
// Garis progres yang sama juga tampil saat tautan internal diklik, sampai halaman tujuan selesai dimuat.

const aktif = new Set<HTMLButtonElement>();
let batas: number | undefined;

function lepas() {
  aktif.forEach(b => {
    b.disabled = b.dataset.semulaNonaktif === '1';
    delete b.dataset.semulaNonaktif;
    b.removeAttribute('data-proses');
    b.removeAttribute('aria-busy');
  });
  aktif.clear();
  document.documentElement.removeAttribute('data-proses');
  window.clearTimeout(batas);
}

// React merender action fungsi (server action) sebagai URL javascript: pada atribut action/formaction.
const actionFungsi = (el: Element | null, attr: string) => el?.getAttribute(attr)?.startsWith('javascript:') ?? false;

export default function IndikatorProses() {
  const path = usePathname();
  const cari = useSearchParams().toString();

  useEffect(() => { lepas(); }, [path, cari]);

  useEffect(() => {
    const kirim = (e: SubmitEvent) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || form.hasAttribute('data-tanpa-indikator')) return;
      const tombol = e.submitter instanceof HTMLButtonElement ? e.submitter : null;
      if (!actionFungsi(tombol, 'formaction') && !actionFungsi(form, 'action')) return;
      // Ditunda satu tick agar React sudah membaca isian dan tombol pengirim sebelum tombol dinonaktifkan.
      window.setTimeout(() => {
        lepas();
        form.querySelectorAll<HTMLButtonElement>('button:not([type="button"]):not([type="reset"])').forEach(b => {
          b.dataset.semulaNonaktif = b.disabled ? '1' : '0';
          b.disabled = true;
          aktif.add(b);
        });
        if (tombol) { tombol.setAttribute('data-proses', ''); tombol.setAttribute('aria-busy', 'true'); }
        document.documentElement.setAttribute('data-proses', '');
        batas = window.setTimeout(lepas, 30000);
      }, 0);
    };

    // Tautan internal: tampilkan garis progres sampai path/query berubah. Tautan yang ditangani
    // di browser saja (atribut data-tanpa-indikator, mis. filter tab daftar proyek) atau membuka tab baru diabaikan.
    const klik = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-tanpa-indikator')) return;
      const tujuan = new URL(a.href, location.href);
      if (tujuan.origin !== location.origin) return;
      if (tujuan.pathname === location.pathname && tujuan.search === location.search) return;
      document.documentElement.setAttribute('data-proses', '');
      window.clearTimeout(batas);
      batas = window.setTimeout(lepas, 30000);
    };

    // Redirect ke URL yang sama (mis. pesan yang sama dua kali) tidak mengubah path/query; tangkap lewat history.
    const asli = { push: history.pushState, replace: history.replaceState };
    history.pushState = function (...a) { if (aktif.size) queueMicrotask(lepas); return asli.push.apply(this, a); };
    history.replaceState = function (...a) { if (aktif.size) queueMicrotask(lepas); return asli.replace.apply(this, a); };

    document.addEventListener('submit', kirim);
    document.addEventListener('click', klik);
    return () => {
      document.removeEventListener('submit', kirim);
      document.removeEventListener('click', klik);
      history.pushState = asli.push;
      history.replaceState = asli.replace;
      lepas();
    };
  }, []);

  return null;
}
