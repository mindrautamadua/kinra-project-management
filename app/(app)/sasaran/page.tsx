import Link from 'next/link';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import { daftarSasaran } from '@/lib/data';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import type { Sasaran } from '@/lib/types';
import { tambahSasaran, ubahAktifSasaran, ubahSasaran } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;
type Proyek = { id: string; kode: string };

// Master sasaran strategis (RJPP 2026-2030): dipilih per proyek di form charter.
export default async function MasterSasaran({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const sb = await supabase();
  const [saya, sasaran, { data: relasi }] = await Promise.all([
    penggunaSaatIni(), daftarSasaran(true),
    sb.from('project_objectives').select('objective_id,projects(id,kode,status)'),
  ]);
  const kelola = saya.peran.some(r => r.role === 'admin');
  const proyek = new Map<string, Proyek[]>();
  for (const r of (relasi ?? []) as unknown as { objective_id: string; projects: (Proyek & { status: string }) | null }[]) {
    if (r.projects && r.projects.status !== 'dibatalkan') proyek.set(r.objective_id, [...(proyek.get(r.objective_id) ?? []), r.projects]);
  }
  const pilar = [...new Set(sasaran.map(x => x.pilar ?? 'Lainnya'))];
  const aktif = sasaran.filter(x => x.aktif);
  const tanpaProyek = aktif.filter(x => !proyek.has(x.id)).length;
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;

  return (
    <section className="section first">
      <SectionHead no="RJPP" eyebrow="Master data" judul={`${aktif.length} sasaran strategis RJPP 2026–2030`}>
        <p className="muted">Tiga pilar strategis dan fondasi pendukung (enablers) dari Rencana Jangka Panjang Perusahaan. Setiap proyek memilih sasaran yang didukungnya di form Ubah charter. {tanpaProyek} sasaran belum didukung proyek mana pun.</p>
      </SectionHead>
      {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
      {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
      {!kelola && <div className="pesan">Anda hanya dapat melihat. Master sasaran strategis dikelola Admin.</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Sasaran strategis</th><th>Proyek pendukung</th>{kelola && <th />}</tr></thead>
            {pilar.map(g => (
              <tbody key={g}>
                <tr className="grup-baris"><th colSpan={kelola ? 4 : 3}>{g}</th></tr>
                {sasaran.filter(x => (x.pilar ?? 'Lainnya') === g).map(x => (
                  <Baris key={x.id} x={x} kelola={kelola} proyek={proyek.get(x.id) ?? []} />
                ))}
              </tbody>
            ))}
            {sasaran.length === 0 && <tbody><tr><td colSpan={4} className="kosong">Belum ada sasaran strategis. Jalankan migrasi sasaran strategis RJPP.</td></tr></tbody>}
          </table>
        </div>
        <p className="muted small">Sumber: RJPP PT KINRA 2026–2030, Bab III Strategi Utama dan Sasaran Perusahaan. Sasaran nonaktif tidak muncul di pilihan, tetapi tetap tercatat di proyek lamanya.</p>
      </div>

      {kelola && (
        <form action={tambahSasaran} className="card form-pica" id="tambah">
          <h3>Tambah sasaran</h3>
          <Isian />
          <button className="btn primary">Tambah sasaran</button>
        </form>
      )}
    </section>
  );
}

function Baris({ x, kelola, proyek }: { x: Sasaran; kelola: boolean; proyek: Proyek[] }) {
  return (
    <tr id={`sasaran-${x.id}`} className={x.aktif ? undefined : 'muted'}>
      <td className="mono small">{x.kode}</td>
      <td>
        {x.nama}{!x.aktif && <span className="flag"> · nonaktif</span>}
        {x.uraian && <div className="upd">{x.uraian}</div>}
        {kelola && (
          <details className="mini-form">
            <summary className="btn-mini">Ubah</summary>
            <form action={ubahSasaran} className="form-pica mini-form">
              <input type="hidden" name="id" value={x.id} />
              <Isian x={x} />
              <button className="btn">Simpan</button>
            </form>
          </details>
        )}
      </td>
      <td className="mono small">
        {proyek.length ? proyek.sort((a, b) => a.kode.localeCompare(b.kode, 'id', { numeric: true }))
          .map((p, i) => <span key={p.id}>{i > 0 && ', '}<Link href={`/proyek/${p.id}`}>{p.kode}</Link></span>) : '–'}
      </td>
      {kelola && (
        <td>
          <form action={ubahAktifSasaran}>
            <input type="hidden" name="id" value={x.id} /><input type="hidden" name="aktif" value={String(!x.aktif)} />
            <button className="btn-mini">{x.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </form>
        </td>
      )}
    </tr>
  );
}

function Isian({ x }: { x?: Sasaran }) {
  return (
    <>
      <div className="baris-form">
        <label>Kode<input name="kode" required defaultValue={x?.kode ?? ''} placeholder="Mis. P2.3" /></label>
        <label>Urutan tampil<input name="urutan" type="number" defaultValue={x?.urutan ?? ''} /></label>
      </div>
      <label>Nama sasaran<input name="nama" required defaultValue={x?.nama ?? ''} /></label>
      <label>Pilar<input name="pilar" defaultValue={x?.pilar ?? ''} placeholder="Mis. Pilar 2 · Stability and Growth" /></label>
      <label>Uraian<textarea name="uraian" rows={2} defaultValue={x?.uraian ?? ''} /></label>
    </>
  );
}
