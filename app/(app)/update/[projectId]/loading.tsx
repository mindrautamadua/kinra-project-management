import { SkForm, SkHalaman, SkHead, Tulang } from '@/components/Skeleton';

export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <div className="crumb-back"><Tulang w={110} h={12} /></div>
        <SkHead />
        <SkForm kolom={4} area={3} />
      </section>
    </SkHalaman>
  );
}
