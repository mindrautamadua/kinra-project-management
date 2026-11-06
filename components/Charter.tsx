import type { CSSProperties } from 'react';
import { ChipKesehatan } from '@/components/Chip';
import { beririsan, kelengkapan, kolomMinggu, type Minggu, LABEL_STATUS_AKTIVITAS, rentangCharter, statusAktivitas } from '@/lib/charter';
import type { DetailProyek } from '@/lib/data';
import { angka, persen, rupiah, STATUS_PROYEK, tgl } from '@/lib/format';

const SUMBER: Record<string, string> = { rjpp: 'RJPP', rkap: 'RKAP', kpi: 'KPI' };

// Isian banyak baris tampil sebagai daftar rapat; tanda "-" atau "•" di awal baris dibuang. Teks tampil utuh.
function Isi({ teks, wajib = true }: { teks: string | null | undefined; wajib?: boolean }) {
  const baris = (teks ?? '').split('\n').map(b => b.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
  if (baris.length > 1) return <ul className="ch-poin">{baris.map((b, i) => <li key={i}>{b}</li>)}</ul>;
  if (baris.length) return <p className="ch-teks">{baris[0]}</p>;
  return wajib ? <p className="ch-kosong">Belum diisi</p> : <p className="ch-teks muted">–</p>;
}

// Satu halaman charter per proyek. Hampir semua isi dihitung dari data; hanya bagian
// "Charter" (tujuan, lingkup, deliverable, kriteria) yang diisi manusia, sekali per proyek.
export default function Charter({ d, hariIni }: {
  d: DetailProyek; hariIni: string; orang?: Map<string, string>;
}) {
  const { proyek: p, ringkas: r } = d;
  const rentang = rentangCharter(d, hariIni);
  const bulan = rentang ? kolomMinggu(rentang[0], rentang[1]) : [];
  const minggu = bulan.flatMap(b => b.minggu);
  const terakhir = d.riwayat.find(u => u.sudah_dilakukan || u.rencana_berikut);
  const masalah = d.masalah.filter(m => m.status === 'terbuka');
  const dukungan = d.dukungan.filter(x => ['diajukan', 'diproses'].includes(x.status));
  const lengkap = kelengkapan(d);
  // Proyek selesai tidak lagi wajib punya update mingguan dan rencana kerja berikutnya.
  const selesai = p.status === 'selesai';
  const aktual = r?.progres_aktual ?? 0;
  // Garis hari ini digambar di sel minggu berjalan, pada posisi hari ke-n dari minggu itu,
  // sehingga garisnya bersambung di semua baris dan menunjuk tanggal, bukan sekadar minggu.
  const penandaKini = (w: Minggu, kelas = '') => {
    if (!beririsan(w, hariIni, hariIni)) return { className: kelas || undefined };
    const hari = (x: string) => Date.parse(`${x}T00:00:00Z`) / 864e5;
    const x = ((hari(hariIni) - hari(w.mulai) + 0.5) / (hari(w.akhir) - hari(w.mulai) + 1)) * 100;
    return { className: `${kelas} kini`.trim(), style: { '--x': `${x}%` } as CSSProperties };
  };
  const rencana = r?.progres_rencana ?? 0;
  // Tanpa ringkasan deliverable proyek, charter memakai deliverable yang tercatat di aktivitas.
  const deliverableAktivitas = d.aktivitas.filter(a => a.deliverable && a.status !== 'dibatalkan').map(a => a.deliverable).join('\n');

  return (
    <article className="charter-page">
      <header className="ch-head">
        <div>
          <div className="eyebrow">Project Charter · {p.org_units?.nama}</div>
          <h2><span className="ch-kode">{p.kode}</span> {p.nama}</h2>
        </div>
        <div className="ch-status">
          {p.status === 'aktif' || p.status === 'selesai' ? <ChipKesehatan status={r?.status_kesehatan ?? null} override={r?.ada_override} /> : <span className="chip chip-na">{STATUS_PROYEK[p.status]}</span>}
        </div>
      </header>

      <dl className="ch-meta">
        <div><dt>Tanggal laporan</dt><dd>{tgl(hariIni)}</dd></div>
        <div><dt>PIC</dt><dd>{d.pics.length ? d.pics.map(x => x.nama).join(', ') : p.pic?.nama ?? '–'}
          {d.pics.length === 1 ? d.pics[0].jabatan && <small>{d.pics[0].jabatan}</small> : d.pics.length > 1 ? <small>PIC utama: {d.pics[0].nama}</small> : p.pic?.jabatan && <small>{p.pic.jabatan}</small>}</dd></div>
        {/* Sponsor sementara disembunyikan: <div><dt>Sponsor</dt><dd>{p.sponsor?.nama ?? <span className="ch-kosong">Belum diisi</span>}</dd></div> */}
        <div><dt>Mulai – target</dt><dd>{tgl(p.tanggal_mulai)} – {tgl(r?.tanggal_selesai_baseline ?? p.tanggal_selesai)}</dd></div>
        <div><dt>Anggaran</dt><dd>{rupiah(p.anggaran_rp_juta)}</dd></div>
      </dl>

      <section className="ch-identitas">
        <div><h3>Tujuan</h3><Isi teks={p.tujuan ?? p.deskripsi} /><h4>Manfaat</h4><Isi teks={p.manfaat} wajib={false} /></div>
        <div><h3>Ruang lingkup</h3><Isi teks={p.ruang_lingkup} /><h4>Di luar lingkup</h4><Isi teks={p.di_luar_lingkup} /></div>
        <div><h3>Deliverable</h3><Isi teks={p.deliverable?.trim() ? p.deliverable : deliverableAktivitas} /><h4>Kriteria selesai</h4><Isi teks={p.kriteria_selesai} /></div>
        <div>
          <h3>Sasaran strategis</h3>
          {d.sasaran.length ? <ul className="ch-list">{d.sasaran.map(s => <li key={s.kode}>{SUMBER[s.sumber]} {s.kode} · {s.nama}</li>)}</ul> : <Isi teks={null} wajib={false} />}
          <h4>Bergantung pada</h4>
          {d.ketergantungan.length
            ? <ul className="ch-list">{d.ketergantungan.map(k => <li key={k.id}>{k.kode} {k.nama} <span className={k.status === 'selesai' ? 'muted' : 'flag'}>({STATUS_PROYEK[k.status]})</span></li>)}</ul>
            : <Isi teks={null} wajib={false} />}
        </div>
      </section>

      <div className="ch-body">
        <section className="ch-progres">
          <div className="ch-total" role="img" aria-label={`Progres aktual ${angka(aktual)}%, rencana ${angka(rencana)}%`}>
            <span className="lbl">Progres s.d. saat ini</span>
            <div className="ch-total-track"><b style={{ width: `${Math.min(100, aktual)}%` }} /><u style={{ left: `calc(${Math.min(100, rencana)}% - 1px)` }} /></div>
            <span className="ch-total-val tnum">{persen(aktual)} <small>rencana {persen(rencana)}{r?.spi != null && ` · tercapai ${angka(r.spi * 100)}% dari target`}</small></span>
          </div>

          {minggu.length === 0 ? <p className="ch-kosong">Belum ada aktivitas bertanggal.</p> : (
            <div className="table-wrap ch-gantt-wrap">
              <table className="ch-gantt">
                <colgroup><col className="c-akt" /><col className="c-st" /><col className="c-tr" />{minggu.map(w => <col key={w.mulai} className="c-mg" />)}</colgroup>
                <thead>
                  <tr><th rowSpan={2} className="ch-akt">Aktivitas</th><th rowSpan={2} className="ch-st">Status</th><th rowSpan={2} className="ch-tr" />{bulan.map(b => <th key={b.label} colSpan={b.minggu.length} className="ch-bln">{b.label}</th>)}</tr>
                  <tr>{minggu.map(w => <th key={w.mulai} {...penandaKini(w)}>{w.label}</th>)}</tr>
                </thead>
                <tbody>
                  {d.aktivitas.filter(a => a.status !== 'dibatalkan').map(a => {
                    const rm = d.baseline[a.id]?.rencana_mulai ?? a.rencana_mulai;
                    const rs = d.baseline[a.id]?.rencana_selesai ?? a.rencana_selesai;
                    const akhirReal = a.aktual_selesai ?? (a.aktual_mulai ? hariIni : null);
                    const st = statusAktivitas(a, rs, hariIni);
                    return [
                      <tr key={`${a.id}-t`} className="t">
                        <td rowSpan={2} className="ch-akt">{a.urutan}. {a.milestone && <b className="ms" title="Milestone">◆ </b>}{a.nama}{a.deliverable && <small className="ch-dlv">→ {a.deliverable}</small>}</td>
                        <td rowSpan={2} className="ch-st"><span className={`ch-dot ${st}`} aria-hidden="true" />{LABEL_STATUS_AKTIVITAS[st]}{a.status !== 'selesai' && a.progres > 0 && <small> · {a.progres}%</small>}</td>
                        <td className="ch-tr">Target</td>
                        {minggu.map(w => <td key={w.mulai} {...penandaKini(w, beririsan(w, rm, rs) ? 'on' : '')} />)}
                      </tr>,
                      <tr key={`${a.id}-r`} className="r">
                        <td className="ch-tr">Real</td>
                        {minggu.map(w => <td key={w.mulai} {...penandaKini(w, beririsan(w, a.aktual_mulai, akhirReal) ? (a.status === 'selesai' ? 'on done' : 'on') : '')} />)}
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="ch-legend">
            <span><i className="lg-t" />Target (baseline)</span><span><i className="lg-r" />Real berjalan</span><span><i className="lg-d" />Real selesai</span>
            <span><span className="ch-dot tertunda" />Sedikit tertunda (≤ 14 hari)</span><span><span className="ch-dot perhatian" />Perlu perhatian khusus</span>
            <span className="kini-lg">Garis hijau = hari ini ({tgl(hariIni, false)})</span>
          </div>
        </section>

        <aside className="ch-side">
          <div className="ch-box">
            <h3>Update saat ini <small>{terakhir?.report_periods?.label ?? ''}</small></h3>
            <Isi teks={terakhir?.sudah_dilakukan} wajib={!selesai} />
          </div>
          <div className="ch-box">
            <h3>Problem identification → corrective action</h3>
            {masalah.length === 0 ? <p className="ch-teks muted">Tidak ada masalah terbuka.</p> : masalah.map(m => (
              <div key={m.id} className="ch-pica">
                <p><b>PI:</b> {m.judul}{m.dampak && <span className="muted"> — {m.dampak}</span>}</p>
                {m.actions.filter(a => a.status !== 'dibatalkan').map(a => (
                  <p key={a.id} className="ca"><b>CA:</b> {a.deskripsi}{a.status === 'selesai' && <span className="muted"> (selesai)</span>}
                    {!selesai && a.status !== 'selesai' && a.tanggal_target < hariIni && <span className="flag"> lewat target</span>}</p>
                ))}
              </div>
            ))}
          </div>
          <div className="ch-box">
            <h3>Next step (rencana kerja)</h3>
            <Isi teks={terakhir?.rencana_berikut} wajib={!selesai} />
          </div>
          {/* Kotak dukungan hanya tampil bila ada permintaan terbuka, agar charter muat satu halaman. */}
          {dukungan.length > 0 && (
            <div className="ch-box">
              <h3>Dukungan yang dibutuhkan</h3>
              <ul className="ch-list">{dukungan.map(x => <li key={x.id}>{x.permintaan} <span className="muted">(tenggat {tgl(x.tenggat, false)})</span></li>)}</ul>
            </div>
          )}
        </aside>
      </div>

      <footer className="ch-foot">
        <span>Dihasilkan otomatis dari KINRA Project Hub · data per {tgl(hariIni)}</span>
        <span className={lengkap.terisi < lengkap.total ? 'flag' : 'muted'}>
          Kelengkapan charter {lengkap.terisi}/{lengkap.total}{lengkap.kosong.length > 0 && ` · belum: ${lengkap.kosong.join(', ')}`}
        </span>
      </footer>
    </article>
  );
}
