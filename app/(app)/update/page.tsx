import Link from 'next/link';
import { ChipKesehatan, ChipUpdate, SectionHead } from '@/components/Chip';
import { daftarProyek, periodeBerjalan } from '@/lib/data';
import { supabase } from '@/lib/supabase/server';

export default async function DaftarUpdate() {
  const sb = await supabase();
  const [periode, proyek, { data: dapat }] = await Promise.all([
    periodeBerjalan(), daftarProyek(), sb.rpc('fn_proyek_dapat_diubah'),
  ]);
  const { data: updates } = await sb.from('project_updates').select('id,project_id,status').eq('period_id', periode.id);
  const perProyek = new Map((updates ?? []).map(u => [u.project_id, u]));
  const milikSaya = proyek.filter(p => ((dapat ?? []) as string[]).includes(p.id));
  const belum = milikSaya.filter(p => ['draf', 'dikembalikan', undefined].includes(perProyek.get(p.id)?.status)).length;

  return (
    <>
      <section className="section first">
        <SectionHead no="03" eyebrow={`Update mingguan · ${periode.label}`}
          judul={milikSaya.length ? (belum ? `${belum} dari ${milikSaya.length} proyek Anda belum diajukan` : `Semua ${milikSaya.length} proyek Anda sudah diajukan`) : 'Tidak ada proyek aktif yang Anda kelola'}>
          <p className="muted">Isi progres aktivitas, yang telah dilakukan, rencana minggu depan, dan PICA. Angka progres dan status dihitung sistem. Update yang diajukan langsung final dan masih dapat diedit sampai periode ditutup.</p>
        </SectionHead>
        <Daftar proyek={milikSaya} perProyek={perProyek} kosong="Anda belum menjadi PIC atau pengelola proyek aktif." />
      </section>
    </>
  );
}

function Daftar({ proyek, perProyek, kosong }: {
  proyek: Awaited<ReturnType<typeof daftarProyek>>; perProyek: Map<string, { status: string }>; kosong: string;
}) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Proyek</th><th>Status proyek</th><th>Update periode ini</th><th /></tr></thead>
          <tbody>
            {proyek.length === 0 && <tr><td colSpan={5} className="kosong">{kosong}</td></tr>}
            {proyek.map(p => (
              <tr key={p.id}>
                <td className="kode">{p.kode}</td>
                <td>{p.nama}<div className="upd">{p.pic_nama}</div></td>
                <td><ChipKesehatan status={p.status_kesehatan} /></td>
                <td><ChipUpdate status={perProyek.get(p.id)?.status ?? null} /></td>
                <td><Link className="btn" href={`/update/${p.id}`}>Buka</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
