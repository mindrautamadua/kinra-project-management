import { ChipKesehatan } from '@/components/Chip';
import { angka, tgl } from '@/lib/format';
import { JENDELA_PERUBAHAN, type Ringkasan as Data } from '@/lib/ringkasan';

// Daftar pendek agar ringkasan tetap satu halaman; sisanya ada di lampiran.
const ringkas = (xs: string[], maks = 4) => xs.length <= maks ? xs.join(', ') : `${xs.slice(0, maks).join(', ')}, +${xs.length - maks} lainnya`;
const selisihHari = (dari: string, ke: string) => Math.round((Date.parse(`${ke}T00:00:00Z`) - Date.parse(`${dari}T00:00:00Z`)) / 86_400_000);

// Urutan dan warna segmen status. Warna kuat hanya untuk status yang menuntut tindakan; "Sesuai" dan "Lainnya" diredam.
const SEGMEN = [
  { k: 'kritis', label: 'Kritis', cls: 'sg-crit' },
  { k: 'terlambat', label: 'Terlambat', cls: 'sg-serious' },
  { k: 'waspada', label: 'Waspada', cls: 'sg-warn' },
  { k: 'sesuai', label: 'Sesuai', cls: 'sg-good' },
  { k: 'lainnya', label: 'Lainnya', cls: 'sg-other' },
] as const;
type Hitungan = Record<(typeof SEGMEN)[number]['k'], number>;

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

// Tiga poin pendukung judul (situasi, komplikasi, permintaan), semuanya dihitung dari data.
function poinPendukung(r: Data): { label: string; teks: string }[] {
  const n = r.aktif.length;
  if (n === 0) return [];
  const poin: { label: string; teks: string }[] = [];
  const { kritis, terlambat, waspada, sesuai } = r.jumlah;
  const pct = (x: number) => Math.round((x / n) * 100);
  poin.push({
    label: 'Kondisi',
    teks: `${sesuai} dari ${n} proyek aktif (${pct(sesuai)}%) sesuai rencana${waspada ? `, ${waspada} waspada` : ''}${r.jumlah.selesai ? `; ${r.jumlah.selesai} proyek telah selesai` : ''}.`,
  });

  const berisiko = [...r.bidang].map(b => ({ ...b, risiko: b.kritis + b.terlambat, total: b.kritis + b.terlambat + b.waspada + b.sesuai + b.lainnya }))
    .filter(b => b.risiko > 0).sort((a, b) => b.risiko - a.risiko);
  const terburuk = [...r.perhatian].sort((a, b) => ((a.progres_aktual ?? 0) - (a.progres_rencana ?? 0)) - ((b.progres_aktual ?? 0) - (b.progres_rencana ?? 0)))[0];
  if (kritis + terlambat > 0 && terburuk) {
    const gap = Math.max(0, (terburuk.progres_rencana ?? 0) - (terburuk.progres_aktual ?? 0));
    const pusat = berisiko.length && berisiko[0].risiko > (kritis + terlambat) / 2 ? ` Risiko terpusat di ${berisiko[0].nama} (${berisiko[0].risiko} dari ${berisiko[0].total} proyek).` : '';
    poin.push({ label: 'Isu', teks: `Kesenjangan terbesar: ${terburuk.kode} ${terburuk.nama}, tertinggal ${angka(gap)} poin dari rencana.${pusat}` });
  } else if (waspada > 0) {
    poin.push({ label: 'Isu', teks: `${waspada} proyek waspada perlu dijaga agar tidak turun menjadi terlambat.` });
  }

  if (r.keputusan.length) {
    const k = r.keputusan[0];
    poin.push({ label: 'Diminta', teks: `${k.permintaan}${k.proyek_kode && k.permintaan.includes(k.proyek_kode) ? '' : ` (${k.proyek_kode ?? 'unit'})`}, tenggat ${tgl(k.tenggat, false)}${r.keputusan.length > 1 ? `; +${r.keputusan.length - 1} keputusan lain` : ''}.` });
  } else {
    const ms = r.mendatang.filter(m => m.milestone).length;
    poin.push({ label: 'Ke depan', teks: `Tidak ada keputusan yang diminta. ${r.mendatang.length ? `${r.mendatang.length} tenggat aktivitas${ms ? ` (${ms} milestone)` : ''} dalam 4 minggu ke depan.` : 'Tidak ada tenggat aktivitas dalam 4 minggu.'}` });
  }
  return poin;
}

// Batang 100% bertumpuk: komposisi status. `skala` > total membuat batang absolut (dipakai per bidang).
function Batang({ h, skala, label }: { h: Hitungan; skala: number; label: string }) {
  return (
    <div className="rs-bar" role="img" aria-label={`${label}: ${SEGMEN.filter(s => h[s.k]).map(s => `${h[s.k]} ${s.label.toLowerCase()}`).join(', ') || 'tidak ada proyek'}`}>
      {SEGMEN.map(s => h[s.k] > 0 && (
        <i key={s.k} className={s.cls} style={{ width: `${(h[s.k] / skala) * 100}%` }}>{h[s.k]}</i>
      ))}
    </div>
  );
}

// Progres aktual vs rencana: isi = aktual, celah merah = ketertinggalan, garis tegak = posisi rencana.
function Celah({ aktual, rencana }: { aktual: number; rencana: number }) {
  const a = Math.min(100, Math.max(0, aktual)), r = Math.min(100, Math.max(0, rencana));
  return (
    <div className="rs-celah" role="img" aria-label={`Aktual ${angka(a)}%, rencana ${angka(r)}%`}>
      <i className="isi" style={{ width: `${a}%` }} />
      {r > a && <i className="gap" style={{ left: `${a}%`, width: `${r - a}%` }} />}
      <i className="rencana" style={{ left: `${r}%` }} />
    </div>
  );
}

export default function Ringkasan({ r, halaman }: { r: Data; halaman?: number }) {
  const j = r.jumlah;
  const catatan = (r.catatan ?? '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
  const ubah = r.perubahan;
  const adaUbah = ubah.selesai.length + ubah.baru.length > 0;
  const poin = poinPendukung(r);
  const n = r.aktif.length;
  const bidang = r.bidang.map(b => ({ ...b, total: b.kritis + b.terlambat + b.waspada + b.sesuai + b.lainnya }))
    .filter(b => b.total > 0)
    .sort((a, b) => (b.kritis * 2 + b.terlambat) - (a.kritis * 2 + a.terlambat) || b.total - a.total);
  const skalaBidang = Math.max(1, ...bidang.map(b => b.total));

  return (
    <article className="ringkasan-page">
      <header className="rs-head">
        <div className="rs-head-isi">
          <div className="eyebrow">Ringkasan eksekutif · Bagian Manajemen Risiko dan TI · per {tgl(r.hariIni)}</div>
          <h2>{kalimatUtama(r)}</h2>
          {poin.length > 0 && (
            <ul className="rs-poin">
              {poin.map(p => <li key={p.label}><b>{p.label}</b><span>{p.teks}</span></li>)}
            </ul>
          )}
        </div>
        <div className="rs-tgl">Data per {tgl(r.hariIni)}<br />Lampiran: {n} charter proyek</div>
      </header>

      <div className="rs-grid-atas">
        <section className="rs-box rs-keputusan">
          <h3>1. Keputusan yang diminta</h3>
          {r.keputusan.length === 0 ? <p className="rs-kosong">Tidak ada keputusan yang diminta.</p> : (
            <ol className="rs-kartu">
              {r.keputusan.slice(0, 3).map(k => {
                const sisa = selisihHari(r.hariIni, k.tenggat);
                const mendesak = k.lewat_tenggat || sisa < 0 ? 'telat' : sisa <= 7 ? 'dekat' : '';
                return (
                  <li key={k.id} className={mendesak || undefined}>
                    <div className="rs-hitung">
                      <b>{sisa < 0 ? `+${-sisa}` : sisa === 0 ? 'Hari ini' : `H-${sisa}`}</b>
                      <span>{sisa < 0 ? 'hari lewat' : tgl(k.tenggat, false)}</span>
                    </div>
                    <div>
                      <b className="rs-minta">{k.permintaan}</b>
                      {k.dampak_bila_tidak && <span className="rs-sub"><em>Bila tidak diputuskan:</em> {k.dampak_bila_tidak}</span>}
                      <span className="rs-sub">{k.proyek_kode ?? 'Unit'} · kepada {k.ditujukan_nama}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {r.keputusan.length > 3 && <p className="rs-sub">+{r.keputusan.length - 3} keputusan lain di lampiran.</p>}
          {r.dukunganLain > 0 && <p className="rs-sub">{r.dukunganLain} permintaan dukungan operasional lainnya sedang ditangani di tingkat bagian.</p>}
        </section>

        <section className="rs-box">
          <h3>2. Kondisi portofolio · {n} proyek aktif{j.selesai ? ` · ${j.selesai} selesai` : ''}</h3>
          {n === 0 ? <p className="rs-kosong">Belum ada proyek aktif.</p> : (
            <>
              <Batang h={j} skala={n} label="Komposisi status proyek aktif" />
              <ul className="rs-legenda">
                {SEGMEN.filter(s => s.k !== 'lainnya' || j.lainnya > 0).map(s => (
                  <li key={s.k}><i className={s.cls} /><b>{j[s.k]}</b> {s.label}<span>{Math.round((j[s.k] / n) * 100)}%</span></li>
                ))}
              </ul>
              {bidang.length > 0 && (
                <div className="rs-bidang">
                  <div className="rs-mini-judul">Per bidang, diurutkan dari yang paling berisiko</div>
                  {bidang.map(b => (
                    <div key={b.kode} className="rs-bidang-baris">
                      <span className="nm">{b.nama}</span>
                      <Batang h={b} skala={skalaBidang} label={b.nama} />
                      <span className="jml">{b.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <section className="rs-box">
        <h3>3. Proyek yang perlu perhatian</h3>
        {r.perhatian.length === 0 ? <p className="rs-kosong">Tidak ada proyek Kritis atau Terlambat.</p> : (
          <table className="rs-tabel">
            <thead><tr><th>Proyek</th><th>Status</th><th>Progres aktual vs rencana</th><th>Masalah utama</th><th>Tindakan & penanggung jawab</th></tr></thead>
            <tbody>
              {r.perhatian.map(p => {
                const a = p.progres_aktual ?? 0, rc = p.progres_rencana ?? 0;
                return (
                  <tr key={p.id}>
                    <td><span className="mono">{p.kode}</span> {p.nama}<span className="rs-sub">PIC {p.pic_nama}</span></td>
                    <td><ChipKesehatan status={p.status_kesehatan} /></td>
                    <td className="rs-td-celah">
                      <Celah aktual={a} rencana={rc} />
                      <span className="rs-sub"><b>{angka(a)}%</b> vs {angka(rc)}%{rc > a && <span className="turun"> · −{angka(rc - a)} poin</span>}{p.tanggal_selesai_baseline && ` · target ${tgl(p.tanggal_selesai_baseline, false)}`}</span>
                    </td>
                    <td>{p.masalah ?? <span className="rs-kosong">Belum dicatat</span>}</td>
                    <td>{p.tindakan ?? <span className="rs-kosong">Belum ada</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="rs-grid-bawah">
        <section className="rs-box">
          <h3>4. Perubahan {JENDELA_PERUBAHAN} hari terakhir</h3>
          {!adaUbah ? <p className="rs-kosong">Tidak ada proyek selesai atau proyek baru.</p> : (
            <ul>
              {ubah.selesai.length > 0 && <li><b>Selesai:</b> {ringkas(ubah.selesai.map(p => `${p.kode} ${p.nama}`), 3)}</li>}
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
        <span>
          Status dihitung sistem dari baseline: <b>Sesuai</b> progres ≥ 95% dari rencana · <b>Waspada</b> 85–95% · <b>Terlambat</b> 70–85% · <b>Kritis</b> &lt; 70% atau melewati target.
          Sumber: KINRA Project Hub. Detail tiap proyek di lampiran.
        </span>
        <span className="rs-foot-kanan">Rahasia · untuk Direksi{halaman ? ` · Hal. ${halaman}` : ''}</span>
      </footer>
    </article>
  );
}
