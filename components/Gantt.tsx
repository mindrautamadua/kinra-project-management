import { BULAN } from '@/lib/format';

export interface BarisGantt {
  id: string; kode?: string; nama: string; href?: string;
  rencanaMulai: string | null; rencanaSelesai: string | null;
  aktualMulai?: string | null; aktualSelesai?: string | null;
  progres: number | null; selesai?: boolean;
}

const hari = (iso: string) => Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 864e5;

// Gantt ringkas: kotak putus-putus = baseline, bar biru = progres, arsir merah = lewat tenggat.
// Rentang otomatis per bulan penuh dari tanggal paling awal sampai paling akhir.
export default function Gantt({ baris, hariIni }: { baris: BarisGantt[]; hariIni: string }) {
  const tanggal = baris.flatMap(b => [b.rencanaMulai, b.rencanaSelesai, b.aktualSelesai]).filter(Boolean) as string[];
  if (!tanggal.length) return <p className="muted small">Belum ada aktivitas bertanggal.</p>;
  tanggal.push(hariIni);
  const min = tanggal.reduce((a, b) => (a < b ? a : b));
  const max = tanggal.reduce((a, b) => (a > b ? a : b));
  const [y0, m0] = min.split('-').map(Number);
  const [y1, m1] = max.split('-').map(Number);
  const bulan: { label: string; awal: string }[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
    bulan.push({ label: `${BULAN[m - 1]}${m === 1 || bulan.length === 0 ? ` ${y}` : ''}`, awal: `${y}-${String(m).padStart(2, '0')}-01` });
  }
  const akhir = m1 === 12 ? `${y1 + 1}-01-01` : `${y1}-${String(m1 + 1).padStart(2, '0')}-01`;
  const t0 = hari(bulan[0].awal), span = hari(akhir) - t0;
  const pos = (iso: string) => Math.max(0, Math.min(100, ((hari(iso) - t0) / span) * 100));
  const kini = pos(hariIni);

  return (
    <div className="table-wrap">
      <div className="gantt">
        <div className="g-head">
          <div>Nama</div>
          <div className="g-months">
            {bulan.map((b, i) => <span key={b.awal} style={{ left: `${pos(b.awal)}%`, width: `${(i + 1 < bulan.length ? pos(bulan[i + 1].awal) : 100) - pos(b.awal)}%` }}>{b.label}</span>)}
          </div>
        </div>
        <div className="g-body">
          {baris.map(b => {
            const isi = b.href ? <a href={b.href}>{b.kode && <span>{b.kode}</span>}{b.nama}</a> : <>{b.kode && <span>{b.kode}</span>}{b.nama}</>;
            if (!b.rencanaMulai || !b.rencanaSelesai) {
              return <div className="g-row" key={b.id}><div className="nm">{isi}</div><div className="g-lane"><span className="g-nodate">Belum ada tanggal</span></div></div>;
            }
            const x = pos(b.rencanaMulai), w = Math.max(pos(b.rencanaSelesai) + 100 / span - x, 0.6);
            const lewat = !b.selesai && b.rencanaSelesai < hariIni;
            return (
              <div className="g-row" key={b.id}>
                <div className="nm" title={b.nama}>{isi}</div>
                <div className="g-lane" role="img" aria-label={`${b.nama}: baseline ${b.rencanaMulai} sampai ${b.rencanaSelesai}, progres ${b.progres ?? 0}%`}>
                  <div className="g-plan" style={{ left: `${x}%`, width: `${w}%` }} />
                  <div className="g-act" style={{ left: `${x}%`, width: `${(w * (b.progres ?? 0)) / 100}%` }} />
                  {lewat && <div className="g-over" style={{ left: `${x + w}%`, width: `${Math.max(kini - x - w, 0)}%` }} />}
                </div>
              </div>
            );
          })}
          <div className="g-today" style={{ left: `calc(220px + (100% - 220px) * ${kini / 100})` }}><em>Hari ini</em></div>
        </div>
      </div>
    </div>
  );
}
