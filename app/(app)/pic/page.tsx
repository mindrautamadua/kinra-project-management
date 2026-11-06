import { CircleCheck, TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import { daftarPic, daftarUnit, profilAktif } from '@/lib/data';
import { bolehReview, penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import type { Pic } from '@/lib/types';
import { tambahPic, ubahAktifPic, ubahPic } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;
type Opsi = { unit: { id: string; kode: string; nama: string }[]; akun: { id: string; nama: string }[] };

// Master PIC: daftar orang yang dapat ditunjuk sebagai PIC proyek. Tidak wajib punya akun aplikasi.
export default async function MasterPic({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const sb = await supabase();
  const [saya, pics, unit, akun, { data: relasi }] = await Promise.all([
    penggunaSaatIni(), daftarPic(true), daftarUnit(), profilAktif(),
    sb.from('project_pics').select('pic_id,projects(kode,status)'),
  ]);
  const kelola = bolehReview(saya);
  const proyek = new Map<string, string[]>();
  for (const r of (relasi ?? []) as unknown as { pic_id: string; projects: { kode: string; status: string } | null }[]) {
    if (r.projects && r.projects.status !== 'dibatalkan') proyek.set(r.pic_id, [...(proyek.get(r.pic_id) ?? []), r.projects.kode]);
  }
  const aktif = pics.filter(x => x.aktif);
  const nonaktif = pics.filter(x => !x.aktif);
  const opsi: Opsi = { unit, akun };
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;

  return (
    <>
      <section className="section first">
        <SectionHead no="PIC" eyebrow="Master data" judul={`${aktif.length} PIC aktif siap ditunjuk ke proyek`}>
          <p className="muted">Satu proyek boleh punya lebih dari satu PIC. PIC yang ditautkan ke akun aplikasi dapat mengisi update dan mengubah proyeknya. Sumber: tabel master PIC.</p>
        </SectionHead>
        {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
        {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
        {!kelola && <div className="pesan">Anda hanya dapat melihat. Master PIC dikelola Admin, Kabag, atau Kasubag.</div>}

        <div className={kelola ? 'grid-1-2' : undefined}>
          {kelola && (
            <form action={tambahPic} className="card form-pica" id="tambah">
              <h3>Tambah PIC</h3>
              <Isian opsi={opsi} />
              <button className="btn primary">Tambah PIC</button>
            </form>
          )}
          <div className="card">
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Nama</th><th>Unit</th><th>Akun aplikasi</th><th>Proyek</th>{kelola && <th />}</tr></thead>
                <tbody>
                  {pics.length === 0 && <tr><td colSpan={5} className="kosong">Belum ada PIC. Tambahkan lewat formulir di samping.</td></tr>}
                  {[...aktif, ...nonaktif].map(x => (
                    <Baris key={x.id} x={x} opsi={opsi} kelola={kelola} proyek={proyek.get(x.id) ?? []} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">{aktif.length} aktif · {nonaktif.length} nonaktif. PIC nonaktif tidak muncul di pilihan, tetapi tetap tercatat di proyek lamanya.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function Baris({ x, opsi, kelola, proyek }: { x: Pic; opsi: Opsi; kelola: boolean; proyek: string[] }) {
  const unit = opsi.unit.find(u => u.id === x.org_unit_id);
  const akun = opsi.akun.find(a => a.id === x.profile_id);
  return (
    <tr id={`pic-${x.id}`} className={x.aktif ? undefined : 'muted'}>
      <td>
        {x.nama}{!x.aktif && <span className="flag"> · nonaktif</span>}
        <div className="upd">{[x.jabatan, x.email].filter(Boolean).join(' · ') || '–'}</div>
        {kelola && (
          <details className="mini-form">
            <summary className="btn-mini">Ubah</summary>
            <form action={ubahPic} className="form-pica mini-form">
              <input type="hidden" name="id" value={x.id} />
              <Isian opsi={opsi} x={x} />
              <button className="btn">Simpan</button>
            </form>
          </details>
        )}
      </td>
      <td className="mono small">{unit?.kode ?? '–'}</td>
      <td className="small">{akun?.nama ?? <span className="muted">Tidak ditautkan</span>}</td>
      <td className="mono small">{proyek.length ? proyek.sort().join(', ') : '–'}</td>
      {kelola && (
        <td>
          <form action={ubahAktifPic}>
            <input type="hidden" name="id" value={x.id} /><input type="hidden" name="aktif" value={String(!x.aktif)} />
            <button className="btn-mini">{x.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </form>
        </td>
      )}
    </tr>
  );
}

function Isian({ opsi, x }: { opsi: Opsi; x?: Pic }) {
  return (
    <>
      <label>Nama lengkap<input name="nama" required defaultValue={x?.nama ?? ''} placeholder="Mis. Budi Santoso" /></label>
      <label>Jabatan<input name="jabatan" defaultValue={x?.jabatan ?? ''} placeholder="Mis. Staf IT Development" /></label>
      <div className="baris-form">
        <label>Unit
          <select name="org_unit_id" defaultValue={x?.org_unit_id ?? ''}>
            <option value="">–</option>
            {opsi.unit.map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
          </select>
        </label>
        <label>Email<input type="email" name="email" defaultValue={x?.email ?? ''} /></label>
      </div>
      <label>Tautkan ke akun aplikasi (opsional)
        <select name="profile_id" defaultValue={x?.profile_id ?? ''}>
          <option value="">Tidak ditautkan</option>
          {opsi.akun.map(a => <option key={a.id} value={a.id}>{a.nama}</option>)}
        </select>
        <small className="muted">Bila ditautkan, orang ini dapat mengisi update dan mengubah proyek yang ia pegang.</small>
      </label>
    </>
  );
}
