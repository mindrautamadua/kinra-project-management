// Kerangka pemuat (skeleton) untuk loading.tsx. Memakai kelas tata letak yang sama dengan halaman asli
// (section, card, tiles) agar konten tidak melompat saat data selesai dimuat.

type Ukuran = { w?: number | string; h?: number | string; r?: number | string };

export function Tulang({ w = '100%', h = 12, r }: Ukuran) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;
}

// Pembungkus halaman: mengumumkan status memuat ke pembaca layar sekali saja.
export function SkHalaman({ children }: { children: React.ReactNode }) {
  return (
    <div className="sk-halaman" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat…</span>
      {children}
    </div>
  );
}

export function SkHead({ deskripsi = true }: { deskripsi?: boolean }) {
  return (
    <div className="section-head" aria-hidden="true">
      <div className="sec-rule"><Tulang w={34} h={20} /><Tulang w={180} h={11} /><i /></div>
      <Tulang w="min(560px, 80%)" h={30} r={8} />
      {deskripsi && <div className="sk-baris"><Tulang w="min(720px, 95%)" h={13} /></div>}
    </div>
  );
}

export function SkTiles({ n }: { n: 4 | 6 }) {
  return (
    <div className={`tiles tiles-${n}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="tile">
          <Tulang w="60%" h={13} />
          <div className="sk-val"><Tulang w="45%" h={34} r={8} /></div>
          <Tulang w="70%" h={11} />
        </div>
      ))}
    </div>
  );
}

export function SkSeg({ n = 4 }: { n?: number }) {
  return (
    <div className="seg sk-seg" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <Tulang key={i} w={72} h={28} r={9} />)}
    </div>
  );
}

// Kolom tabel: lebar relatif tiap kolom. Baris kedua sel pertama yang lebar meniru teks "nama · PIC".
export function SkTabel({ kolom = [8, 34, 12, 10, 12, 14, 6, 10], baris = 8, alat = true }: { kolom?: number[]; baris?: number; alat?: boolean }) {
  const lebar = Math.max(...kolom);
  return (
    <div className="card" aria-hidden="true">
      {alat && <div className="row"><SkSeg /><Tulang w={220} h={36} r={10} /></div>}
      <div className="table-wrap">
        <table className="tbl sk-tbl">
          <thead><tr>{kolom.map((k, i) => <th key={i} style={{ width: `${k}%` }}><Tulang w="60%" h={9} /></th>)}</tr></thead>
          <tbody>
            {Array.from({ length: baris }, (_, b) => (
              <tr key={b}>
                {kolom.map((k, i) => (
                  <td key={i}>
                    <Tulang w={`${55 + ((b * 7 + i * 13) % 40)}%`} h={11} />
                    {k === lebar && <div className="sk-baris"><Tulang w="40%" h={9} /></div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkKartu({ baris = 4, tinggi }: { baris?: number; tinggi?: number }) {
  return (
    <div className="card" aria-hidden="true">
      <Tulang w="45%" h={16} />
      <div className="sk-baris"><Tulang w="30%" h={11} /></div>
      {tinggi
        ? <div className="sk-blok"><Tulang h={tinggi} r={10} /></div>
        : <div className="sk-daftar">{Array.from({ length: baris }, (_, i) => <Tulang key={i} w={`${90 - (i % 3) * 15}%`} h={12} />)}</div>}
    </div>
  );
}

export function SkAksi({ n = 3 }: { n?: number }) {
  return (
    <div className="row aksi-atas" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <Tulang key={i} w={i === 0 ? 90 : 150} h={34} r={10} />)}
    </div>
  );
}

// Formulir isian: label + kolom input, dua kolom di layar lebar.
export function SkForm({ kolom = 6, area = 2 }: { kolom?: number; area?: number }) {
  return (
    <div className="card" aria-hidden="true">
      <div className="sk-form">
        {Array.from({ length: kolom }, (_, i) => <div key={i}><Tulang w="35%" h={11} /><Tulang h={38} r={10} /></div>)}
        {Array.from({ length: area }, (_, i) => <div key={`a${i}`} className="lebar"><Tulang w="25%" h={11} /><Tulang h={84} r={10} /></div>)}
      </div>
    </div>
  );
}
