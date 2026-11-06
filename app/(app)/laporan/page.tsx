import { cookies } from 'next/headers';
import Link from 'next/link';
import Charter from '@/components/Charter';
import Cover from '@/components/Cover';
import LampiranKebutuhan from '@/components/LampiranKebutuhan';
import { type EntriLampiran, FOTO_PER_HALAMAN, HalamanFoto, PembukaLampiran } from '@/components/LampiranFoto';
import Ringkasan from '@/components/Ringkasan';
import { muatRingkasan } from '@/lib/ringkasan';
import { SectionHead } from '@/components/Chip';
import TombolCetak from '@/components/client/TombolCetak';
import { kelengkapan } from '@/lib/charter';
import { daftarProyek, detailProyek, profilAktif } from '@/lib/data';
import { muatFoto } from '@/lib/foto';
import { hariIni, tgl } from '@/lib/format';
import { KUE_PILIHAN } from '@/lib/pilihan-laporan';
import { pilihSemua, simpanPilihan } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;
const UNIT = [
  { kode: 'semua', label: 'Semua', sampul: 'Bagian Manajemen Risiko dan TI' },
  { kode: 'A', label: 'Manajemen Risiko', sampul: 'Bidang Manajemen Risiko' },
  { kode: 'B', label: 'Teknologi Informasi', sampul: 'Bidang Teknologi Informasi' },
];

// Pengganti deck laporan mingguan: satu charter per proyek (semua status kecuali draf), siap dicetak ke PDF.
// Pengguna dapat memilih proyek yang dicetak (tersimpan di cookie per browser); sampul dan ringkasan eksekutif mengikuti pilihan.
export default async function Laporan({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const paket = sp.paket === '1';
  const lampiran = sp.lampiran !== '0';
  const adaFoto = sp.foto !== '0';
  const unit = typeof sp.unit === 'string' && UNIT.some(u => u.kode === sp.unit) ? sp.unit : 'semua';
  const [semua, orang] = await Promise.all([daftarProyek(), profilAktif()]);
  const cari = typeof sp.q === 'string' ? sp.q.trim() : '';
  const kata = cari.toLowerCase().split(/\s+/).filter(Boolean);
  // Semua kata harus cocok dengan kode, nama proyek, PIC, atau nama unit.
  const calon = semua.filter(p => p.status !== 'draf' && (unit === 'semua' || p.unit_kode.startsWith(unit)))
    .filter(p => { const t = `${p.kode} ${p.nama} ${p.pic_nama} ${p.unit_nama}`.toLowerCase(); return kata.every(k => t.includes(k)); });
  const dikecualikan = new Set(((await cookies()).get(KUE_PILIHAN)?.value ?? '').split(',').filter(Boolean));
  const dilaporkan = calon.filter(p => !dikecualikan.has(p.id));
  const pilih = dilaporkan.length < calon.length;
  const href = (u: string, opsi: { paket?: boolean; lampiran?: boolean; foto?: boolean } = {}) => {
    const q = new URLSearchParams({ ...(u !== 'semua' && { unit: u }), ...(cari && { q: cari }), ...((opsi.paket ?? paket) && { paket: '1' }), ...(!(opsi.lampiran ?? lampiran) && { lampiran: '0' }), ...(!(opsi.foto ?? adaFoto) && { foto: '0' }) });
    return q.size ? `/laporan?${q}` : '/laporan';
  };
  const sebagian = pilih || unit !== 'semua' || !!cari;
  const detail = (await Promise.all(dilaporkan.map(p => detailProyek(p.id)))).filter(d => d !== null);
  const tercetak = dilaporkan.filter(p => detail.some(d => d.proyek.id === p.id));
  const sampul = `${UNIT.find(u => u.kode === unit)!.sampul}${cari ? ` · pencarian "${cari}"` : ''}${pilih ? ` · ${tercetak.length} proyek terpilih` : ''}`;
  const nama = new Map(orang.map(o => [o.id, o.nama]));
  const ringkasan = paket ? await muatRingkasan(sebagian ? new Set(tercetak.map(p => p.id)) : undefined) : null;
  const belumLengkap = detail.filter(d => { const k = kelengkapan(d); return k.terisi < k.total; }).length;

  // Lampiran: halaman pembatas, kebutuhan digitalisasi (opsional), lalu foto kegiatan per proyek (6 foto per halaman).
  const foto = adaFoto ? await muatFoto(detail.flatMap(d => d.aktivitas.map(a => a.id))) : [];
  const fotoProyek = detail.map(d => ({ d, foto: foto.filter(f => d.aktivitas.some(a => a.id === f.activity_id)) })).filter(x => x.foto.length);
  const halPembuka = (ringkasan ? 4 : 3) + detail.length;
  const daftarLampiran: EntriLampiran[] = [];
  let hal = halPembuka + 1;
  if (lampiran) daftarLampiran.push({ hal: hal++, judul: 'Kebutuhan digitalisasi per bagian' });
  const halamanFoto = fotoProyek.flatMap(({ d, foto: f }) => {
    const jumlah = Math.ceil(f.length / FOTO_PER_HALAMAN);
    daftarLampiran.push({ hal, judul: `Foto kegiatan ${d.proyek.kode} ${d.proyek.nama}`, ket: `${f.length} foto · ${jumlah} halaman` });
    const huruf = String.fromCharCode(64 + daftarLampiran.length);
    const aktivitas = new Map(d.aktivitas.map(a => [a.id, a]));
    return Array.from({ length: jumlah }, (_, i) => ({
      key: `${d.proyek.id}-${i}`, halaman: hal++, huruf, kode: d.proyek.kode, nama: d.proyek.nama,
      foto: f.slice(i * FOTO_PER_HALAMAN, (i + 1) * FOTO_PER_HALAMAN), aktivitas, ke: i + 1, dari: jumlah,
    }));
  });
  const adaLampiran = detail.length > 0 && daftarLampiran.length > 0;

  return (
    <section className="section first">
      <div className="layar-saja">
        <SectionHead no="05" eyebrow={`Laporan proyek · per tanggal cetak ${tgl(hariIni())}`} judul={paket ? `Paket Direktur: ringkasan eksekutif + ${detail.length} charter` : cari ? `${detail.length} charter cocok dengan "${cari}"` : `${detail.length} charter proyek, ${belumLengkap} belum lengkap`}>
          <p className="muted">Satu halaman per proyek, disusun otomatis dari data. Cetak ke PDF dengan orientasi landscape untuk menggantikan deck slide mingguan.</p>
        </SectionHead>
        <div className="row aksi-atas">
          <div className="seg" role="group" aria-label="Filter unit">
            {UNIT.map(u => <Link key={u.kode} href={href(u.kode)} aria-pressed={unit === u.kode} className="seg-link">{u.label}</Link>)}
          </div>
          <form className="cari" role="search">
            {unit !== 'semua' && <input type="hidden" name="unit" value={unit} />}
            {paket && <input type="hidden" name="paket" value="1" />}
            {!lampiran && <input type="hidden" name="lampiran" value="0" />}
            <input type="search" name="q" defaultValue={cari} placeholder="Cari kode, nama proyek, PIC, unit" aria-label="Cari charter" />
          </form>
          {cari && <Link href={href(unit)} className="btn-mini">Hapus pencarian</Link>}
          {detail.length > 0 && <TombolCetak label={`${paket ? `Cetak paket Direktur (${detail.length + 1} bagian)` : `Cetak ${detail.length} charter`}${adaLampiran ? ' + lampiran' : ''}`} />}
          {paket ? <Link href={href(unit, { paket: false })} className="btn-mini">Tanpa ringkasan</Link> : <Link href={href(unit, { paket: true })} className="btn-mini">Tambah ringkasan eksekutif di depan</Link>}
          <Link href={href(unit, { lampiran: !lampiran })} className="btn-mini">{lampiran ? 'Tanpa lampiran kebutuhan digitalisasi' : 'Tambah lampiran kebutuhan digitalisasi'}</Link>
          <Link href={href(unit, { foto: !adaFoto })} className="btn-mini">{adaFoto ? `Tanpa lampiran foto (${foto.length} foto dari ${fotoProyek.length} proyek)` : 'Tambah lampiran foto kegiatan'}</Link>
        </div>
        {calon.length > 0 && (
          <details className="card pilih-cetak" open={pilih}>
            <summary><b>Pilih proyek yang dicetak</b> <span className="muted">{tercetak.length} dari {calon.length} proyek{pilih ? ' · pilihan tersimpan' : ''}{paket ? '; ringkasan eksekutif mengikuti pilihan' : ''}</span></summary>
            <form action={simpanPilihan}>
              <input type="hidden" name="kembali" value={href(unit)} />
              <div className="daftar-cek">
                {calon.map(p => (
                  <label key={p.id} className="cek">
                    <input type="hidden" name="tampil" value={p.id} />
                    <input type="checkbox" name="p" value={p.id} defaultChecked={!dikecualikan.has(p.id)} />
                    <span><span className="mono">{p.kode}</span> {p.nama}{p.status === 'selesai' && <small className="muted"> · selesai</small>}</span>
                  </label>
                ))}
              </div>
              <div className="aksi-form">
                {dikecualikan.size > 0 && <button formAction={pilihSemua} className="btn-mini">Pilih semua lagi</button>}
                <button className="btn primary">Simpan pilihan</button>
              </div>
            </form>
          </details>
        )}
      </div>
      {detail.length > 0 && <Cover unitLabel={sampul} proyek={tercetak} adaRingkasan={!!ringkasan} lampiran={adaLampiran ? [{ hal: halPembuka, judul: 'Lampiran' }, ...daftarLampiran] : []} hariIni={hariIni()} />}
      {ringkasan && <Ringkasan r={ringkasan} />}
      {detail.length === 0 && <div className="card kosong layar-saja">{pilih && calon.length ? 'Belum ada proyek yang dipilih. Centang minimal satu proyek.' : `Tidak ada proyek yang cocok${cari ? ` dengan "${cari}"` : ''}.`}</div>}
      {detail.map(d => <Charter key={d.proyek.id} d={d} hariIni={hariIni()} orang={nama} />)}
      {adaLampiran && <PembukaLampiran halaman={halPembuka} daftar={daftarLampiran} hariIni={hariIni()} />}
      {adaLampiran && lampiran && <LampiranKebutuhan halaman={halPembuka + 1} />}
      {halamanFoto.map(({ key, ...h }) => <HalamanFoto key={key} {...h} />)}
    </section>
  );
}
