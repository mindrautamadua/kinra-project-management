'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { ChipKesehatan, Progres, SectionHead } from '@/components/Chip';
import { angka, STATUS_PROYEK, tgl } from '@/lib/format';
import type { ProyekKesehatan } from '@/lib/types';

export const TAB_PROYEK = ['aktif', 'draf', 'ditunda', 'selesai', 'dibatalkan', 'semua'];

export type BarisProyek = Pick<ProyekKesehatan,
  'id' | 'kode' | 'nama' | 'status' | 'pic_nama' | 'unit_nama' | 'tanggal_mulai' | 'tanggal_selesai' |
  'tanggal_selesai_baseline' | 'progres_aktual' | 'progres_rencana' | 'spi' | 'status_kesehatan' | 'ada_override'>;

interface Props {
  seluruh: BarisProyek[];
  idSaya: string[];
  bawaanLingkup: 'saya' | 'semua';
  ok: string | null;
  bolehBuat: boolean;
}

// Daftar proyek dengan filter lingkup, status, dan pencarian di browser. Seluruh proyek sudah dimuat
// server sekali, jadi pindah tab tidak perlu bolak-balik ke server; URL tetap diperbarui agar bisa dibagikan.
export default function DaftarProyek({ seluruh, idSaya, bawaanLingkup, ok, bolehBuat }: Props) {
  // Filter dibaca dari URL; Next menyinkronkan useSearchParams dengan history.pushState sehingga tombol Kembali ikut bekerja.
  const sp = useSearchParams();
  const l = sp.get('lingkup');
  const lingkup = l === 'saya' || l === 'semua' ? l : bawaanLingkup;
  const st = sp.get('status') ?? '';
  const tab = TAB_PROYEK.includes(st) ? st : 'aktif';
  const [cari, setCari] = useState(() => sp.get('q') ?? '');

  const milik = new Set(idSaya);
  const semua = lingkup === 'saya' ? seluruh.filter(p => milik.has(p.id)) : seluruh;
  const hitung = (s: string) => semua.filter(p => s === 'semua' || p.status === s).length;
  const kunci = cari.trim().toLowerCase();
  const daftar = semua
    .filter(p => tab === 'semua' || p.status === tab)
    .filter(p => !kunci || `${p.kode} ${p.nama} ${p.pic_nama}`.toLowerCase().includes(kunci));

  const url = (q: { lingkup?: string; status?: string; q?: string }) => {
    const v = { lingkup, status: tab, q: kunci, ...q };
    return `/proyek?${new URLSearchParams({ lingkup: v.lingkup, status: v.status, ...(v.q && { q: v.q }) })}`;
  };
  // Klik biasa ditangani di browser; Ctrl/Cmd/klik tengah tetap membuka tab baru lewat href.
  const pilih = (e: React.MouseEvent, q: Parameters<typeof url>[0]) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.history.pushState(null, '', url(q));
  };

  return (
    <section className="section first">
      <SectionHead no="02" eyebrow="Daftar proyek" judul={`${hitung('aktif')} proyek aktif, ${hitung('selesai')} selesai`}>
        <p className="muted">Termasuk proyek Draf yang charter-nya belum lengkap. Proyek Selesai keluar dari laporan mingguan.</p>
      </SectionHead>
      {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
      <div className="row aksi-atas">
        <div className="seg" role="group" aria-label="Lingkup proyek">
          {(['saya', 'semua'] as const).map(x => (
            <a key={x} href={url({ lingkup: x })} aria-pressed={lingkup === x} className="seg-link" data-tanpa-indikator
              onClick={e => pilih(e, { lingkup: x })}>
              {x === 'saya' ? 'Proyek saya' : 'Semua proyek'} <small className="mono">{x === 'saya' ? idSaya.length : seluruh.length}</small>
            </a>
          ))}
        </div>
        {bolehBuat && <Link href="/proyek/baru" className="btn primary">+ Buat proyek baru</Link>}
      </div>
      <div className="card">
        <div className="row">
          <div className="seg" role="group" aria-label="Status proyek">
            {TAB_PROYEK.map(s => (
              <a key={s} href={url({ status: s })} aria-pressed={tab === s} className="seg-link" data-tanpa-indikator
                onClick={e => pilih(e, { status: s })}>
                {s === 'semua' ? 'Semua' : STATUS_PROYEK[s]} <small className="mono">{hitung(s)}</small>
              </a>
            ))}
          </div>
          <form className="cari" role="search" onSubmit={e => e.preventDefault()}>
            <input type="search" name="q" value={cari} placeholder="Cari kode, nama, PIC" aria-label="Cari proyek"
              onChange={e => { setCari(e.target.value); window.history.replaceState(null, '', url({ q: e.target.value.trim().toLowerCase() })); }} />
          </form>
        </div>
        <div className="table-wrap">
          <table className="tbl tbl-portofolio">
            <thead><tr><th>Kode</th><th>Proyek · PIC</th><th>Unit</th><th>Mulai</th><th>Tenggat baseline</th><th>Progres</th><th className="num">SPI</th><th>Status</th></tr></thead>
            <tbody>
              {daftar.length === 0 && <tr><td colSpan={8} className="kosong">{lingkup === 'saya' ? 'Tidak ada proyek Anda di kelompok ini. Pilih "Semua proyek" untuk melihat seluruh portofolio.' : 'Tidak ada proyek yang cocok.'}</td></tr>}
              {daftar.map(p => (
                <tr key={p.id}>
                  <td className="kode">{p.kode}</td>
                  <td><Link href={`/proyek/${p.id}`} className="tautan">{p.nama}</Link><div className="upd">{p.pic_nama}</div></td>
                  <td className="small">{p.unit_nama}</td>
                  <td className="mono small">{tgl(p.tanggal_mulai)}</td>
                  <td className="mono small">{tgl(p.tanggal_selesai_baseline ?? p.tanggal_selesai)}</td>
                  <td><Progres aktual={p.progres_aktual} rencana={p.status === 'aktif' ? p.progres_rencana : null} /></td>
                  <td className="num">{angka(p.spi, 2)}</td>
                  <td>{p.status === 'aktif' || p.status === 'selesai' ? <ChipKesehatan status={p.status_kesehatan} override={p.ada_override} /> : <span className="chip chip-na">{STATUS_PROYEK[p.status]}</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={8} className="muted small">{daftar.length} proyek · sumber: v_proyek_kesehatan</td></tr></tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
