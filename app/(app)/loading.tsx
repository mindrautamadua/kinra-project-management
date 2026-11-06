import { SkHalaman, SkHead, SkKartu, SkSeg, SkTabel, SkTiles } from '@/components/Skeleton';

// Dasbor portofolio. Juga menjadi kerangka cadangan untuk rute di bawah (app) yang tidak punya loading.tsx sendiri.
export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <div className="row filter-row"><SkSeg n={5} /></div>
        <SkHead />
        <SkTiles n={6} />
      </section>
      <section className="section">
        <SkHead />
        <div className="grid-1-2">
          <SkKartu baris={5} />
          <SkKartu baris={4} />
        </div>
      </section>
      <section className="section">
        <SkHead />
        <SkTabel />
      </section>
    </SkHalaman>
  );
}
