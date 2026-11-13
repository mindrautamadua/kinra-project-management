import { CircleCheck, TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import { daftarUnit } from '@/lib/data';
import { DAFTAR_PERAN, PERAN } from '@/lib/peran';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import type { Peran } from '@/lib/types';
import { hapusPeran, tambahPeran, ubahAktif, ubahProfil } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;
type Unit = { id: string; kode: string; nama: string };
type Profil = { id: string; nama: string; email: string | null; jabatan: string | null; org_unit_id: string | null; aktif: boolean; created_at: string };
type Baris = { id: string; user_id: string; role: Peran; org_unit_id: string | null };

// Kelola akun pengguna aplikasi: aktivasi, profil, dan peran. Hanya Admin.
// Akun login dibuat di Supabase Studio (Authentication > Add user); profilnya otomatis muncul di sini berstatus nonaktif.
export default async function KelolaPengguna({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const saya = await penggunaSaatIni();
  const admin = saya.peran.some(r => r.role === 'admin');
  if (!admin) {
    return (
      <section className="section first">
        <SectionHead no="AKUN" eyebrow="Pengguna dan peran" judul="Hanya untuk Admin" />
        <div className="pesan">Halaman ini hanya dapat dibuka Admin aplikasi.</div>
      </section>
    );
  }

  const sb = await supabase();
  const [unit, { data: profil }, { data: peran }] = await Promise.all([
    daftarUnit(),
    sb.from('profiles').select('id,nama,email,jabatan,org_unit_id,aktif,created_at').order('nama'),
    sb.from('user_roles').select('id,user_id,role,org_unit_id'),
  ]);
  const semua = (profil ?? []) as Profil[];
  const daftarPeran = (peran ?? []) as Baris[];
  const tanpaPeran = semua.filter(p => p.aktif && !daftarPeran.some(r => r.user_id === p.id));
  const menunggu = semua.filter(p => !p.aktif);
  const urut = [...menunggu, ...semua.filter(p => p.aktif)];
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;

  return (
    <section className="section first">
      <SectionHead no="AKUN" eyebrow="Pengguna dan peran" judul={`${semua.length - menunggu.length} akun aktif · ${menunggu.length} menunggu aktivasi`}>
        <p className="muted">Akun login dibuat di Supabase Studio (Authentication &gt; Add user) dan otomatis muncul di sini berstatus nonaktif. Aktifkan, lalu beri peran. Peran yang berlaku pada unit juga berlaku untuk unit turunannya.</p>
      </SectionHead>
      {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
      {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
      {tanpaPeran.length > 0 && <div className="pesan">Akun aktif tanpa peran: {tanpaPeran.map(p => p.nama).join(', ')}. Mereka hanya dapat melihat data.</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Pengguna</th><th>Unit</th><th>Peran</th><th>Status</th></tr></thead>
            <tbody>
              {urut.length === 0 && <tr><td colSpan={4} className="kosong">Belum ada akun.</td></tr>}
              {urut.map(p => (
                <BarisPengguna key={p.id} p={p} unit={unit} peran={daftarPeran.filter(r => r.user_id === p.id)} diriSendiri={p.id === saya.id} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt">
        <h3>Keterangan peran</h3>
        <dl className="small">
          {DAFTAR_PERAN.map(r => <div key={r}><dt><b>{PERAN[r].label}</b>{PERAN[r].perluUnit ? ' · per unit' : ' · seluruh perusahaan'}</dt><dd className="muted">{PERAN[r].ket}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

function BarisPengguna({ p, unit, peran, diriSendiri }: { p: Profil; unit: Unit[]; peran: Baris[]; diriSendiri: boolean }) {
  const kodeUnit = (id: string | null) => unit.find(u => u.id === id)?.kode;
  return (
    <tr id={`u-${p.id}`} className={p.aktif ? undefined : 'muted'}>
      <td>
        {p.nama}{diriSendiri && <span className="muted small"> · Anda</span>}
        <div className="upd">{[p.jabatan, p.email].filter(Boolean).join(' · ') || '–'}</div>
        <details className="mini-form">
          <summary className="btn-mini">Ubah profil</summary>
          <form action={ubahProfil} className="form-pica mini-form">
            <input type="hidden" name="id" value={p.id} />
            <label>Nama<input name="nama" required defaultValue={p.nama} /></label>
            <label>Jabatan<input name="jabatan" defaultValue={p.jabatan ?? ''} /></label>
            <label>Unit
              <select name="org_unit_id" defaultValue={p.org_unit_id ?? ''}>
                <option value="">–</option>
                {unit.map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
              </select>
            </label>
            <button className="btn">Simpan</button>
          </form>
        </details>
      </td>
      <td className="mono small">{kodeUnit(p.org_unit_id) ?? '–'}</td>
      <td>
        {peran.length === 0 && <span className="muted small">Belum ada peran</span>}
        <ul className="daftar-peran">
          {peran.map(r => (
            <li key={r.id}>
              <span className="chip chip-info">{PERAN[r.role]?.label ?? r.role}{r.org_unit_id ? ` · ${kodeUnit(r.org_unit_id) ?? 'unit'}` : ''}</span>
              {!(diriSendiri && r.role === 'admin') && (
                <form action={hapusPeran} className="inline">
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="user_id" value={p.id} />
                  <button className="btn-mini" aria-label={`Cabut peran ${PERAN[r.role]?.label ?? r.role}`}>Cabut</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <details className="mini-form">
          <summary className="btn-mini">+ Peran</summary>
          <form action={tambahPeran} className="form-pica mini-form">
            <input type="hidden" name="user_id" value={p.id} />
            <label>Peran
              <select name="role" required defaultValue="">
                <option value="" disabled>Pilih peran</option>
                {DAFTAR_PERAN.map(r => <option key={r} value={r}>{PERAN[r].label}</option>)}
              </select>
            </label>
            <label>Unit (wajib untuk Kabag, Kasubag, PIC, Operator, Anggota)
              <select name="org_unit_id" defaultValue={p.org_unit_id ?? ''}>
                <option value="">Seluruh perusahaan</option>
                {unit.map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
              </select>
            </label>
            <button className="btn">Tambah peran</button>
          </form>
        </details>
      </td>
      <td>
        <span className={`chip chip-${p.aktif ? 'good' : 'warn'}`}>{p.aktif ? 'Aktif' : 'Menunggu aktivasi'}</span>
        {!(diriSendiri && p.aktif) && (
          <form action={ubahAktif}>
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="aktif" value={String(!p.aktif)} />
            <button className="btn-mini">{p.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </form>
        )}
      </td>
    </tr>
  );
}
