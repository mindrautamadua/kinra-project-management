import { tanggalPelaksanaanFoto, tgl } from '@/lib/format';
import type { Aktivitas, FotoKegiatan } from '@/lib/types';

export type EntriLampiran = { hal: number; judul: string; ket?: string };

// Halaman pembatas "Lampiran" pada laporan cetak, berisi daftar lampiran dan nomor halamannya.
export function PembukaLampiran({ halaman, daftar, hariIni }: { halaman: number; daftar: EntriLampiran[]; hariIni: string }) {
  return (
    <article className="isi-page lampiran-pembuka">
      <header className="ch-head">
        <div>
          <div className="eyebrow">Hal. {halaman} · Per {tgl(hariIni)}</div>
          <h2>Lampiran</h2>
        </div>
      </header>
      <table className="cv-isi">
        <thead><tr><th>Hal.</th><th>Lampiran</th><th>Isi</th></tr></thead>
        <tbody>
          {daftar.map((x, i) => (
            <tr key={i}><td className="tnum">{x.hal}</td><td><b>{String.fromCharCode(65 + i)}.</b> {x.judul}</td><td className="muted">{x.ket}</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export const FOTO_PER_HALAMAN = 6;

// Satu halaman foto kegiatan untuk satu proyek (maksimal 6 foto), dicetak tepat setelah charter proyeknya;
// proyek dengan foto lebih banyak berlanjut ke halaman berikutnya.
export function HalamanFoto({ halaman, kode, nama, foto, aktivitas, ke, dari }: {
  halaman: number; kode: string; nama: string; foto: FotoKegiatan[];
  aktivitas: Map<string, Aktivitas>; ke: number; dari: number;
}) {
  return (
    <article className="isi-page foto-page">
      <header className="ch-head">
        <div>
          <div className="eyebrow">Hal. {halaman} · Lampiran charter · Foto kegiatan{dari > 1 ? ` (${ke}/${dari})` : ''}</div>
          <h2><span className="ch-kode">{kode}</span> {nama}</h2>
        </div>
      </header>
      <div className="foto-grid">
        {foto.map(f => { const a = aktivitas.get(f.activity_id); const kapan = tanggalPelaksanaanFoto(f, a); return (
          <figure key={f.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.url ? <img src={f.url} alt={f.keterangan ?? f.nama_file} /> : <div className="foto-hilang">File tidak tersedia</div>}
            <figcaption>
              <b>{a ? `${a.urutan}. ${a.nama}` : 'Aktivitas'}</b>
              {f.keterangan && <span>{f.keterangan}</span>}
              {kapan && <span className="muted">Pelaksanaan {kapan}</span>}
            </figcaption>
          </figure>
        ); })}
      </div>
    </article>
  );
}
