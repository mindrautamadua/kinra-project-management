import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { ChipKesehatan, Progres, SectionHead } from '@/components/Chip';
import { daftarProyek } from '@/lib/data';
import { bolehMenu } from '@/lib/menu';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import { angka, STATUS_PROYEK, tgl } from '@/lib/format';

type Cari = Promise<Record<string, string | string[] | undefined>>;
const TAB = ['aktif', 'draf', 'ditunda', 'selesai', 'dibatalkan', 'semua'];

export default async function DaftarProyek({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const tab = typeof sp.status === 'string' && TAB.includes(sp.status) ? sp.status : 'aktif';
  const cari = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const sb = await supabase();
  const [seluruh, saya, { data: milik }] = await Promise.all([daftarProyek(), penggunaSaatIni(), sb.rpc('fn_proyek_saya')]);
  const peran = saya.peran.map(r => r.role);
  // "Proyek saya": proyek yang dipegang (PIC, Operator/Kasubag/Kabag unit) atau dibuat sendiri. Bawaan untuk PIC dan Operator.
  const bawaanSaya = !peran.some(r => ['admin', 'direksi', 'kabag', 'kasubag'].includes(r)) && peran.some(r => ['pic', 'operator'].includes(r));
  const lingkup = sp.lingkup === 'saya' || sp.lingkup === 'semua' ? sp.lingkup : bawaanSaya ? 'saya' : 'semua';
  const idSaya = new Set((milik ?? []) as string[]);
  const semua = lingkup === 'saya' ? seluruh.filter(p => idSaya.has(p.id)) : seluruh;
  const hitung = (s: string) => semua.filter(p => s === 'semua' || p.status === s).length;
  const tautan = (q: Record<string, string>) => `/proyek?${new URLSearchParams({ lingkup, status: tab, ...(cari && { q: cari }), ...q })}`;
  const daftar = semua
    .filter(p => tab === 'semua' || p.status === tab)
    .filter(p => !cari || `${p.kode} ${p.nama} ${p.pic_nama}`.toLowerCase().includes(cari));

  return (
    <section className="section first">
      <SectionHead no="02" eyebrow="Daftar proyek" judul={`${hitung('aktif')} proyek aktif, ${hitung('selesai')} selesai`}>
        <p className="muted">Termasuk proyek Draf yang charter-nya belum lengkap. Proyek Selesai keluar dari laporan mingguan.</p>
      </SectionHead>
      {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
      <div className="row aksi-atas">
        <div className="seg" role="group" aria-label="Lingkup proyek">
          <Link href={tautan({ lingkup: 'saya' })} aria-pressed={lingkup === 'saya'} className="seg-link">Proyek saya <small className="mono">{idSaya.size}</small></Link>
          <Link href={tautan({ lingkup: 'semua' })} aria-pressed={lingkup === 'semua'} className="seg-link">Semua proyek <small className="mono">{seluruh.length}</small></Link>
        </div>
        {bolehMenu(peran, '/proyek/baru') && <Link href="/proyek/baru" className="btn primary">+ Buat proyek baru</Link>}
      </div>
      <div className="card">
        <div className="row">
          <div className="seg" role="group" aria-label="Status proyek">
            {TAB.map(s => (
              <Link key={s} href={tautan({ status: s })} aria-pressed={tab === s} className="seg-link">
                {s === 'semua' ? 'Semua' : STATUS_PROYEK[s]} <small className="mono">{hitung(s)}</small>
              </Link>
            ))}
          </div>
          <form className="cari" role="search">
            <input type="hidden" name="status" value={tab} /><input type="hidden" name="lingkup" value={lingkup} />
            <input type="search" name="q" defaultValue={cari} placeholder="Cari kode, nama, PIC" aria-label="Cari proyek" />
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
