import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { ChipKesehatan, ChipUpdate, SectionHead } from '@/components/Chip';
import FotoAktivitas from '@/components/client/FotoAktivitas';
import WajibTanggalSelesai from '@/components/client/WajibTanggalSelesai';
import { detailProyek, periodeBerjalan, profilAktif } from '@/lib/data';
import { hariIni, hitungKesehatan, KESEHATAN, lebihBuruk, persen, pilihanOverride, STATUS_PROYEK, tgl } from '@/lib/format';
import { muatFoto } from '@/lib/foto';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';
import type { Kesehatan, Masalah, UpdateMingguan } from '@/lib/types';
import { ajukan, simpanDraf, tambahAksiPica, tambahPica, ubahMasalah, ubahPica } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;

export default async function FormUpdate({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Cari }) {
  const { projectId } = await params;
  const sp = await searchParams;
  const sb = await supabase();
  const [saya, periode, d, orang, { data: boleh }] = await Promise.all([
    penggunaSaatIni(), periodeBerjalan(), detailProyek(projectId), profilAktif(), sb.rpc('fn_boleh_ubah_proyek', { p_project: projectId }),
  ]);
  if (!d) notFound();
  const { proyek: p } = d;

  const ini = d.riwayat.find(u => u.period_id === periode.id) as UpdateMingguan | undefined;
  const lalu = d.riwayat.find(u => u.period_id !== periode.id);
  const status = ini?.status ?? 'draf';
  // Tanpa review: update yang diajukan sudah final, tetapi tetap dapat diedit sampai periode ditutup.
  const sudahDiajukan = ['diajukan', 'direview'].includes(status);
  const dapatEdit = !!boleh && p.status === 'aktif' && (sudahDiajukan || ['draf', 'dikembalikan'].includes(status));
  // Alasan formulir terkunci, supaya pengguna tahu langkah berikutnya.
  const alasanKunci = !boleh || dapatEdit ? null
    : p.status !== 'aktif' ? `Proyek berstatus ${STATUS_PROYEK[p.status] ?? p.status}; update hanya bisa diisi saat proyek Aktif.`
    : 'Periode laporan ini sudah ditutup sehingga update tidak dapat diubah lagi.';

  const { data: hitung } = await sb.rpc('fn_progres_proyek', { p_project: projectId, p_tanggal: periode.tanggal_akhir }).single<{
    progres_rencana: number | null; progres_aktual: number | null; jml_aktivitas: number; tanggal_selesai_baseline: string | null;
  }>();
  const rencana = hitung?.progres_rencana != null ? Number(hitung.progres_rencana) : null;
  const aktual = hitung?.progres_aktual != null ? Number(hitung.progres_aktual) : null;
  const pratinjau = hitungKesehatan(rencana, aktual, hitung?.tanggal_selesai_baseline ?? null, hitung?.jml_aktivitas ?? 0, periode.tanggal_akhir);
  const akhir: Kesehatan = ini?.status_override ? lebihBuruk(ini.status_override, pratinjau) : pratinjau;
  const butuhPica = ['terlambat', 'kritis'].includes(akhir) && !d.masalah.some(m => m.status === 'terbuka' && m.actions.some(a => a.status !== 'dibatalkan'));
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const foto = await muatFoto(d.aktivitas.map(a => a.id));
  const admin = saya.peran.some(x => x.role === 'admin');
  const opsiOrang = orang.map(o => <option key={o.id} value={o.id}>{o.nama}</option>);

  return (
    <>
      <section className="section first">
        <div className="crumb-back"><Link href="/update">← Update mingguan</Link> · <Link href={`/proyek/${p.id}`}>Detail proyek</Link></div>
        <SectionHead no={p.kode} eyebrow={`Update ${periode.label} · batas ${tgl(periode.batas_input.slice(0, 10))}`} judul={p.nama} />
        <div className="row aksi-atas"><ChipUpdate status={ini?.status ?? null} />
          {sudahDiajukan && ini?.diajukan_at && <span className="small muted">Terverifikasi {tgl(ini.diajukan_at)} · masih dapat diedit sampai periode ditutup</span>}
        </div>
        {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
        {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
        {!boleh && <div className="pesan" role="status">Anda hanya dapat melihat update ini. Pengisian dilakukan PIC atau pengelola unit.</div>}
        {alasanKunci && <div className="pesan" role="status">{alasanKunci}</div>}

        <div className="tiles tiles-4">
          <div className="tile"><div className="lbl">% rencana per {tgl(periode.tanggal_akhir, false)}</div><div className="val tnum">{persen(rencana)}</div><div className="meta">Dari baseline aktif</div></div>
          <div className="tile"><div className="lbl">% aktual</div><div className="val tnum">{persen(aktual)}</div><div className="meta">Dari progres tersimpan</div></div>
          <div className="tile"><div className="lbl">Status bila diverifikasi</div><div className="val val-sm"><ChipKesehatan status={akhir} override={!!ini?.status_override} /></div><div className="meta">Dihitung sistem</div></div>
          <div className="tile"><div className="lbl">PICA</div><div className="val tnum">{d.masalah.filter(m => m.status === 'terbuka').length}</div><div className="meta">{butuhPica ? <span className="flag">Wajib ada sebelum diverifikasi</span> : 'masalah terbuka'}</div></div>
        </div>
      </section>

      <form className="section">
        <input type="hidden" name="project_id" value={p.id} />
        <input type="hidden" name="period_id" value={periode.id} />
        <WajibTanggalSelesai />
        <fieldset disabled={!dapatEdit} className="polos">
          <SectionHead no="1" eyebrow="Progres aktivitas" judul="Perbarui progres setiap aktivitas">
            <p className="muted">Progres hanya 0, 25, 50, 75, atau Selesai. Pilih Selesai dan isi tanggal aktual selesai bila aktivitas tuntas. Foto kegiatan langsung tersimpan saat diunggah dan tercetak di Lampiran laporan.</p>
          </SectionHead>
          <div className="card">
            <div className="table-wrap">
              <table className="tbl tbl-form">
                <thead><tr><th>#</th><th>Aktivitas</th><th>Baseline</th><th>Progres</th><th>Tanggal selesai</th><th>Foto kegiatan</th></tr></thead>
                <tbody>
                  {d.aktivitas.filter(a => a.status !== 'dibatalkan').map(a => {
                    const b = d.baseline[a.id];
                    const telat = a.status !== 'selesai' && (b?.rencana_selesai ?? a.rencana_selesai ?? '9') < periode.tanggal_akhir;
                    return (
                      <tr key={a.id}>
                        <td className="mono">{a.urutan}</td>
                        <td>{a.nama}{telat && <div className="upd flag">Lewat rencana selesai</div>}</td>
                        <td className="mono small">{tgl(b?.rencana_mulai ?? a.rencana_mulai, false)} – {tgl(b?.rencana_selesai ?? a.rencana_selesai, false)}</td>
                        <td>
                          <select name={`prog_${a.id}`} defaultValue={String(a.progres)} aria-label={`Progres ${a.nama}`}>
                            <option value="0">0%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">Selesai</option>
                          </select>
                        </td>
                        <td><input type="date" name={`selesai_${a.id}`} defaultValue={a.aktual_selesai ?? ''} aria-label={`Tanggal aktual selesai ${a.nama}`} /></td>
                        <td><FotoAktivitas projectId={p.id} activityId={a.id} nama={a.nama} hariIni={hariIni()}
                          foto={foto.filter(f => f.activity_id === a.id).map(f => ({ id: f.id, url: f.url, keterangan: f.keterangan, bisaUbah: admin || f.diunggah_oleh === saya.id }))} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid-2 mt">
            <div className="card">
              <label className="lbl-form" htmlFor="sudah">Yang telah dilakukan minggu ini</label>
              <textarea id="sudah" name="sudah_dilakukan" rows={6} defaultValue={ini?.sudah_dilakukan ?? ''} placeholder="Hasil konkret minggu ini, bukan rencana. Minimal 20 karakter." />
              {lalu?.sudah_dilakukan && <p className="muted small acuan">Minggu lalu ({lalu.report_periods?.label}): {lalu.sudah_dilakukan}</p>}
            </div>
            <div className="card">
              <label className="lbl-form" htmlFor="rencana">Rencana minggu depan</label>
              <textarea id="rencana" name="rencana_berikut" rows={6} defaultValue={ini?.rencana_berikut ?? ''} placeholder="Langkah berikut beserta target tanggal." />
              {lalu?.rencana_berikut && <p className="muted small acuan">Rencana minggu lalu: {lalu.rencana_berikut}</p>}
            </div>
          </div>

          <div className="card mt">
            <label className="lbl-form" htmlFor="override">Perburuk status secara manual (opsional)</label>
            <p className="muted small">Pakai bila ada hambatan yang belum tercermin di angka. Status tidak dapat diperbaiki secara manual.</p>
            <div className="baris-form">
              <select id="override" name="status_override" defaultValue={ini?.status_override ?? ''}>
                <option value="">Tidak, ikuti hitungan sistem ({KESEHATAN[pratinjau].label})</option>
                {pilihanOverride(pratinjau).map(s => <option key={s} value={s}>{KESEHATAN[s].label}</option>)}
              </select>
              <input name="alasan_override" defaultValue={ini?.alasan_override ?? ''} placeholder="Alasan (wajib bila diisi)" aria-label="Alasan override" />
            </div>
          </div>

          {dapatEdit && (
            <div className="aksi-form">
              {sudahDiajukan
                ? <button className="btn primary" formAction={ajukan}>Simpan perubahan</button>
                : <><button className="btn" formAction={simpanDraf}>Simpan draf</button>
                  <button className="btn primary" formAction={ajukan}><CircleCheck size={15} aria-hidden="true" />Simpan &amp; verifikasi</button></>}
            </div>
          )}
        </fieldset>
      </form>

      <section className="section">
        <SectionHead no="2" eyebrow="PICA" judul="Masalah dan aksi korektif">
          <p className="muted">Status Terlambat atau Kritis wajib punya minimal satu masalah terbuka dengan aksi korektif. Setiap aksi punya penanggung jawab dan tanggal target.</p>
        </SectionHead>
        <div className="row aksi-atas"><Link href={`/dukungan?proyek=${p.id}#ajukan`} className="btn">Butuh dukungan atau keputusan pimpinan? Ajukan di sini</Link></div>
        <div className="grid-2">
          <div className="card stack-list">
            {d.masalah.length === 0 && <p className="muted small">Belum ada masalah tercatat.</p>}
            {d.masalah.map(m => (
              <div key={m.id} className="pica" id={`masalah-${m.id}`}>
                <div className="row"><b>{m.jenis === 'risiko' && <span className="muted">Risiko · </span>}{m.judul}</b><span className={`chip chip-${m.status === 'terbuka' ? 'warn' : 'good'}`}>{m.status} · {m.keparahan}</span></div>
                {m.dampak && <p className="muted small">Dampak: {m.dampak}</p>}
                {m.akar_masalah && <p className="muted small">Akar masalah: {m.akar_masalah}</p>}
                {m.jenis === 'risiko' && <p className="muted small">Kemungkinan {m.kemungkinan}/5 · dampak {m.skor_dampak}/5</p>}
                <p className="muted small">Pemilik: {orang.find(o => o.id === m.owner_id)?.nama ?? '–'}</p>
                <ul>
                  {m.actions.filter(a => a.status !== 'dibatalkan').map(a => (
                    <li key={a.id}>
                      {a.deskripsi} <span className="muted small">· {orang.find(o => o.id === a.owner_id)?.nama ?? '–'} · {tgl(a.tanggal_target, false)} · {a.status}</span>
                      {boleh && a.status !== 'selesai' && (
                        <form action={ubahPica} className="inline"><input type="hidden" name="project_id" value={p.id} /><input type="hidden" name="action_id" value={a.id} /><button className="btn-mini">Selesai</button></form>
                      )}
                    </li>
                  ))}
                  {m.actions.length === 0 && <li className="flag">Belum ada aksi korektif</li>}
                </ul>
                {boleh && (
                  <div className="aksi-isu">
                    {m.status === 'terbuka' && (
                      <details>
                        <summary className="btn-mini">+ Aksi</summary>
                        <form action={tambahAksiPica} className="form-pica mini-form">
                          <input type="hidden" name="project_id" value={p.id} />
                          <input type="hidden" name="issue_id" value={m.id} />
                          <input name="aksi" required placeholder="Aksi korektif" aria-label="Aksi korektif" />
                          <div className="baris-form">
                            <select name="owner_id" required defaultValue={saya.id} aria-label="Penanggung jawab">{opsiOrang}</select>
                            <input type="date" name="tanggal_target" required aria-label="Tanggal target" />
                          </div>
                          <button className="btn">Tambah aksi</button>
                        </form>
                      </details>
                    )}
                    <details>
                      <summary className="btn-mini">Ubah</summary>
                      <form action={ubahMasalah} className="form-pica mini-form">
                        <input type="hidden" name="project_id" value={p.id} />
                        <input type="hidden" name="issue_id" value={m.id} />
                        <IsianMasalah m={m} opsiOrang={opsiOrang} pemilik={m.owner_id} />
                        <button className="btn">Simpan</button>
                      </form>
                    </details>
                    <form action={ubahPica} className="inline">
                      <input type="hidden" name="project_id" value={p.id} /><input type="hidden" name="issue_id" value={m.id} />
                      <input type="hidden" name="status" value={m.status === 'terbuka' ? 'ditutup' : 'terbuka'} />
                      <button className="btn-mini">{m.status === 'terbuka' ? 'Tutup masalah' : 'Buka kembali'}</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
          {boleh && (
            <form className="card form-pica" action={tambahPica}>
              <h3>Catat masalah baru</h3>
              <input type="hidden" name="project_id" value={p.id} />
              <input type="hidden" name="org_unit_id" value={d.ringkas?.org_unit_id ?? ''} />
              <IsianMasalah opsiOrang={opsiOrang} pemilik={saya.id} />
              <label>Aksi korektif<input name="aksi" required placeholder="Kalimat kerja yang spesifik" /></label>
              <div className="baris-form">
                <label>Penanggung jawab aksi
                  <select name="aksi_owner_id" required defaultValue={saya.id}>{opsiOrang}</select>
                </label>
                <label>Tanggal target<input type="date" name="tanggal_target" required /></label>
              </div>
              <button className="btn primary">Catat</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

const SKOR = [1, 2, 3, 4, 5];

// Isian bersama untuk mencatat dan mengubah masalah/risiko proyek.
function IsianMasalah({ m, opsiOrang, pemilik }: { m?: Masalah; opsiOrang: React.ReactNode; pemilik: string }) {
  return (
    <>
      <label>Jenis
        <select name="jenis" defaultValue={m?.jenis ?? 'masalah'}><option value="masalah">Masalah (sudah terjadi)</option><option value="risiko">Risiko (mungkin terjadi)</option></select>
      </label>
      <label>Masalah (problem identification)<input name="judul" required defaultValue={m?.judul} placeholder="Mis. Data energi 1 tahun belum diserahkan 4 bagian" /></label>
      <label>Dampak<input name="dampak" defaultValue={m?.dampak ?? ''} placeholder="Mis. Workshop target SMEn mundur 2 minggu" /></label>
      <label>Akar masalah<input name="akar_masalah" defaultValue={m?.akar_masalah ?? ''} /></label>
      <div className="baris-form">
        <label>Keparahan
          <select name="keparahan" defaultValue={m?.keparahan ?? 'sedang'}><option value="rendah">Rendah</option><option value="sedang">Sedang</option><option value="tinggi">Tinggi</option><option value="kritis">Kritis</option></select>
        </label>
        <label>Pemilik masalah<select name="owner_id" required defaultValue={pemilik}>{opsiOrang}</select></label>
      </div>
      <div className="baris-form">
        <label>Kemungkinan (wajib untuk risiko)
          <select name="kemungkinan" defaultValue={m?.kemungkinan ?? ''}><option value="">–</option>{SKOR.map(n => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label>Skor dampak (wajib untuk risiko)
          <select name="skor_dampak" defaultValue={m?.skor_dampak ?? ''}><option value="">–</option>{SKOR.map(n => <option key={n} value={n}>{n}</option>)}</select>
        </label>
      </div>
    </>
  );
}
