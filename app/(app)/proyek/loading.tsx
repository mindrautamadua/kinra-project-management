import { SkAksi, SkHalaman, SkHead, SkTabel } from '@/components/Skeleton';

export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <SkHead />
        <SkAksi n={1} />
        <SkTabel />
      </section>
    </SkHalaman>
  );
}
