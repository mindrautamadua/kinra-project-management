import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { ChipKesehatan, Progres, SectionHead } from '@/components/Chip';
import { daftarProyek } from '@/lib/data';
import { bolehReview, penggunaSaatIni } from '@/lib/sesi';
import { angka, STATUS_PROYEK, tgl } from '@/lib/format';

type Cari = Promise<Record<string, string | string[] | undefined>>;
const TAB = ['aktif', 'draf', 'ditunda', 'selesai', 'dibatalkan', 'semua'];

export default async function DaftarProyek({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const tab = typeof sp.status === 'string' && TAB.includes(sp.status) ? sp.status : 'aktif';
  const cari = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const [semua, saya] = await Promise.all([daftarProyek(), penggunaSaatIni()]);
  const hitung = (s: string) => semua.filter(p => s === 'semua' || p.status === s).length;
  const daftar = semua
    .filter(p => tab === 'semua' || p.status === tab)
    .filter(p => !cari || `${p.kode} ${p.nama} ${p.pic_nama}`.toLowerCase().includes(cari));

  return (
    <section className="section first">
      <SectionHead no="02" eyebrow="Daftar proyek" judul={`${hitung('aktif')} proyek aktif, ${hitung('selesai')} selesai`}>
        <p className="muted">Termasuk proyek Draf yang charter-nya belum lengkap. Proyek Selesai keluar dari laporan mingguan.</p>
      </SectionHead>
      {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
      {bolehReview(saya) && <div className="row aksi-atas"><Link href="/proyek/baru" className="btn primary">+ Buat proyek baru</Link></div>}
      <div className="card">
        <div className="row">
          <div className="seg" role="group" aria-label="Status proyek">
            {TAB.map(s => (
              <Link key={s} href={`/proyek?status=${s}${cari ? `&q=${encodeURIComponent(cari)}` : ''}`} aria-pressed={tab === s} className="seg-link">
                {s === 'semua' ? 'Semua' : STATUS_PROYEK[s]} <small className="mono">{hitung(s)}</small>
              </Link>
            ))}
          </div>
          <form className="cari" role="search">
            <input type="hidden" name="status" value={tab} />
            <input type="search" name="q" defaultValue={cari} placeholder="Cari kode, nama, PIC" aria-label="Cari proyek" />
          </form>
        </div>
        <div className="table-wrap">
          <table className="tbl tbl-portofolio">
            <thead><tr><th>Kode</th><th>Proyek · PIC</th><th>Unit</th><th>Mulai</th><th>Tenggat baseline</th><th>Progres</th><th className="num">SPI</th><th>Status</th></tr></thead>
            <tbody>
              {daftar.length === 0 && <tr><td colSpan={8} className="kosong">Tidak ada proyek yang cocok.</td></tr>}
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
