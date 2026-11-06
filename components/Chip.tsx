import { CircleCheck, CircleDot, CircleX, Info, TrendingDown, TriangleAlert, type LucideIcon } from 'lucide-react';
import { KESEHATAN, STATUS_UPDATE, type KodeStatus } from '@/lib/format';
import type { Kesehatan } from '@/lib/types';

const IKON: Record<KodeStatus, LucideIcon> = {
  good: CircleCheck, warn: TriangleAlert, serious: TrendingDown, crit: CircleX, na: CircleDot, info: Info,
};

// Chip status: ikon + label, warna tidak pernah membawa makna sendirian.
export function Chip({ kode, label }: { kode: KodeStatus; label: string }) {
  const Ikon = IKON[kode];
  return (
    <span className={`chip chip-${kode}`}>
      <Ikon size={13} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  );
}

export function ChipKesehatan({ status, override }: { status: Kesehatan | null; override?: boolean }) {
  if (!status) return <Chip kode="na" label="–" />;
  const s = KESEHATAN[status];
  return (
    <span className="chip-wrap">
      <Chip kode={s.kode} label={s.label} />
      {override && <span className="flag" title="Diperburuk manual oleh PIC (override)">↓ manual</span>}
    </span>
  );
}

export function ChipUpdate({ status }: { status: string | null }) {
  if (!status) return <Chip kode="crit" label="Belum ada" />;
  const s = STATUS_UPDATE[status];
  return <Chip kode={s.kode} label={s.label} />;
}

export function SectionHead({ no, eyebrow, judul, children }: { no: string; eyebrow: string; judul: string; children?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div className="sec-rule"><span className="sec-no">{no}</span><span className="eyebrow">{eyebrow}</span><i /></div>
      <h2>{judul}</h2>
      {children}
    </div>
  );
}

// Bar progres: biru = aktual, garis jingga = rencana (baseline) pada tanggal laporan.
export function Progres({ aktual, rencana }: { aktual: number | null; rencana: number | null }) {
  if (aktual == null) return <span className="muted small">–</span>;
  return (
    <div className="pgx" role="img" aria-label={`Aktual ${Math.round(aktual)}%, rencana ${Math.round(rencana ?? 0)}%`}>
      <div className="pgx-track">
        <b style={{ width: `${Math.min(100, aktual)}%` }} />
        {rencana != null && <u style={{ left: `calc(${Math.min(100, rencana)}% - 1px)` }} />}
      </div>
      <div className="pgx-lbl"><span className="a">{Math.round(aktual)}%</span><span>rencana {Math.round(rencana ?? 0)}%</span></div>
    </div>
  );
}
