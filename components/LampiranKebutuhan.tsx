import { Chip } from '@/components/Chip';
import { tgl } from '@/lib/format';
import { type Cakupan, KEBUTUHAN_DIGITAL, SUMBER_KEBUTUHAN } from '@/lib/kebutuhan-digital';

const CAKUPAN: Record<Cakupan, { kode: 'info' | 'warn' | 'na'; label: (p?: string) => string }> = {
  tercakup: { kode: 'info', label: p => `Ditangani ${p}` },
  sebagian: { kode: 'warn', label: p => `Sebagian · ${p}` },
  belum: { kode: 'na', label: () => 'Proyek menyusul' },
};

// Lampiran laporan cetak: ringkasan kebutuhan digitalisasi per bagian dan keterkaitannya dengan proyek berjalan.
export default function LampiranKebutuhan({ halaman }: { halaman: number }) {
  const semua = KEBUTUHAN_DIGITAL.flatMap(b => b.kebutuhan);
  const hitung = (c: Cakupan) => semua.filter(k => k.cakupan === c).length;
  const belum = semua.filter(k => k.cakupan === 'belum');
  // Judul berupa kesimpulan berangka (panduan §5).
  const kesimpulan = `${hitung('tercakup') + hitung('sebagian')} dari ${semua.length} kebutuhan digitalisasi sudah ditangani proyek berjalan; ${belum.length} proyeknya menyusul`;

  return (
    <article className="isi-page lampiran-page">
      <header className="ch-head">
        <div>
          <div className="eyebrow">Lampiran A · Hal. {halaman} · Kebutuhan digitalisasi per bagian</div>
          <h2>{kesimpulan}</h2>
        </div>
      </header>

      <div className="cv-rekap">
        <div><b className="tnum">{semua.length}</b><span>Kebutuhan dari {KEBUTUHAN_DIGITAL.length} bagian</span></div>
        <div className="cv-info"><b className="tnum">{hitung('tercakup')}</b><span>Ditangani proyek</span></div>
        <div className="cv-warn"><b className="tnum">{hitung('sebagian')}</b><span>Sebagian ditangani</span></div>
        <div><b className="tnum">{belum.length}</b><span>Proyek menyusul</span></div>
      </div>

      <table className="cv-isi lk-tabel">
        <thead><tr><th>Kode</th><th>Kebutuhan dan masalah saat ini</th><th>Tindak lanjut</th></tr></thead>
        {KEBUTUHAN_DIGITAL.map(b => (
          <tbody key={b.bagian}>
            <tr className="lk-bagian"><td colSpan={3}>{b.bagian} <span className="muted">· {b.kebutuhan.length} kebutuhan</span></td></tr>
            {b.kebutuhan.map(k => (
              <tr key={k.kode}>
                <td className="mono">{k.kode.replace('DNA-2026-', '')}</td>
                <td><b>{k.judul}</b> <span className="muted">— {k.masalah}</span>{k.catatan && <span className="lk-catatan"> Catatan: {k.catatan}.</span>}</td>
                <td><Chip kode={CAKUPAN[k.cakupan].kode} label={CAKUPAN[k.cakupan].label(k.proyek)} /></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <footer className="ch-foot">
        <span>Sumber: {SUMBER_KEBUTUHAN.judul}, {tgl(SUMBER_KEBUTUHAN.tanggal)} · {SUMBER_KEBUTUHAN.status} Kode = DNA-2026-xxxx; pemetaan ke proyek oleh Bagian Manajemen Risiko dan TI.</span>
      </footer>
    </article>
  );
}
