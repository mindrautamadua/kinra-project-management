import Link from 'next/link';
import { CircleCheck, Send, TriangleAlert } from 'lucide-react';
import { Chip, SectionHead } from '@/components/Chip';
import { daftarProyek, daftarUnit, profilAktif } from '@/lib/data';
import { hariIni, tgl, type KodeStatus } from '@/lib/format';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import { ajukanDukungan, tanggapiDukungan } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;

interface Permintaan {
  id: string; jenis: string; permintaan: string; dampak_bila_tidak: string | null; tenggat: string; status: string; tanggapan: string | null;
  diajukan_at: string; ditanggapi_at: string | null; ditujukan_ke: string; diajukan_oleh: string | null; project_id: string | null;
  penerima: { nama: string; jabatan: string | null } | null; pengaju: { nama: string } | null;
  projects: { kode: string; nama: string } | null; org_units: { kode: string; nama: string } | null;
}

const STATUS: Record<string, { kode: KodeStatus; label: string }> = {
  diajukan: { kode: 'warn', label: 'Menunggu' }, diproses: { kode: 'info', label: 'Diproses' },
  dipenuhi: { kode: 'good', label: 'Dipenuhi' }, ditolak: { kode: 'crit', label: 'Ditolak' },
};

const tambahHari = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default async function Dukungan({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const sb = await supabase();
  const [saya, proyek, unit, orang, { data }] = await Promise.all([
    penggunaSaatIni(), daftarProyek(), daftarUnit(), profilAktif(),
    sb.from('support_requests')
      .select('*,penerima:profiles!support_requests_ditujukan_ke_fkey(nama,jabatan),pengaju:profiles!support_requests_diajukan_oleh_fkey(nama),projects(kode,nama),org_units(kode,nama)')
      .order('tenggat'),
  ]);
  const semua = (data ?? []) as Permintaan[];
  const terbuka = (x: Permintaan) => x.status === 'diajukan' || x.status === 'diproses';
  const untukSaya = semua.filter(x => terbuka(x) && x.ditujukan_ke === saya.id);
  const dariSaya = semua.filter(x => terbuka(x) && x.diajukan_oleh === saya.id);
  const lainnya = semua.filter(x => terbuka(x) && x.ditujukan_ke !== saya.id && x.diajukan_oleh !== saya.id);
  const riwayat = semua.filter(x => !terbuka(x)).sort((a, b) => (b.ditanggapi_at ?? '').localeCompare(a.ditanggapi_at ?? '')).slice(0, 20);
  const proyekAktif = proyek.filter(p => p.status === 'aktif');
  const pilihProyek = typeof sp.proyek === 'string' ? sp.proyek : '';
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const hari = hariIni();
  const telat = semua.filter(x => terbuka(x) && x.tenggat < hari).length;

  return (
    <>
      <section className="section first">
        <SectionHead no="06" eyebrow="Dukungan & keputusan"
          judul={`${semua.filter(terbuka).length} permintaan terbuka${telat ? `, ${telat} lewat tenggat` : ''}`}>
          <p className="muted">Pengganti kolom &quot;Dukungan yang dibutuhkan&quot;. Setiap permintaan punya penerima, tenggat, dan tanggapan tertulis, lalu tampil di dasbor dan charter proyek.</p>
        </SectionHead>
        {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
        {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}

        <div className="grid-1-2">
          <form action={ajukanDukungan} className="card form-pica" id="ajukan">
            <h3>Ajukan permintaan</h3>
            <p className="muted small">Untuk dukungan sumber daya, eskalasi hambatan, atau keputusan pimpinan.</p>
            <fieldset className="polos jenis-pilih">
              <legend className="lbl-form">Jenis</legend>
              <label className="cek"><input type="radio" name="jenis" value="dukungan" defaultChecked /> Dukungan — sumber daya, koordinasi, percepatan</label>
              <label className="cek"><input type="radio" name="jenis" value="keputusan" /> Keputusan pimpinan — tampil di ringkasan Direktur</label>
            </fieldset>
            <label>Proyek terkait
              <select name="project_id" defaultValue={pilihProyek}>
                <option value="">Tidak terkait proyek (isu unit)</option>
                {proyekAktif.map(p => <option key={p.id} value={p.id}>{p.kode} · {p.nama}</option>)}
              </select>
            </label>
            <label>Unit pengaju (bila tidak terkait proyek)
              <select name="org_unit_id" defaultValue="">
                <option value="">Ikuti unit proyek</option>
                {unit.map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
              </select>
            </label>
            <label>Permintaan — apa yang diminta, secara spesifik
              <textarea name="permintaan" rows={3} required minLength={15} placeholder="Mis. Instruksikan seluruh Bagian menyerahkan data energi 1 tahun kepada tim SMEn paling lambat 6 Nov" /></label>
            <label>Dampak bila tidak dipenuhi
              <textarea name="dampak_bila_tidak" rows={2} placeholder="Mis. Audit TUV stage 1 mundur dan sertifikasi melewati Desember" /></label>
            <div className="baris-form">
              <label>Ditujukan kepada
                <select name="ditujukan_ke" required defaultValue="">
                  <option value="" disabled>Pilih pejabat</option>
                  {orang.map(o => <option key={o.id} value={o.id}>{o.nama}{o.jabatan ? ` · ${o.jabatan}` : ''}</option>)}
                </select>
              </label>
              <label>Tenggat<input type="date" name="tenggat" required min={hari} defaultValue={tambahHari(hari, 7)} /></label>
            </div>
            <button className="btn primary"><Send size={15} aria-hidden="true" />Kirim permintaan</button>
          </form>

          <div className="card">
            <h3>Perlu keputusan Anda</h3>
            <p className="muted small">Permintaan yang ditujukan kepada Anda, urut tenggat terdekat</p>
            <div className="decisions">
              {untukSaya.length === 0 && <p className="muted small kosong">Tidak ada permintaan untuk Anda.</p>}
              {untukSaya.map(x => <Kartu key={x.id} x={x} hari={hari} tanggapi />)}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div>
            <SectionHead no="A" eyebrow="Saya ajukan" judul={`${dariSaya.length} menunggu tanggapan`} />
            <div className="decisions">{dariSaya.length ? dariSaya.map(x => <Kartu key={x.id} x={x} hari={hari} />) : <p className="muted small">Belum ada.</p>}</div>
          </div>
          <div>
            <SectionHead no="B" eyebrow="Permintaan lain yang terbuka" judul={`${lainnya.length} permintaan`} />
            <div className="decisions">{lainnya.length ? lainnya.map(x => <Kartu key={x.id} x={x} hari={hari} />) : <p className="muted small">Tidak ada.</p>}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead no="C" eyebrow="Riwayat" judul={`${riwayat.length} permintaan terakhir yang sudah ditanggapi`} />
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Jenis</th><th>Permintaan</th><th>Proyek / unit</th><th>Pengaju → penerima</th><th>Status</th><th>Tanggapan</th></tr></thead>
              <tbody>
                {riwayat.length === 0 && <tr><td colSpan={6} className="kosong">Belum ada riwayat.</td></tr>}
                {riwayat.map(x => (
                  <tr key={x.id}>
                    <td className="small">{x.jenis === 'keputusan' ? 'Keputusan' : 'Dukungan'}</td>
                    <td className="teks">{x.permintaan}</td>
                    <td className="small">{x.projects ? <Link className="tautan" href={`/proyek/${x.project_id}`}>{x.projects.kode}</Link> : x.org_units?.kode}</td>
                    <td className="small">{x.pengaju?.nama ?? '–'} → {x.penerima?.nama ?? '–'}</td>
                    <td><Chip {...STATUS[x.status]} /><div className="upd">{tgl(x.ditanggapi_at?.slice(0, 10))}</div></td>
                    <td className="small teks">{x.tanggapan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function Kartu({ x, hari, tanggapi = false }: { x: Permintaan; hari: string; tanggapi?: boolean }) {
  const lewat = x.tenggat < hari;
  return (
    <div className={`dec ${lewat ? 'late' : ''}`}>
      <div className="bar" />
      <div>
        <div className="eyebrow">{x.jenis === 'keputusan' ? 'Keputusan · ' : ''}{x.projects ? `${x.projects.kode} · ${x.projects.nama}` : `Unit ${x.org_units?.kode ?? ''}`}</div>
        <h4>{x.permintaan}</h4>
        {x.dampak_bila_tidak && <p className="who">Bila tidak dipenuhi: {x.dampak_bila_tidak}</p>}
        <p className="who">{x.pengaju?.nama ?? '–'} → {x.penerima?.nama ?? '–'}{x.penerima?.jabatan ? ` (${x.penerima.jabatan})` : ''} · <Chip {...STATUS[x.status]} /></p>
        {tanggapi && (
          <details className="tanggapan">
            <summary>Tanggapi</summary>
            <form action={tanggapiDukungan}>
              <input type="hidden" name="id" value={x.id} />
              <textarea name="tanggapan" rows={2} placeholder="Keputusan atau tanggapan (wajib bila dipenuhi/ditolak)" aria-label="Tanggapan" defaultValue={x.tanggapan ?? ''} />
              <div className="acts">
                <button className="btn" name="status" value="diproses">Sedang diproses</button>
                <button className="btn" name="status" value="ditolak">Tolak</button>
                <button className="btn primary" name="status" value="dipenuhi">Penuhi</button>
              </div>
            </form>
          </details>
        )}
      </div>
      <div className="due">{lewat ? 'Lewat tenggat' : 'Tenggat'}<b>{tgl(x.tenggat, false)}</b></div>
    </div>
  );
}
