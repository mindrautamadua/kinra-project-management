import { Fragment } from 'react';
import { Chip, ChipKesehatan } from '@/components/Chip';
import { KESEHATAN, persen, tgl } from '@/lib/format';
import type { Kesehatan, ProyekKesehatan } from '@/lib/types';

const URUT_STATUS: Kesehatan[] = ['kritis', 'terlambat', 'waspada', 'sesuai', 'belum_mulai', 'data_belum_lengkap', 'selesai'];

// Dua halaman pembuka laporan cetak, mengikuti panduan-ui-ux-kinra.md: sampul (panel brand Tosca dengan motif
// lingkaran bertumpuk + ringkasan portofolio berangka) lalu daftar isi.
// Nomor halaman mengikuti urutan cetak: sampul, daftar isi, ringkasan eksekutif (bila ada), charter per proyek diikuti foto kegiatannya, lalu lampiran.
export type HalamanProyek = { charter: number; foto?: { hal: number; ket: string } };

export default function Cover({ unitLabel, proyek, adaRingkasan, halaman, lampiran = [], hariIni }: {
  unitLabel: string; proyek: ProyekKesehatan[]; adaRingkasan: boolean; halaman: Map<string, HalamanProyek>; lampiran?: { hal: number; judul: string }[]; hariIni: string;
}) {
  const jumlah = new Map<Kesehatan, number>();
  for (const p of proyek) if (p.status_kesehatan) jumlah.set(p.status_kesehatan, (jumlah.get(p.status_kesehatan) ?? 0) + 1);
  const sesuai = jumlah.get('sesuai') ?? 0;
  const selesai = jumlah.get('selesai') ?? 0;
  const berjalan = proyek.filter(p => p.status === 'aktif').length;
  const serius = (jumlah.get('terlambat') ?? 0) + (jumlah.get('kritis') ?? 0);
  const perhatian = serius + (jumlah.get('waspada') ?? 0);
  const rata = (k: 'progres_aktual' | 'progres_rencana') =>
    proyek.length ? proyek.reduce((t, p) => t + Number(p[k] ?? 0), 0) / proyek.length : 0;
  const aktual = rata('progres_aktual');
  const rencana = rata('progres_rencana');
  // Judul berupa kesimpulan berangka (panduan §5).
  const kesimpulan = proyek.length === 0 ? 'Tidak ada proyek untuk dilaporkan'
    : `${selesai} dari ${proyek.length} proyek selesai; ${sesuai} dari ${berjalan} proyek berjalan sesuai rencana${serius ? `, ${serius} terlambat atau kritis` : ''}`;
  const sebaran = URUT_STATUS.filter(s => jumlah.get(s)).map(s => ({ s, n: jumlah.get(s)! }));

  return (
    <>
      <article className="cover-page">
        <div className="cv-strip" aria-hidden="true" />

        <section className="cv-brand" aria-label="KINRA Sei Mangkei">
          <i className="lc lc1" aria-hidden="true" /><i className="lc lc2" aria-hidden="true" />
          <i className="lc lc3" aria-hidden="true" /><i className="lc lc4" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cv-logo" src="/brand/kinra-logo-tosca.png" alt="Kinra Sei Mangkei" width={200} height={85} />
          <div className="cv-judul">
            <div className="cv-eyebrow">Status per tanggal cetak</div>
            <h1>Laporan Progres Proyek</h1>
            <p>{unitLabel}</p>
            <p className="cv-periode">{tgl(hariIni)}</p>
          </div>
          <p className="cv-brand-foot">PT Kawasan Industri Nusantara</p>
        </section>

        <section className="cv-data">
          <div>
            <div className="eyebrow">Ringkasan portofolio</div>
            <h2>{kesimpulan}</h2>
          </div>

          <div className="cv-tiles">
            <div className="cv-tile"><span className="cv-lbl">Total proyek</span><b className="tnum">{proyek.length}</b><Chip kode="info" label={`${berjalan} berjalan`} /></div>
            <div className="cv-tile"><span className="cv-lbl">Selesai</span><b className="tnum">{selesai}</b><Chip kode="info" label="Selesai" /></div>
            <div className="cv-tile"><span className="cv-lbl">Sesuai rencana</span><b className="tnum">{sesuai}</b><Chip kode="good" label="Sesuai rencana" /></div>
            <div className="cv-tile"><span className="cv-lbl">Perlu perhatian</span><b className="tnum">{perhatian}</b><Chip kode={serius ? 'crit' : 'warn'} label="Waspada, terlambat, kritis" /></div>
          </div>

          <div className="cv-progres">
            <div className="row">
              <span className="cv-lbl">Rata-rata progres seluruh proyek</span>
              <span className="tnum"><b>{persen(aktual)}</b> <span className="muted">realisasi · rencana {persen(rencana)}</span></span>
            </div>
            <div className="track" role="img" aria-label={`Rata-rata realisasi ${persen(aktual)} terhadap rencana ${persen(rencana)}`}>
              <b style={{ width: `${Math.min(aktual, 100)}%` }} /><u style={{ left: `${Math.min(rencana, 100)}%` }} />
            </div>
          </div>

          <div className="cv-sebaran">
            <span className="cv-lbl">Sebaran status</span>
            <div className="cv-bar" role="img" aria-label={sebaran.map(x => `${KESEHATAN[x.s].label} ${x.n}`).join(', ')}>
              {sebaran.map(x => <i key={x.s} className={`cv-s-${KESEHATAN[x.s].kode}`} style={{ flexGrow: x.n }} />)}
            </div>
            <ul>{sebaran.map(x => <li key={x.s}><ChipKesehatan status={x.s} /> <b className="tnum">{x.n}</b></li>)}</ul>
          </div>

          <footer className="cv-foot">
            <span>Sumber: KINRA Project Hub, data per {tgl(hariIni)} · Disusun Bagian Manajemen Risiko dan TI</span>
            <span>Rahasia · Penggunaan internal</span>
          </footer>
        </section>
      </article>

      <article className="isi-page">
        <header className="ch-head">
          <div>
            <div className="eyebrow">Per {tgl(hariIni)} · {unitLabel}</div>
            <h2>Daftar isi</h2>
          </div>
        </header>

        <div className="cv-rekap">
          <div><b className="tnum">{proyek.length}</b><span>Proyek</span></div>
          {URUT_STATUS.filter(s => jumlah.get(s)).map(s => (
            <div key={s} className={`cv-${KESEHATAN[s].kode}`}><b className="tnum">{jumlah.get(s)}</b><span>{KESEHATAN[s].label}</span></div>
          ))}
        </div>

        <table className="cv-isi">
          <thead><tr><th>Hal.</th><th>Kode</th><th>Proyek</th><th>PIC</th><th>Progres</th><th>Status</th></tr></thead>
          <tbody>
            {adaRingkasan && <tr><td className="tnum">3</td><td /><td colSpan={4}><b>Ringkasan eksekutif</b></td></tr>}
            {proyek.map(p => { const h = halaman.get(p.id); return (
              <Fragment key={p.id}>
                <tr>
                  <td className="tnum">{h?.charter}</td>
                  <td className="mono">{p.kode}</td>
                  <td>{p.nama}</td>
                  <td>{p.pic_nama}</td>
                  <td className="tnum">{persen(p.progres_aktual)} <span className="muted">/ {persen(p.progres_rencana)}</span></td>
                  <td><ChipKesehatan status={p.status_kesehatan} override={p.ada_override} /></td>
                </tr>
                {h?.foto && <tr><td className="tnum">{h.foto.hal}</td><td /><td colSpan={4}><span className="isi-sub">Foto kegiatan <span className="muted">· {h.foto.ket}</span></span></td></tr>}
              </Fragment>
            ); })}
            {lampiran.map((x, i) => (
              <tr key={i}><td className="tnum">{x.hal}</td><td /><td colSpan={4}>{i === 0 ? <b>{x.judul}</b> : <span className="isi-sub">{String.fromCharCode(64 + i)}. {x.judul}</span>}</td></tr>
            ))}
          </tbody>
        </table>
      </article>
    </>
  );
}
