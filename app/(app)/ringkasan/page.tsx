import Link from 'next/link';
import { CircleCheck, FileStack, TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import Ringkasan from '@/components/Ringkasan';
import TombolCetak from '@/components/client/TombolCetak';
import { tgl } from '@/lib/format';
import { muatRingkasan } from '@/lib/ringkasan';
import { penggunaSaatIni } from '@/lib/sesi';
import { simpanCatatan } from './actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;

export default async function HalamanRingkasan({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const [r, saya] = await Promise.all([muatRingkasan(), penggunaSaatIni()]);
  const bolehCatat = saya.peran.some(x => x.role === 'kabag' || x.role === 'admin');
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;

  return (
    <section className="section first">
      <div className="layar-saja">
        <SectionHead no="07" eyebrow={`Untuk Direktur · per ${tgl(r.hariIni)}`} judul="Ringkasan eksekutif">
          <p className="muted">Satu halaman, disusun otomatis dari data. Cetak paket untuk Direktur: halaman ini sebagai halaman pertama, diikuti charter setiap proyek aktif sebagai lampiran.</p>
        </SectionHead>
        {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
        {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
        <div className="row aksi-atas">
          <Link href="/laporan?paket=1" className="btn primary"><FileStack size={15} aria-hidden="true" />Buka paket Direktur (ringkasan + lampiran)</Link>
          <TombolCetak label="Cetak ringkasan saja" />
        </div>
        {bolehCatat && (
          <details className="ch-edit">
            <summary className="btn">Catatan Kabag untuk Direktur{r.catatan ? ' (terisi)' : ''}</summary>
            <form action={simpanCatatan} className="card form-pica ch-form">
              <label>Maksimal 3 butir, satu butir per baris. Tampil di bagian 6.
                <textarea name="catatan" rows={4} defaultValue={r.catatan ?? ''} placeholder={'Mis. Pengadaan router Starlink Graha dipercepat; target pemasangan 7 Nov'} />
              </label>
              <button className="btn primary">Simpan catatan</button>
            </form>
          </details>
        )}
      </div>
      <Ringkasan r={r} />
    </section>
  );
}
