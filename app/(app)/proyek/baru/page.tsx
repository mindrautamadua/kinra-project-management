import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { SectionHead } from '@/components/Chip';
import FieldsCharter from '@/components/FieldsCharter';
import { daftarPic, daftarSasaran, daftarUnit } from '@/lib/data';
import { penggunaSaatIni } from '@/lib/sesi';
import { buatProyek } from '../actions';

type Cari = Promise<Record<string, string | string[] | undefined>>;

export default async function ProyekBaru({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const [saya, unit, pics, sasaran] = await Promise.all([penggunaSaatIni(), daftarUnit(), daftarPic(), daftarSasaran()]);
  const subUnit = unit.filter(u => u.level === 'sub_bidang' || u.level === 'bidang');
  const galat = typeof sp.galat === 'string' ? sp.galat : null;

  return (
    <section className="section first">
      <div className="crumb-back"><Link href="/proyek">← Daftar proyek</Link></div>
      <SectionHead no="+" eyebrow="Proyek baru" judul="Buat project charter">
        <p className="muted">Proyek dibuat sebagai Draf. Setelah aktivitas dan tanggalnya lengkap, aktifkan proyek untuk mengunci baseline dan memasukkannya ke laporan mingguan.</p>
      </SectionHead>
      {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
      <form action={buatProyek} className="card form-pica form-lebar">
        <label className="setengah">Unit pelaksana
          <select name="org_unit_id" required defaultValue="">
            <option value="" disabled>Pilih sub bidang</option>
            {subUnit.map(u => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
          </select>
          <small className="muted">Kode proyek dibuat otomatis dari kode unit, mis. A.1.7.</small>
        </label>
        <FieldsCharter pics={pics} saya={saya.id} sasaran={sasaran} />
        <button className="btn primary">Buat proyek (Draf)</button>
      </form>
    </section>
  );
}
