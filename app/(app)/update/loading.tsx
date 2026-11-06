import { SkHalaman, SkHead, SkTabel } from '@/components/Skeleton';

export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <SkHead />
        <SkTabel kolom={[10, 40, 18, 16, 16]} baris={6} alat={false} />
      </section>
    </SkHalaman>
  );
}
