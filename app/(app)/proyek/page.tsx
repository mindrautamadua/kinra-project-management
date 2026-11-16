import DaftarProyek, { type BarisProyek } from '@/components/client/DaftarProyek';
import { daftarProyek } from '@/lib/data';
import { bolehMenu } from '@/lib/menu';
import { penggunaSaatIni } from '@/lib/sesi';
import { supabase } from '@/lib/supabase/server';

type Cari = Promise<Record<string, string | string[] | undefined>>;

// Data seluruh proyek dimuat sekali di server; filter lingkup/status/pencarian berjalan di browser
// (components/client/DaftarProyek.tsx) agar pindah tab instan tanpa render ulang di server.
export default async function HalamanDaftarProyek({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const sb = await supabase();
  const [seluruh, saya, { data: milik }] = await Promise.all([daftarProyek(), penggunaSaatIni(), sb.rpc('fn_proyek_saya')]);
  const peran = saya.peran.map(r => r.role);
  // "Proyek saya": proyek yang dipegang (PIC, Operator/Kasubag/Kabag unit) atau dibuat sendiri. Bawaan untuk PIC dan Operator.
  const bawaanSaya = !peran.some(r => ['admin', 'direksi', 'kabag', 'kasubag'].includes(r)) && peran.some(r => ['pic', 'operator'].includes(r));
  // Kirim hanya kolom yang ditampilkan agar payload ke browser kecil.
  const baris: BarisProyek[] = seluruh.map(p => ({
    id: p.id, kode: p.kode, nama: p.nama, status: p.status, pic_nama: p.pic_nama, unit_nama: p.unit_nama,
    tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai, tanggal_selesai_baseline: p.tanggal_selesai_baseline,
    progres_aktual: p.progres_aktual, progres_rencana: p.progres_rencana, spi: p.spi,
    status_kesehatan: p.status_kesehatan, ada_override: p.ada_override,
  }));

  return (
    <DaftarProyek
      seluruh={baris}
      idSaya={(milik ?? []) as string[]}
      bawaanLingkup={bawaanSaya ? 'saya' : 'semua'}
      ok={ok}
      bolehBuat={bolehMenu(peran, '/proyek/baru')}
    />
  );
}
