import { SkHalaman, SkHead, SkKartu, SkSeg } from '@/components/Skeleton';

export default function Memuat() {
  return (
    <SkHalaman>
      <section className="section first">
        <SkHead />
        <div className="row aksi-atas"><SkSeg n={3} /></div>
        <SkKartu tinggi={520} />
      </section>
    </SkHalaman>
  );
}
