import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import Charter from '@/components/Charter';
import TombolCetak from '@/components/client/TombolCetak';
import { kelengkapan } from '@/lib/charter';
import { detailProyek, profilAktif } from '@/lib/data';
import { hariIni } from '@/lib/format';
import { supabase } from '@/lib/supabase/server';

type Cari = Promise<Record<string, string | string[] | undefined>>;

export default async function HalamanCharter({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const { id } = await params;
  const sp = await searchParams;
  const sb = await supabase();
  const [d, orang, { data: boleh }] = await Promise.all([
    detailProyek(id), profilAktif(), sb.rpc('fn_boleh_ubah_proyek', { p_project: id }),
  ]);
  if (!d) notFound();
  const lengkap = kelengkapan(d);
  const galat = typeof sp.galat === 'string' ? sp.galat : null;
  const ok = typeof sp.ok === 'string' ? sp.ok : null;

  return (
    <section className="section first">
      <div className="layar-saja">
        <div className="crumb-back"><Link href={`/proyek/${id}`}>← Detail proyek</Link> · <Link href="/laporan">Laporan semua proyek</Link></div>
        {galat && <div className="pesan galat" role="alert"><TriangleAlert size={16} aria-hidden="true" />{galat}</div>}
        {ok && <div className="pesan ok" role="status"><CircleCheck size={16} aria-hidden="true" />{ok}</div>}
        <div className="row aksi-atas">
          <TombolCetak />
          {boleh && <Link href={`/proyek/${id}/ubah`} className="btn primary">Ubah charter &amp; aktivitas ({lengkap.terisi}/{lengkap.total})</Link>}
        </div>
      </div>
      <Charter d={d} hariIni={hariIni()} orang={new Map(orang.map(o => [o.id, o.nama]))} />
    </section>
  );
}
