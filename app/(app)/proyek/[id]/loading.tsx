import { SkAksi, SkHalaman, SkHead, SkKartu, SkTiles, Tulang } from '@/components/Skeleton';

export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <div className="crumb-back"><Tulang w={110} h={12} /></div>
        <SkHead />
        <SkAksi n={4} />
        <SkTiles n={4} />
        <SkKartu baris={3} />
      </section>
      <section className="section">
        <SkHead />
        <SkKartu tinggi={320} />
      </section>
    </SkHalaman>
  );
}
