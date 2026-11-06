import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Chip, ChipKesehatan, ChipUpdate, Progres, SectionHead } from '@/components/Chip';
import Gantt from '@/components/Gantt';
import { daftarProyek, dukunganTerbuka, pemeriksaan, periodeBerjalan } from '@/lib/data';
import { angka, hariIni, tgl } from '@/lib/format';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';

type Cari = Promise<Record<string, string | string[] | undefined>>;

const UNIT = [
  { kode: 'semua', label: 'Semua' },
  { kode: 'A', label: 'Manajemen Risiko' },
  { kode: 'B', label: 'Teknologi Informasi' },
];
const FILTER_STATUS: Record<string, (s: string | null) => boolean> = {
  semua: () => true,
  kritis: s => s === 'kritis',
  perhatian: s => s === 'terlambat' || s === 'waspada',
};

async function tanggapi(form: FormData) {
  'use server';
  const sb = await supabase();
  const status = String(form.get('status'));
  const { error } = await sb.from('support_requests')
    .update({ status, tanggapan: String(form.get('tanggapan') ?? '').trim() || null })
    .eq('id', String(form.get('id')));
  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export default async function Dasbor({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const unit = typeof sp.unit === 'string' && UNIT.some(u => u.kode === sp.unit) ? sp.unit : 'semua';
  const fs = typeof sp.status === 'string' && sp.status in FILTER_STATUS ? sp.status : 'semua';
  const href = (p: { unit?: string; status?: string }) => {
    const u = p.unit ?? unit, s = p.status ?? fs;
    const q = new URLSearchParams({ ...(u !== 'semua' && { unit: u }), ...(s !== 'semua' && { status: s }) }).toString();
    return q ? `/?${q}` : '/';
  };

  const [saya, periode, semua, dukungan] = await Promise.all([penggunaSaatIni(), periodeBerjalan(), daftarProyek(), dukunganTerbuka()]);
  const diUnit = semua.filter(p => unit === 'semua' || p.unit_kode.startsWith(unit));
  const aktif = diUnit.filter(p => p.status === 'aktif');
  const selesai = diUnit.filter(p => p.status === 'selesai');
  const cek = await pemeriksaan(periode, aktif);
  const n = (s: string) => aktif.filter(p => p.status_kesehatan === s).length;
  const tertinggal = aktif.filter(p => ['kritis', 'terlambat', 'waspada'].includes(p.status_kesehatan ?? '')).length;
  const tepat = aktif.length - cek.belumDiajukan.length;
  const tabel = aktif.filter(p => FILTER_STATUS[fs](p.status_kesehatan));
  const lewat = aktif.filter(p => p.tanggal_selesai_baseline && p.tanggal_selesai_baseline < hariIni()).length;
  const dukunganUnit = dukungan.filter(d => unit === 'semua' || !d.proyek_kode || d.proyek_kode.startsWith(unit));
  const untukSaya = dukunganUnit.filter(d => d.ditujukan_ke === saya.id);
  const lainnya = dukunganUnit.filter(d => d.ditujukan_ke !== saya.id);
  const telat = dukunganUnit.filter(d => d.lewat_tenggat).length;

  const tiles = [
    { lbl: 'Proyek aktif', val: aktif.length, meta: `${selesai.length} selesai`, f: 'semua' },
    { lbl: 'Kritis', val: n('kritis'), meta: 'SPI < 0,70 atau lewat tenggat', f: 'kritis', cls: 'crit' },
    { lbl: 'Terlambat · Waspada', val: `${n('terlambat')} · ${n('waspada')}`, meta: 'SPI 0,70–0,95', f: 'perhatian' },
    { lbl: 'Sesuai rencana', val: n('sesuai'), meta: 'SPI ≥ 0,95' },
    { lbl: 'Update terverifikasi', val: aktif.length ? `${Math.round((100 * tepat) / aktif.length)}%` : '–', meta: `${tepat} dari ${aktif.length} · target ≥ 95%` },
    { lbl: 'Dukungan menunggu', val: dukunganUnit.length, meta: `${telat} lewat tenggat` },
  ];

  return (
    <>
      <section className="section first">
        <div className="row filter-row">
          <div className="seg" role="group" aria-label="Filter unit">
            {UNIT.map(u => <Link key={u.kode} href={href({ unit: u.kode })} aria-pressed={unit === u.kode} className="seg-link">{u.label}</Link>)}
          </div>
        </div>
        <SectionHead no="01" eyebrow={`Ringkasan portofolio · ${periode.label}`}
          judul={aktif.length === 0 ? 'Belum ada proyek aktif' : n('kritis') ? `${n('kritis')} dari ${aktif.length} proyek aktif berstatus Kritis` : `Tidak ada proyek Kritis dari ${aktif.length} proyek aktif`}>
          <p className="muted">Status dihitung sistem dari baseline dan progres aktivitas per hari ini, bukan dari isian PIC.</p>
        </SectionHead>
        <div className="tiles tiles-6">
          {tiles.map(t => {
            const isi = <><div className="lbl">{t.lbl}</div><div className="val tnum">{t.val}</div><div className="meta">{t.meta}</div></>;
            return t.f
              ? <Link key={t.lbl} href={href({ status: t.f })} className={`tile tile-link ${t.cls ?? ''}`} aria-pressed={fs === t.f && t.f !== 'semua'}>{isi}</Link>
              : <div key={t.lbl} className={`tile ${t.cls ?? ''}`}>{isi}</div>;
          })}
        </div>
      </section>

      <section className="section">
        <SectionHead no="02" eyebrow="Perlu keputusan"
          judul={dukunganUnit.length ? `${dukunganUnit.length} permintaan dukungan menunggu${telat ? `, ${telat} lewat tenggat` : ''}` : 'Tidak ada permintaan dukungan yang menunggu'}>
          <p className="muted">Pengganti kolom &quot;Dukungan yang dibutuhkan&quot;. Penerima menanggapi langsung dari sini.</p>
        </SectionHead>
        <div className="grid-1-2">
          <div className="card">
            <h3>Pemeriksaan otomatis minggu ini</h3>
            <p className="muted small">Hal yang dulu lolos di laporan slide</p>
            <div className="checks">
              <Cek n={cek.belumDiajukan.length} t="Update belum terverifikasi" d={cek.belumDiajukan.map(p => p.kode).join(', ')} />
              <Cek n={cek.rebaseline.length} t="Baseline diganti minggu ini" d={cek.rebaseline.map(p => p.kode).join(', ')} />
              <Cek n={cek.aksiTerlambat} t="Aksi korektif lewat target" d="Status terbuka/berjalan, tanggal target terlewati" />
              <Cek n={cek.drafTanpaData.length} t="Proyek draf tanpa tanggal" d={cek.drafTanpaData.map(p => p.kode).join(', ')} />
              <Cek n={cek.rutinTerlambat.length} t="Pekerjaan rutin terlambat" d={cek.rutinTerlambat.map(r => `${r.nama} (${r.periode})`).join(', ')} />
            </div>
          </div>
          <div className="card">
            <div className="row"><div><h3>Perlu keputusan Anda</h3><p className="muted small">Urut dari tenggat terdekat</p></div></div>
            <div className="decisions">
              {untukSaya.length === 0 && <p className="muted small kosong">Tidak ada permintaan yang ditujukan kepada Anda.</p>}
              {untukSaya.map(d => (
                <div key={d.id} className={`dec ${d.lewat_tenggat ? 'late' : ''}`}>
                  <div className="bar" />
                  <div>
                    <div className="eyebrow">{d.proyek_kode ?? 'Unit'}{d.diajukan_nama ? ` · dari ${d.diajukan_nama}` : ''}</div>
                    <h4>{d.permintaan}</h4>
                    {d.dampak_bila_tidak && <p className="who">Bila tidak dipenuhi: {d.dampak_bila_tidak}</p>}
                    <details className="tanggapan">
                      <summary>Tanggapi</summary>
                      <form action={tanggapi}>
                        <input type="hidden" name="id" value={d.id} />
                        <textarea name="tanggapan" rows={2} placeholder="Tanggapan atau keputusan" aria-label="Tanggapan" />
                        <div className="acts">
                          <button className="btn" name="status" value="diproses">Diproses</button>
                          <button className="btn" name="status" value="ditolak">Tolak</button>
                          <button className="btn primary" name="status" value="dipenuhi">Penuhi</button>
                        </div>
                      </form>
                    </details>
                  </div>
                  <div className="due">{d.lewat_tenggat ? 'Lewat tenggat' : 'Tenggat'}<b>{tgl(d.tenggat, false)}</b></div>
                </div>
              ))}
              {lainnya.length > 0 && <p className="muted small">Menunggu pihak lain: {lainnya.map(d => `${d.proyek_kode ?? 'Unit'} → ${d.ditujukan_nama} (${tgl(d.tenggat, false)})`).join(' · ')}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead no="03" eyebrow="Portofolio proyek aktif" judul={`Progres aktual tertinggal dari rencana di ${tertinggal} proyek`}>
          <p className="muted">Bar biru = % aktual, garis jingga = % rencana baseline per hari ini. Klik nama proyek untuk detail, Gantt, dan PICA.</p>
        </SectionHead>
        <div className="card">
          <div className="row">
            <div className="legend"><span><i style={{ background: 'var(--s1)' }} />% aktual</span><span><i style={{ background: 'var(--s2)', width: 3 }} />% rencana</span></div>
            <div className="seg" role="group" aria-label="Filter status">
              {[['semua', 'Semua'], ['kritis', 'Kritis'], ['perhatian', 'Terlambat & Waspada']].map(([k, l]) =>
                <Link key={k} href={href({ status: k })} aria-pressed={fs === k} className="seg-link">{l}</Link>)}
            </div>
          </div>
          <div className="table-wrap">
            <table className="tbl tbl-portofolio">
              <thead><tr><th>Kode</th><th>Proyek · PIC</th><th>Tenggat baseline</th><th>Progres</th><th className="num">SPI</th><th>Status</th><th>Update terakhir</th><th>PICA</th></tr></thead>
              <tbody>
                {tabel.length === 0 && <tr><td colSpan={8} className="kosong">Tidak ada proyek yang cocok dengan filter ini.</td></tr>}
                {tabel.map(p => (
                  <tr key={p.id}>
                    <td className="kode">{p.kode}</td>
                    <td><Link href={`/proyek/${p.id}`} className="tautan">{p.nama}</Link><div className="upd">{p.pic_nama} · {p.unit_nama}{p.ketergantungan_terbuka > 0 && <span className="flag"> · menunggu {p.ketergantungan_terbuka} proyek lain</span>}</div></td>
                    <td className="mono small">{tgl(p.tanggal_selesai_baseline)}{p.tanggal_selesai_baseline && p.tanggal_selesai_baseline < hariIni() && <span className="flag"> lewat</span>}</td>
                    <td><Progres aktual={p.progres_aktual} rencana={p.progres_rencana} /></td>
                    <td className="num">{angka(p.spi, 2)}</td>
                    <td><ChipKesehatan status={p.status_kesehatan} override={p.ada_override} /></td>
                    <td><ChipUpdate status={p.status_update_terakhir} />{p.update_terakhir && <div className="upd">{p.update_terakhir}</div>}</td>
                    <td className="small">{p.masalah_terbuka} masalah{p.aksi_terlambat > 0 && <span className="flag"> · {p.aksi_terlambat} aksi telat</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={8} className="muted small">{tabel.length} proyek · sumber: v_proyek_kesehatan, dihitung {tgl(hariIni())}</td></tr></tfoot>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead no="04" eyebrow="Jadwal" judul={lewat ? `${lewat} proyek sudah melewati tenggat baseline` : 'Tidak ada proyek yang melewati tenggat baseline'}>
          <p className="muted">Kotak putus-putus = rentang baseline. Bar biru = progres aktual. Arsir merah = waktu yang terlewat sejak tenggat.</p>
        </SectionHead>
        <div className="card">
          <Gantt hariIni={hariIni()} baris={aktif.map(p => ({
            id: p.id, kode: p.kode, nama: p.nama, href: `/proyek/${p.id}`,
            rencanaMulai: p.tanggal_mulai, rencanaSelesai: p.tanggal_selesai_baseline, progres: p.progres_aktual,
          }))} />
        </div>
      </section>

      <section className="section">
        <SectionHead no="05" eyebrow="Arsip" judul={`${selesai.length} proyek selesai`} />
        <div className="card">
          {selesai.length === 0 ? <p className="muted small">Belum ada proyek selesai.</p> : (
            <div className="list-ringkas">
              {selesai.map(p => <Link key={p.id} href={`/proyek/${p.id}`}><span className="mono small muted">{p.kode}</span> {p.nama}<Chip kode="info" label="Selesai" /></Link>)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Cek({ n, t, d }: { n: number; t: string; d: string }) {
  return (
    <div className={`check ${n ? 'ada' : ''}`}>
      <span className="n tnum">{n}</span>
      <span className="t">{t}{n > 0 && d && <small>{d}</small>}</span>
    </div>
  );
}
