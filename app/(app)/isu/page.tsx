import Link from 'next/link';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { Chip, SectionHead } from '@/components/Chip';
import { daftarUnit, profilAktif } from '@/lib/data';
import { hariIni, tgl, type KodeStatus } from '@/lib/format';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import { tambahAksi, tambahIsu, ubahIsu, ubahStatusIsu } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;

interface Isu {
  id: string; project_id: string | null; judul: string; dampak: string | null; akar_masalah: string | null;
  keparahan: string; status: string; owner_id: string; org_unit_id: string; created_at: string; ditutup_at: string | null;
  org_units: { kode: string; nama: string } | null; projects: { kode: string; nama: string } | null;
  actions: { id: string; deskripsi: string; owner_id: string; tanggal_target: string; status: string }[];
}

const KEPARAHAN: Record<string, KodeStatus> = { kritis: 'crit', tinggi: 'serious', sedang: 'warn', rendah: 'na' };
const URUT = ['kritis', 'tinggi', 'sedang', 'rendah'];
const tambahHari = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default async function HalamanIsu({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const sb = await supabase();
  const [saya, unit, orang, { data }] = await Promise.all([
    penggunaSaatIni(), daftarUnit(), profilAktif(),
    sb.from('issues').select('*,org_units(kode,nama),projects(kode,nama),actions(id,deskripsi,owner_id,tanggal_target,status)').order('created_at', { ascending: false }),
  ]);
  const semua = (data ?? []) as Isu[];
  const urut = (a: Isu, b: Isu) => URUT.indexOf(a.keparahan) - URUT.indexOf(b.keparahan);
  const unitTerbuka = semua.filter(i => !i.project_id && i.status === 'terbuka').sort(urut);
  const proyekTerbuka = semua.filter(i => i.project_id && i.status === 'terbuka').sort(urut);
  const ditutup = semua.filter(i => i.status === 'ditutup').slice(0, 15);
  const nama = new Map(orang.map(o => [o.id, o.nama]));
  const hari = hariIni();
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const opsiOrang = orang.map(o => <option key={o.id} value={o.id}>{o.nama}{o.jabatan ? ` · ${o.jabatan}` : ''}</option>);
  const aksiTelat = semua.filter(i => i.status === 'terbuka').flatMap(i => i.actions).filter(a => a.status !== 'selesai' && a.status !== 'dibatalkan' && a.tanggal_target < hari).length;
  const unitSaya = saya.peran.find(r => r.org_unit_id)?.org_unit_id ?? '';

  return (
    <>
      <section className="section first">
        <SectionHead no="08" eyebrow="Isu & PICA"
          judul={`${unitTerbuka.length} isu unit dan ${proyekTerbuka.length} masalah proyek terbuka${aksiTelat ? `, ${aksiTelat} aksi lewat target` : ''}`}>
          <p className="muted">Isu unit menggantikan tabel &quot;Current Issue&quot; di slide mingguan dan tampil di ringkasan Direktur (bagian 6). Masalah per proyek dicatat di formulir update mingguan proyek tersebut.</p>
        </SectionHead>
        {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
        {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}

        <div className="grid-1-2">
          <form action={tambahIsu} className="card form-pica" id="tambah">
            <h3>Catat isu unit baru</h3>
            <label>Unit
              <select name="org_unit_id" required defaultValue={unitSaya}>
                <option value="" disabled>Pilih unit</option>
                {unit.map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
              </select>
            </label>
            <label>Isu (problem identification)<textarea name="judul" rows={2} required minLength={10} placeholder="Mis. Draft RKAP TI 2027 belum tersedia" /></label>
            <label>Dampak<textarea name="dampak" rows={2} placeholder="Akibatnya bagi perusahaan bila tidak ditangani" /></label>
            <label>Akar masalah<input name="akar_masalah" /></label>
            <div className="baris-form">
              <label>Keparahan
                <select name="keparahan" defaultValue="sedang"><option value="rendah">Rendah</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="kritis">Kritis</option></select>
              </label>
              <label>Pemilik isu<select name="owner_id" required defaultValue={saya.id}>{opsiOrang}</select></label>
            </div>
            <label>Aksi korektif pertama (opsional)<input name="aksi" placeholder="Kalimat kerja yang spesifik" /></label>
            <div className="baris-form">
              <label>Penanggung jawab aksi<select name="aksi_owner_id" defaultValue={saya.id}>{opsiOrang}</select></label>
              <label>Tanggal target<input type="date" name="tanggal_target" defaultValue={tambahHari(hari, 14)} /></label>
            </div>
            <button className="btn primary">Catat isu</button>
          </form>

          <div>
            <h3 className="sub-judul">Isu unit terbuka</h3>
            <div className="stack-list">
              {unitTerbuka.length === 0 && <p className="muted small card">Tidak ada isu unit yang terbuka.</p>}
              {unitTerbuka.map(i => <KartuIsu key={i.id} i={i} nama={nama} hari={hari} opsiOrang={opsiOrang} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead no="A" eyebrow="Masalah proyek terbuka" judul={`${proyekTerbuka.length} masalah`}>
          <p className="muted">Dikelola di formulir update mingguan setiap proyek.</p>
        </SectionHead>
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Proyek</th><th>Masalah</th><th>Keparahan</th><th>Aksi korektif</th><th /></tr></thead>
              <tbody>
                {proyekTerbuka.length === 0 && <tr><td colSpan={5} className="kosong">Tidak ada masalah proyek terbuka.</td></tr>}
                {proyekTerbuka.map(i => (
                  <tr key={i.id}>
                    <td className="kode">{i.projects?.kode}</td>
                    <td>{i.judul}{i.dampak && <div className="upd">Dampak: {i.dampak}</div>}</td>
                    <td><Chip kode={KEPARAHAN[i.keparahan]} label={i.keparahan} /></td>
                    <td className="small">{i.actions.filter(a => a.status !== 'dibatalkan').map(a => (
                      <div key={a.id}>{a.deskripsi} <span className="muted">({nama.get(a.owner_id) ?? '–'}, {tgl(a.tanggal_target, false)}{a.status === 'selesai' ? ', selesai' : ''})</span>
                        {a.status !== 'selesai' && a.tanggal_target < hari && <span className="flag"> lewat</span>}</div>
                    ))}{i.actions.length === 0 && <span className="flag">Belum ada aksi</span>}</td>
                    <td><Link className="btn-mini" href={`/update/${i.project_id}`}>Kelola</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {ditutup.length > 0 && (
        <section className="section">
          <SectionHead no="B" eyebrow="Ditutup" judul={`${ditutup.length} isu terakhir yang ditutup`} />
          <div className="card">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Unit / proyek</th><th>Isu</th><th>Ditutup</th><th /></tr></thead>
                <tbody>
                  {ditutup.map(i => (
                    <tr key={i.id} id={`isu-${i.id}`}>
                      <td className="kode">{i.projects?.kode ?? i.org_units?.kode}</td>
                      <td>{i.judul}</td>
                      <td className="mono small">{tgl(i.ditutup_at?.slice(0, 10))}</td>
                      <td>{!i.project_id && (
                        <form action={ubahStatusIsu}><input type="hidden" name="issue_id" value={i.id} /><input type="hidden" name="status" value="terbuka" /><button className="btn-mini">Buka kembali</button></form>
                      )}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function KartuIsu({ i, nama, hari, opsiOrang }: { i: Isu; nama: Map<string, string>; hari: string; opsiOrang: React.ReactNode }) {
  return (
    <div className="pica card-isu" id={`isu-${i.id}`}>
      <div className="row">
        <div><span className="mono muted">{i.org_units?.kode}</span> <b>{i.judul}</b></div>
        <Chip kode={KEPARAHAN[i.keparahan]} label={i.keparahan} />
      </div>
      {i.dampak && <p className="muted small">Dampak: {i.dampak}</p>}
      <p className="muted small">Pemilik: {nama.get(i.owner_id) ?? '–'} · dicatat {tgl(i.created_at.slice(0, 10))}</p>
      <ul>
        {i.actions.filter(a => a.status !== 'dibatalkan').map(a => (
          <li key={a.id}>
            {a.deskripsi} <span className="muted small">· {nama.get(a.owner_id) ?? '–'} · {tgl(a.tanggal_target, false)} · {a.status}</span>
            {a.status !== 'selesai' && a.tanggal_target < hari && <span className="flag"> lewat target</span>}
            {a.status !== 'selesai' && (
              <form action={ubahStatusIsu} className="inline"><input type="hidden" name="issue_id" value={i.id} /><input type="hidden" name="action_id" value={a.id} /><input type="hidden" name="status" value="selesai" /><button className="btn-mini">Selesai</button></form>
            )}
          </li>
        ))}
        {i.actions.length === 0 && <li className="flag">Belum ada aksi korektif</li>}
      </ul>
      <div className="aksi-isu">
        <details>
          <summary className="btn-mini">+ Aksi</summary>
          <form action={tambahAksi} className="form-pica mini-form">
            <input type="hidden" name="issue_id" value={i.id} />
            <input name="aksi" required placeholder="Aksi korektif" aria-label="Aksi korektif" />
            <div className="baris-form">
              <select name="owner_id" required aria-label="Penanggung jawab">{opsiOrang}</select>
              <input type="date" name="tanggal_target" required aria-label="Tanggal target" />
            </div>
            <button className="btn">Tambah aksi</button>
          </form>
        </details>
        <details>
          <summary className="btn-mini">Ubah</summary>
          <form action={ubahIsu} className="form-pica mini-form">
            <input type="hidden" name="id" value={i.id} />
            <label>Isu<textarea name="judul" rows={2} required defaultValue={i.judul} /></label>
            <label>Dampak<textarea name="dampak" rows={2} defaultValue={i.dampak ?? ''} /></label>
            <label>Akar masalah<input name="akar_masalah" defaultValue={i.akar_masalah ?? ''} /></label>
            <div className="baris-form">
              <label>Keparahan<select name="keparahan" defaultValue={i.keparahan}><option value="rendah">Rendah</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="kritis">Kritis</option></select></label>
              <label>Pemilik<select name="owner_id" defaultValue={i.owner_id}>{opsiOrang}</select></label>
            </div>
            <button className="btn">Simpan</button>
          </form>
        </details>
        <form action={ubahStatusIsu} className="inline"><input type="hidden" name="issue_id" value={i.id} /><input type="hidden" name="status" value="ditutup" /><button className="btn-mini">Tutup isu</button></form>
      </div>
    </div>
  );
}
