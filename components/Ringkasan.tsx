import { ChipKesehatan } from '@/components/Chip';
import { angka, tgl } from '@/lib/format';
import { JENDELA_PERUBAHAN, type Ringkasan as Data } from '@/lib/ringkasan';

// Daftar pendek agar ringkasan tetap satu halaman; sisanya ada di lampiran.
const ringkas = (xs: string[], maks = 4) => xs.length <= maks ? xs.join(', ') : `${xs.slice(0, maks).join(', ')}, +${xs.length - maks} lainnya`;

// Kalimat pembuka: kesimpulan + keputusan yang diminta, disusun dari data.
function kalimatUtama(r: Data) {
  const n = r.aktif.length;
  const { kritis, terlambat, waspada, sesuai, lainnya } = r.jumlah;
  const bagian: string[] = [];
  if (n === 0) bagian.push('Belum ada proyek aktif');
  else if (sesuai === n) bagian.push(`Seluruh ${n} proyek aktif sesuai rencana`);
  else if (waspada === n) bagian.push(`Seluruh ${n} proyek aktif berstatus waspada`);
  else if (kritis + terlambat === 0) {
    // sebut tiap status terpisah: waspada bukan "sesuai rencana"
    const rinci = [[sesuai, 'sesuai rencana'], [waspada, 'waspada'], [lainnya, 'status lainnya']] as const;
    bagian.push(`Tidak ada proyek aktif yang tertinggal jadwal: ${rinci.filter(([x]) => x > 0).map(([x, l]) => `${x} ${l}`).join(', ')}`);
  } else bagian.push(`${kritis + terlambat} dari ${n} proyek aktif tertinggal dari jadwal (${kritis} kritis, ${terlambat} terlambat)`);
  if (r.keputusan.length) {
    bagian.push(`${r.keputusan.length} keputusan diminta dari pimpinan, tenggat terdekat ${tgl(r.keputusan[0].tenggat, false)}`);
  } else bagian.push('tidak ada keputusan yang diminta');
  return bagian.join('; ') + '.';
}

export default function Ringkasan({ r }: { r: Data }) {
  const j = r.jumlah;
  const catatan = (r.catatan ?? '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
  const ubah = r.perubahan;
  const adaUbah = ubah.selesai.length + ubah.baseline.length + ubah.baru.length > 0;

  return (
    <article className="ringkasan-page">
      <header className="rs-head">
        <div>
          <div className="eyebrow">Ringkasan eksekutif · Bagian Manajemen Risiko dan TI · per {tgl(r.hariIni)}</div>
          <h2>{kalimatUtama(r)}</h2>
        </div>
        <div className="rs-tgl">Data per {tgl(r.hariIni)}<br />Lampiran: {r.aktif.length} charter proyek</div>
      </header>

      <div className="rs-grid-atas">
        <section className="rs-box rs-keputusan">
          <h3>1. Keputusan yang diminta</h3>
          {r.keputusan.length === 0 ? <p className="rs-kosong">Tidak ada keputusan yang diminta.</p> : (
            <ol>
              {r.keputusan.slice(0, 3).map(k => (
                <li key={k.id} className={k.lewat_tenggat ? 'telat' : undefined}>
                  <b>{k.permintaan}</b>
                  {k.dampak_bila_tidak && <span className="rs-sub">Bila tidak: {k.dampak_bila_tidak}</span>}
                  <span className="rs-sub">{k.proyek_kode ?? 'Unit'} · kepada {k.ditujukan_nama} · tenggat <b>{tgl(k.tenggat, false)}</b>{k.lewat_tenggat && ' (lewat)'}</span>
                </li>
              ))}
            </ol>
          )}
          {r.keputusan.length > 3 && <p className="rs-sub">+{r.keputusan.length - 3} keputusan lain di lampiran.</p>}
          {r.dukunganLain > 0 && <p className="rs-sub">{r.dukunganLain} permintaan dukungan operasional lainnya sedang ditangani di tingkat bagian.</p>}
        </section>

        <section className="rs-box">
          <h3>2. Kondisi portofolio</h3>
          <div className="rs-angka">
            <div className="crit"><b>{j.kritis}</b><span>Kritis</span></div>
            <div className="serious"><b>{j.terlambat}</b><span>Terlambat</span></div>
            <div className="warn"><b>{j.waspada}</b><span>Waspada</span></div>
            <div className="good"><b>{j.sesuai}</b><span>Sesuai</span></div>
            <div className="info"><b>{j.selesai}</b><span>Selesai</span></div>
          </div>
          <table className="rs-matriks">
            <thead><tr><th>Bidang</th><th>Kritis</th><th>Terlambat</th><th>Waspada</th><th>Sesuai</th><th>Lainnya</th></tr></thead>
            <tbody>
              {r.bidang.map(b => (
                <tr key={b.kode}><td>{b.nama}</td><td className={b.kritis ? 'crit' : ''}>{b.kritis}</td><td className={b.terlambat ? 'serious' : ''}>{b.terlambat}</td><td>{b.waspada}</td><td>{b.sesuai}</td><td>{b.lainnya}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="rs-box">
        <h3>3. Proyek yang perlu perhatian</h3>
        {r.perhatian.length === 0 ? <p className="rs-kosong">Tidak ada proyek Kritis atau Terlambat.</p> : (
          <table className="rs-tabel">
            <thead><tr><th>Proyek</th><th>Status</th><th>Progres</th><th>Masalah utama</th><th>Tindakan & penanggung jawab</th></tr></thead>
            <tbody>
              {r.perhatian.map(p => (
                <tr key={p.id}>
                  <td><span className="mono">{p.kode}</span> {p.nama}<span className="rs-sub">PIC {p.pic_nama}</span></td>
                  <td><ChipKesehatan status={p.status_kesehatan} /></td>
                  <td className="nowrap">{angka(p.progres_aktual)}% dari rencana {angka(p.progres_rencana)}%{p.tanggal_selesai_baseline && <span className="rs-sub">target {tgl(p.tanggal_selesai_baseline, false)}</span>}</td>
                  <td>{p.masalah ?? <span className="rs-kosong">Belum dicatat</span>}</td>
                  <td>{p.tindakan ?? <span className="rs-kosong">Belum ada</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="rs-grid-bawah">
        <section className="rs-box">
          <h3>4. Perubahan {JENDELA_PERUBAHAN} hari terakhir</h3>
          {!adaUbah ? <p className="rs-kosong">Tidak ada proyek selesai, baseline diganti, atau proyek baru.</p> : (
            <ul>
              {ubah.selesai.length > 0 && <li><b>Selesai:</b> {ringkas(ubah.selesai.map(p => `${p.kode} ${p.nama}`), 3)}</li>}
              {ubah.baseline.length > 0 && <li><b>Baseline diganti:</b> {ringkas(ubah.baseline.map(p => `${p.kode} (v${p.versi})`), 6)}</li>}
              {ubah.baru.length > 0 && <li><b>Proyek baru:</b> {ubah.baru.length > 4 ? `${ubah.baru.length} proyek (${ringkas(ubah.baru.map(p => p.kode), 6)})` : ringkas(ubah.baru.map(p => `${p.kode} ${p.nama}`))}</li>}
            </ul>
          )}
        </section>
        <section className="rs-box">
          <h3>5. Empat minggu ke depan</h3>
          {r.mendatang.length === 0 ? <p className="rs-kosong">Tidak ada tenggat aktivitas dalam 4 minggu.</p> : (
            <ul className="rs-mendatang">
              {r.mendatang.map((m, i) => (
                <li key={i}><span className="mono">{tgl(m.tanggal, false)}</span> {m.milestone && <b title="Milestone">◆ </b>}<span className="mono muted">{m.kode}</span> {m.aktivitas}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="rs-box">
          <h3>6. Catatan Kabag & isu lintas unit</h3>
          {catatan.length > 0 ? <ul>{catatan.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="rs-kosong">Tidak ada catatan Kabag.</p>}
          {r.isuUnit.length > 0 && (
            <>
              <h4>Isu lintas unit</h4>
              <ul>{r.isuUnit.map((x, i) => <li key={i}><span className="mono muted">{x.unit}</span> {x.judul} <span className="rs-sub-inline">({x.keparahan})</span></li>)}</ul>
            </>
          )}
        </section>
      </div>

      <footer className="rs-foot">
        Status dihitung sistem dari baseline: <b>Sesuai</b> progres ≥ 95% dari rencana · <b>Waspada</b> 85–95% · <b>Terlambat</b> 70–85% · <b>Kritis</b> &lt; 70% atau melewati target.
        Sumber: KINRA Project Hub. Detail tiap proyek di lampiran.
      </footer>
    </article>
  );
}
