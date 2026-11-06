import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardPen } from 'lucide-react';
import { Chip, ChipKesehatan, ChipUpdate, SectionHead } from '@/components/Chip';
import Gantt from '@/components/Gantt';
import { detailProyek, profilAktif } from '@/lib/data';
import { muatFoto } from '@/lib/foto';
import { penggunaSaatIni } from '@/lib/sesi';
import { angka, hariIni, persen, rupiah, STATUS_PROYEK, tgl, tanggalPelaksanaanFoto } from '@/lib/format';
import { supabase } from '@/lib/supabase/server';
import { hapusFoto, simpanKeteranganFoto } from '../actions-foto';

export default async function DetailProyek({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, orang] = await Promise.all([detailProyek(id), profilAktif()]);
  if (!d) notFound();
  const sb = await supabase();
  const { data: boleh } = await sb.rpc('fn_boleh_ubah_proyek', { p_project: id });
  const nama = (uid: string) => orang.find(o => o.id === uid)?.nama ?? '–';
  const { proyek: p, ringkas: r } = d;
  const [saya, foto] = await Promise.all([penggunaSaatIni(), muatFoto(d.aktivitas.map(a => a.id))]);
  const admin = saya.peran.some(x => x.role === 'admin');

  return (
    <>
      <section className="section first">
        <div className="crumb-back"><Link href="/proyek">← Daftar proyek</Link></div>
        <SectionHead no={p.kode} eyebrow={`${p.org_units?.nama ?? ''} · ${STATUS_PROYEK[p.status]}`} judul={p.nama}>
          {p.deskripsi && <p className="muted">{p.deskripsi}</p>}
        </SectionHead>
        <div className="row aksi-atas">
          <ChipKesehatan status={r?.status_kesehatan ?? null} override={r?.ada_override} />
          <Link href={`/proyek/${p.id}/charter`} className="btn">Project charter</Link>
          {boleh && <Link href={`/proyek/${p.id}/ubah`} className="btn">Ubah charter &amp; aktivitas</Link>}
          {p.status === 'aktif' && <Link href={`/dukungan?proyek=${p.id}#ajukan`} className="btn">Minta dukungan / keputusan</Link>}
          {boleh && p.status === 'aktif' && <Link href={`/update/${p.id}`} className="btn primary"><ClipboardPen size={15} aria-hidden="true" />Isi update minggu ini</Link>}
        </div>
        <div className="tiles tiles-4">
          <div className="tile"><div className="lbl">% aktual</div><div className="val tnum">{persen(r?.progres_aktual)}</div><div className="meta">Bobot × progres aktivitas</div></div>
          <div className="tile"><div className="lbl">% rencana hari ini</div><div className="val tnum">{persen(r?.progres_rencana)}</div><div className="meta">Baseline v{r?.versi_baseline ?? '–'}</div></div>
          <div className="tile"><div className="lbl">SPI</div><div className="val tnum">{angka(r?.spi, 2)}</div><div className="meta">Aktual ÷ rencana</div></div>
          <div className="tile"><div className="lbl">Tenggat baseline</div><div className="val tnum val-sm">{tgl(r?.tanggal_selesai_baseline ?? p.tanggal_selesai)}</div><div className="meta">Rencana kerja: {tgl(p.tanggal_selesai)}</div></div>
        </div>
        <div className="card charter">
          <dl>
            <div><dt>PIC</dt><dd>{d.pics.length ? d.pics.map(x => x.nama).join(', ') : p.pic?.nama ?? '–'}</dd></div>
            <div><dt>Sponsor</dt><dd>{p.sponsor?.nama ?? '–'}</dd></div>
            <div><dt>Periode</dt><dd>{tgl(p.tanggal_mulai)} – {tgl(p.tanggal_selesai)}</dd></div>
            <div><dt>Anggaran</dt><dd>{rupiah(p.anggaran_rp_juta)}</dd></div>
            <div className="lebar"><dt>Kriteria selesai</dt><dd>{p.kriteria_selesai ?? <span className="flag">Belum diisi</span>}</dd></div>
          </dl>
        </div>
      </section>

      <section className="section">
        <SectionHead no="A" eyebrow="Aktivitas" judul={`${d.aktivitas.filter(a => a.status === 'selesai').length} dari ${d.aktivitas.length} aktivitas selesai`}>
          <p className="muted">Kotak putus-putus = baseline aktif. Bar biru = progres aktivitas.</p>
        </SectionHead>
        <div className="card">
          <Gantt hariIni={hariIni()} baris={d.aktivitas.map(a => ({
            id: a.id, nama: `${a.urutan}. ${a.nama}`,
            rencanaMulai: d.baseline[a.id]?.rencana_mulai ?? a.rencana_mulai,
            rencanaSelesai: d.baseline[a.id]?.rencana_selesai ?? a.rencana_selesai,
            progres: a.progres, selesai: a.status === 'selesai' || a.status === 'dibatalkan',
          }))} />
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>Aktivitas</th><th className="num">Bobot</th><th>Baseline</th><th>Aktual</th><th className="num">Progres</th><th>Status</th></tr></thead>
              <tbody>
                {d.aktivitas.map(a => (
                  <tr key={a.id}>
                    <td className="mono">{a.urutan}</td>
                    <td>{a.nama}{a.deliverable && <div className="upd">→ {a.deliverable}</div>}{!d.baseline[a.id] && p.status === 'aktif' && <div className="upd flag">Belum masuk baseline</div>}</td>
                    <td className="num">{angka(a.bobot, 1)}</td>
                    <td className="mono small">{tgl(d.baseline[a.id]?.rencana_mulai ?? a.rencana_mulai, false)} – {tgl(d.baseline[a.id]?.rencana_selesai ?? a.rencana_selesai, false)}</td>
                    <td className="mono small">{tgl(a.aktual_mulai, false)} – {tgl(a.aktual_selesai, false)}</td>
                    <td className="num">{a.progres}%</td>
                    <td className="small">{a.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <div>
            <SectionHead no="B" eyebrow="PICA" judul={`${d.masalah.filter(m => m.status === 'terbuka').length} masalah terbuka`} />
            <div className="card stack-list">
              {d.masalah.length === 0 && <p className="muted small">Belum ada masalah tercatat.</p>}
              {d.masalah.map(m => (
                <div key={m.id} className="pica">
                  <div className="row"><b>{m.judul}</b>{m.status === 'terbuka' ? <Chip kode={m.keparahan === 'kritis' || m.keparahan === 'tinggi' ? 'crit' : 'warn'} label={`Terbuka · ${m.keparahan}`} /> : <Chip kode="good" label="Ditutup" />}</div>
                  {m.dampak && <p className="muted small">Dampak: {m.dampak}</p>}
                  <ul>
                    {m.actions.map(a => (
                      <li key={a.id}>
                        {a.deskripsi} <span className="muted small">· {nama(a.owner_id)} · target {tgl(a.tanggal_target, false)}</span>
                        {a.status !== 'selesai' && a.tanggal_target < hariIni() && <span className="flag"> lewat target</span>}
                        {a.status === 'selesai' && <span className="muted small"> · selesai</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHead no="C" eyebrow="Dukungan" judul={`${d.dukungan.filter(x => ['diajukan', 'diproses'].includes(x.status)).length} permintaan menunggu`} />
            <div className="card stack-list">
              {d.dukungan.length === 0 && <p className="muted small">Belum ada permintaan dukungan.</p>}
              {d.dukungan.map(x => (
                <div key={x.id} className="pica">
                  <div className="row"><b>{x.permintaan}</b><span className="chip chip-na">{x.status}</span></div>
                  <p className="muted small">Tenggat {tgl(x.tenggat)}{x.tanggapan ? ` · Tanggapan: ${x.tanggapan}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead no="D" eyebrow="Riwayat update mingguan" judul={`${d.riwayat.length} laporan`} />
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Periode</th><th>Status</th><th className="num">Rencana</th><th className="num">Aktual</th><th>Kesehatan</th><th>Yang telah dilakukan</th><th>Rencana berikut</th></tr></thead>
              <tbody>
                {d.riwayat.length === 0 && <tr><td colSpan={7} className="kosong">Belum ada update.</td></tr>}
                {d.riwayat.map(u => (
                  <tr key={u.id}>
                    <td className="small">{u.report_periods?.label}</td>
                    <td><ChipUpdate status={u.status} /></td>
                    <td className="num">{persen(u.progres_rencana)}</td>
                    <td className="num">{persen(u.progres_aktual)}</td>
                    <td><ChipKesehatan status={u.status_override ?? u.status_kesehatan} override={!!u.status_override} /></td>
                    <td className="small teks">{u.sudah_dilakukan}</td>
                    <td className="small teks">{u.rencana_berikut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section" id="foto">
        <SectionHead no="E" eyebrow="Foto kegiatan" judul={`${foto.length} foto dari ${new Set(foto.map(f => f.activity_id)).size} aktivitas`}>
          <p className="muted">Dokumentasi kegiatan per aktivitas, diunggah dari form update mingguan. Foto tercetak di halaman Lampiran laporan proyek.</p>
        </SectionHead>
        {foto.length > 0 && (
          <div className="card stack-list">
            {d.aktivitas.filter(a => foto.some(f => f.activity_id === a.id)).map(a => (
              <div key={a.id}>
                <h3 className="small">{a.urutan}. {a.nama}</h3>
                <div className="galeri-foto">
                  {foto.filter(f => f.activity_id === a.id).map(f => (
                    <figure key={f.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {f.url ? <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.keterangan ?? f.nama_file} loading="lazy" /></a> : <div className="foto-hilang">File tidak tersedia</div>}
                      <figcaption>
                        {admin || f.diunggah_oleh === saya.id ? (
                          <form action={simpanKeteranganFoto} className="ket-form">
                            <input type="hidden" name="id" value={f.id} /><input type="hidden" name="project_id" value={p.id} />
                            <textarea name="keterangan" rows={2} defaultValue={f.keterangan ?? ''} placeholder="Keterangan foto ini" aria-label="Keterangan foto" />
                            <input type="date" name="tanggal" defaultValue={f.tanggal_kegiatan ?? ''} max={hariIni()} aria-label="Tanggal pelaksanaan kegiatan" title="Tanggal pelaksanaan kegiatan" />
                            <span><button className="btn-mini">Simpan</button> <button formAction={hapusFoto} className="btn-mini">Hapus</button></span>
                          </form>
                        ) : <span>{f.keterangan ?? <span className="muted">Tanpa keterangan</span>}</span>}
                        <span className="muted small">{tanggalPelaksanaanFoto(f, a) ? `Pelaksanaan ${tanggalPelaksanaanFoto(f, a)} · ` : ''}diunggah {nama(f.diunggah_oleh)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
