import { SkHalaman, SkKartu, Tulang } from '@/components/Skeleton';

export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <div className="crumb-back"><Tulang w={110} h={12} /></div>
        <SkKartu tinggi={560} />
      </section>
    </SkHalaman>
  );
}
