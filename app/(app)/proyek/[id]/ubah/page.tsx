import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import FieldsCharter from '@/components/FieldsCharter';
import PorsiBobot from '@/components/client/PorsiBobot';
import { kelengkapan } from '@/lib/charter';
import { daftarPic, daftarSasaran, daftarUnit, detailProyek } from '@/lib/data';
import { angka, STATUS_PROYEK, tgl } from '@/lib/format';
import { bolehReview, penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import { hapusProyek, perbaruiBaseline, simpanAktivitas, simpanIdentitas, ubahStatus } from '../../actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;
const BARIS_BARU = 3;

export default async function UbahCharter({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await supabase();
  const [saya, d, unit, pics, semuaPic, sasaran, { data: boleh }] = await Promise.all([
    penggunaSaatIni(), detailProyek(id), daftarUnit(), daftarPic(), daftarPic(true), daftarSasaran(), sb.rpc('fn_boleh_ubah_proyek', { p_project: id }),
  ]);
  if (!d) notFound();
  const p = d.proyek;
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const draf = p.status === 'draf';
  const terkunci = ['selesai', 'dibatalkan'].includes(p.status);
  // Proyek Selesai/Dibatalkan tetap boleh diubah; hanya tambah aktivitas dan baseline yang dikunci (lihat trigger activities_aturan).
  const bisa = !!boleh;
  const pemutus = saya.peran.some(r => r.role === 'admin' || r.role === 'kabag');
  // Database (fn_hapus_proyek) tetap memeriksa cakupan unit; ini hanya menentukan apakah kartu ditampilkan.
  const bolehHapus = draf ? !!boleh && bolehReview(saya) : saya.peran.some(r => r.role === 'admin');
  const aktivitas = d.aktivitas.filter(a => a.status !== 'dibatalkan');
  const berubah = !draf && aktivitas.some(a => {
    const b = d.baseline[a.id];
    return !b || b.rencana_mulai !== a.rencana_mulai || b.rencana_selesai !== a.rencana_selesai || b.bobot !== a.bobot;
  });
  const lengkap = kelengkapan(d);
  // PIC aktivitas dari master PIC: yang aktif, ditambah PIC nonaktif yang masih tercatat di aktivitas.
  const dipakai = new Set(d.aktivitas.map(a => a.pic_id));
  const opsiOrang = semuaPic.filter(x => x.aktif || dipakai.has(x.id))
    .map(x => <option key={x.id} value={x.id}>{x.nama}{x.aktif ? '' : ' (nonaktif)'}</option>);
  const totalBobot = aktivitas.reduce((s, a) => s + a.bobot, 0);
  const urutanBerikut = Math.max(0, ...aktivitas.map(a => a.urutan)) + 1;

  return (
    <>
      <section className="section first" id="atas">
        <div className="crumb-back"><Link href={`/proyek/${id}`}>← Detail proyek</Link> · <Link href={`/proyek/${id}/charter`}>Lihat charter</Link></div>
        <SectionHead no={p.kode} eyebrow={`Ubah charter · ${STATUS_PROYEK[p.status]} · kelengkapan ${lengkap.terisi}/${lengkap.total}`} judul={p.nama} />
        <div id="pesan">
          {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
          {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
          {!boleh && <div className="pesan">Anda hanya dapat melihat. Perubahan dilakukan PIC atau Kasubag/Kabag unit ini.</div>}
          {terkunci && <div className="pesan">Proyek {STATUS_PROYEK[p.status]}: charter dan aktivitas yang ada tetap dapat diubah, tetapi aktivitas baru dan baseline tidak.</div>}
        </div>
      </section>

      <section className="section">
        <SectionHead no="1" eyebrow="Identitas charter" judul="Tujuan, lingkup, dan penanggung jawab" />
        <form action={simpanIdentitas} className="card form-pica form-lebar">
          <fieldset disabled={!bisa} className="polos form-pica">
            <input type="hidden" name="id" value={id} />
            <label className="setengah">Unit pelaksana
              <select name="org_unit_id" defaultValue={p.org_unit_id}>
                {unit.filter(u => u.level === 'sub_bidang' || u.level === 'bidang').map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
              </select>
              <small className="muted">Mengganti unit memberi kode proyek baru sesuai unit tujuan (kode saat ini {p.kode}).</small>
            </label>
            <FieldsCharter p={p} pics={pics} terpilih={d.pics} saya={saya.id} sasaran={sasaran} sasaranTerpilih={d.sasaran} />
            {!draf && <p className="muted small">Mengubah target selesai di sini belum menggeser baseline. Perbarui baseline di bagian Aktivitas atau Status dan baseline.</p>}
            <button className="btn primary">Simpan identitas</button>
          </fieldset>
        </form>
      </section>

      <section className="section">
        <SectionHead no="2" eyebrow="Aktivitas" judul={`${aktivitas.length} aktivitas`}>
          <p className="muted">Bobot adalah angka pembanding tanpa satuan: 1 = sama berat, 2 = dua kali lebih berat. Boleh juga diisi persen atau hari kerja. Kolom Porsi menunjukkan kontribusi tiap aktivitas terhadap 100% progres proyek. {draf ? 'Centang Hapus untuk menghapus.' : 'Centang Batalkan untuk mengeluarkan aktivitas; tercatat di audit log.'}</p>
        </SectionHead>
        <form action={simpanAktivitas} className="card">
          <fieldset disabled={!bisa} className="polos">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status_proyek" value={p.status} />
            <input type="hidden" name="ids" value={aktivitas.map(a => a.id).join(',')} />
            <div className="table-wrap">
              <table className="tbl tbl-form tbl-aktivitas">
                <thead><tr><th>#</th><th>Aktivitas</th><th title="Angka pembanding tanpa satuan">Bobot</th><th className="num" title="Bobot ÷ total bobot">Porsi</th><th>Rencana mulai</th><th>Rencana selesai</th><th>PIC</th><th title="Tonjolkan di ringkasan Direktur">Milestone</th><th>{draf ? 'Hapus' : 'Batalkan'}</th></tr></thead>
                <tbody>
                  {aktivitas.map(a => {
                    const b = d.baseline[a.id];
                    const beda = !draf && (!b || b.rencana_mulai !== a.rencana_mulai || b.rencana_selesai !== a.rencana_selesai || b.bobot !== a.bobot);
                    return (
                      <tr key={a.id} data-baris>
                        <td><input name={`urutan_${a.id}`} type="number" min={1} defaultValue={a.urutan} aria-label="Urutan" className="in-urut" /></td>
                        <td><input name={`nama_${a.id}`} defaultValue={a.nama} aria-label="Nama aktivitas" />
                          <input name={`deliverable_${a.id}`} defaultValue={a.deliverable ?? ''} placeholder="Deliverable (opsional)" aria-label="Deliverable aktivitas" className="in-deliv" />
                          {beda && <div className="upd flag">{b ? `Baseline: ${tgl(b.rencana_mulai, false)} – ${tgl(b.rencana_selesai, false)}, bobot ${b.bobot}` : 'Belum masuk baseline'}</div>}</td>
                        <td><input name={`bobot_${a.id}`} inputMode="decimal" defaultValue={a.bobot} aria-label="Bobot" className="in-bobot" data-bobot /></td>
                        <td className="num porsi" data-porsi>{totalBobot ? `${angka((100 * a.bobot) / totalBobot, 1)}%` : '–'}</td>
                        <td><input type="date" name={`mulai_${a.id}`} defaultValue={a.rencana_mulai ?? ''} aria-label="Rencana mulai" /></td>
                        <td><input type="date" name={`selesai_${a.id}`} defaultValue={a.rencana_selesai ?? ''} aria-label="Rencana selesai" /></td>
                        <td><select name={`pic_${a.id}`} defaultValue={a.pic_id ?? ''} aria-label="PIC aktivitas"><option value="">PIC proyek</option>{opsiOrang}</select></td>
                        <td className="tengah"><input type="checkbox" name={`milestone_${a.id}`} defaultChecked={a.milestone} aria-label="Milestone" className="cek-ms" /></td>
                        <td className="tengah"><input type="checkbox" data-hapus name={`hapus_${a.id}`} aria-label={draf ? 'Hapus aktivitas' : 'Batalkan aktivitas'} /></td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: terkunci ? 0 : BARIS_BARU }, (_, i) => (
                    <tr key={`baru-${i}`} className="baris-baru" data-baris>
                      <td><input name={`baru_urutan_${i}`} type="number" min={1} defaultValue={urutanBerikut + i} aria-label="Urutan" className="in-urut" /></td>
                      <td><input name={`baru_nama_${i}`} data-nama placeholder="Aktivitas baru" aria-label="Nama aktivitas baru" />
                        <input name={`baru_deliverable_${i}`} placeholder="Deliverable (opsional)" aria-label="Deliverable aktivitas baru" className="in-deliv" /></td>
                      <td><input name={`baru_bobot_${i}`} inputMode="decimal" defaultValue="1" aria-label="Bobot" className="in-bobot" data-bobot /></td>
                      <td className="num porsi" data-porsi>–</td>
                      <td><input type="date" name={`baru_mulai_${i}`} aria-label="Rencana mulai" /></td>
                      <td><input type="date" name={`baru_selesai_${i}`} aria-label="Rencana selesai" /></td>
                      <td><select name={`baru_pic_${i}`} defaultValue="" aria-label="PIC aktivitas"><option value="">PIC proyek</option>{opsiOrang}</select></td>
                      <td className="tengah"><input type="checkbox" name={`baru_milestone_${i}`} aria-label="Milestone" className="cek-ms" /></td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!draf && !terkunci && (
              <div className="opsi-baseline">
                <label className="cek"><input type="checkbox" name="jadikan_baseline" /> Jadikan rencana ini baseline baru (v{(d.ringkas?.versi_baseline ?? 0) + 1})</label>
                <input name="alasan_baseline" placeholder="Alasan perubahan baseline (wajib bila dicentang, min. 10 karakter)" aria-label="Alasan perubahan baseline" />
                <p className="muted small">Tanpa centang, perubahan tanggal dan bobot hanya menjadi rencana kerja; status tetap dihitung terhadap baseline v{d.ringkas?.versi_baseline}.</p>
              </div>
            )}
            <div className="aksi-form"><span className="muted small">Total porsi: <PorsiBobot /></span><button className="btn primary">Simpan aktivitas</button></div>
          </fieldset>
        </form>
      </section>

      <section className="section">
        <SectionHead no="3" eyebrow="Status dan baseline" judul={draf ? 'Aktifkan proyek' : 'Baseline dan status proyek'} />
        <div className="grid-2">
          {draf && boleh && (
            <form action={ubahStatus} className="card form-pica">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="aktif" />
              <h3>Aktifkan dan kunci baseline v1</h3>
              <p className="muted small">Syarat: tanggal mulai dan selesai proyek terisi, ada minimal satu aktivitas, dan semua aktivitas bertanggal. Hanya Kasubag, Kabag, atau Admin yang dapat mengaktifkan.</p>
              <button className="btn primary">Aktifkan proyek</button>
            </form>
          )}
          {!draf && !terkunci && boleh && berubah && (
            <form action={perbaruiBaseline} className="card form-pica">
              <input type="hidden" name="id" value={id} />
              <h3>Perbarui baseline</h3>
              <p className="muted small">Rencana kerja tersimpan berbeda dari baseline v{d.ringkas?.versi_baseline}. Jadikan baseline v{(d.ringkas?.versi_baseline ?? 0) + 1}; langsung berlaku, versi lama tetap tersimpan dan perubahan tampil di dasbor.</p>
              <label>Alasan (minimal 10 karakter)<textarea name="alasan" rows={2} required minLength={10} /></label>
              <button className="btn primary">Tetapkan baseline baru</button>
            </form>
          )}
          {!draf && !terkunci && pemutus && (
            <form action={ubahStatus} className="card form-pica">
              <input type="hidden" name="id" value={id} />
              <h3>Ubah status proyek</h3>
              <p className="muted small">Menutup sebagai Selesai hanya bisa bila semua aktivitas selesai atau dibatalkan.</p>
              <label>Status baru
                <select name="status" defaultValue="selesai">
                  <option value="selesai">Selesai</option>
                  <option value="ditunda">Ditunda</option>
                  <option value="dibatalkan">Dibatalkan</option>
                  {p.status === 'ditunda' && <option value="aktif">Aktif kembali</option>}
                </select>
              </label>
              <button className="btn">Ubah status</button>
            </form>
          )}
          {bolehHapus && (
            <form action={hapusProyek} className="card form-pica kartu-bahaya">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="kode" value={p.kode} />
              <h3>Hapus proyek</h3>
              <p className="muted small">
                {draf
                  ? 'Menghapus proyek Draf beserta aktivitasnya.'
                  : `Proyek ${STATUS_PROYEK[p.status]}: ikut menghapus ${d.riwayat.length} update mingguan, ${d.masalah.length} masalah/PICA, dan seluruh baseline. Bila proyek hanya tidak dilanjutkan, gunakan status Dibatalkan agar riwayatnya tetap ada.`}
                {' '}Isi yang dihapus tetap tercatat di audit log.
              </p>
              <label>Alasan penghapusan<textarea name="alasan" rows={2} required minLength={10} placeholder="Mis. proyek tercatat ganda dengan B.2.3" /></label>
              <label>Ketik <b className="mono">{p.kode}</b> untuk mengonfirmasi<input name="konfirmasi" required autoComplete="off" /></label>
              <button className="btn btn-bahaya">Hapus proyek {p.kode} permanen</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
