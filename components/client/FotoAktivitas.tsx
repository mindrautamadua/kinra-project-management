'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { hapusFotoKegiatan, ubahKeteranganFoto, unggahFoto, type HasilUnggah } from '@/app/(app)/proyek/actions-foto';

const SISI_MAKS = 1600;

// Perkecil foto di browser (sisi terpanjang 1600 px, JPEG) agar unggahan ringan dan tetap tajam saat dicetak.
async function perkecil(f: File): Promise<File> {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
  const skala = Math.min(1, SISI_MAKS / Math.max(bmp.width, bmp.height));
  const kanvas = document.createElement('canvas');
  kanvas.width = Math.round(bmp.width * skala);
  kanvas.height = Math.round(bmp.height * skala);
  kanvas.getContext('2d')!.drawImage(bmp, 0, 0, kanvas.width, kanvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>(r => kanvas.toBlob(r, 'image/jpeg', 0.82));
  return blob ? new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f;
}

// Tanggal pengambilan dari EXIF (DateTimeOriginal, cadangan DateTime) pada JPEG asli, sebelum diperkecil
// (kanvas membuang EXIF). Mengembalikan 'YYYY-MM-DD' atau '' bila tidak ada; PNG/WebP umumnya tanpa EXIF.
async function tanggalExif(f: File): Promise<string> {
  try {
    const v = new DataView(await f.slice(0, 256 * 1024).arrayBuffer());
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return '';
    let o = 2;
    while (o + 4 <= v.byteLength) {
      const marker = v.getUint16(o), len = v.getUint16(o + 2);
      if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return bacaTiff(v, o + 10);
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return '';
      o += 2 + len;
    }
  } catch { /* berkas rusak atau tidak terbaca: isi manual */ }
  return '';
}

function bacaTiff(v: DataView, t: number): string {
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o: number) => v.getUint16(t + o, le), u32 = (o: number) => v.getUint32(t + o, le);
  const cari = (ifd: number, tag: number) => {
    const n = u16(ifd);
    for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return u32(e + 8); }
    return null;
  };
  const teks = (o: number | null) => {
    if (o === null) return '';
    const s = Array.from({ length: 10 }, (_, i) => String.fromCharCode(v.getUint8(t + o + i))).join('');
    return /^\d{4}:\d{2}:\d{2}$/.test(s) && !s.startsWith('0000') ? s.replaceAll(':', '-') : '';
  };
  const ifd0 = u32(4);
  const exif = cari(ifd0, 0x8769);
  return (exif !== null && teks(cari(exif, 0x9003))) || teks(cari(ifd0, 0x0132));
}

type Foto = { id: string; url: string | null; keterangan: string | null; bisaUbah: boolean; tanggal: string };

// Unggah foto kegiatan dari baris aktivitas di form update mingguan, dengan keterangan dan tanggal pelaksanaan per foto.
// Foto biasanya diunggah sekaligus tiap Jumat padahal diambil di hari berbeda, jadi tanggal diisi per foto
// (otomatis dari EXIF kamera bila ada, selebihnya diisi pengguna).
// Berada di dalam form update, jadi isiannya tanpa atribut name (tidak ikut terkirim) dan dikirim lewat tombolnya sendiri.
export default function FotoAktivitas({ projectId, activityId, nama, hariIni, foto }: {
  projectId: string; activityId: string; nama: string; hariIni: string; foto: Foto[];
}) {
  const berkas = useRef<HTMLInputElement>(null);
  const [pilihan, setPilihan] = useState<{ file: File; pratinjau: string; ket: string; tgl: string; exif: boolean }[]>([]);
  const [hasil, setHasil] = useState<HasilUnggah | null>(null);
  const [proses, mulai] = useTransition();

  useEffect(() => () => pilihan.forEach(p => URL.revokeObjectURL(p.pratinjau)), [pilihan]);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    setHasil(null);
    const daftar = [...(e.target.files ?? [])];
    setPilihan(await Promise.all(daftar.map(async file => {
      const t = await tanggalExif(file);
      const sah = !!t && t <= hariIni;
      return { file, pratinjau: URL.createObjectURL(file), ket: '', tgl: sah ? t : '', exif: sah };
    })));
  }
  const ubah = (i: number, isi: Partial<{ ket: string; tgl: string; exif: boolean }>) => setPilihan(l => l.map((x, j) => (j === i ? { ...x, ...isi } : x)));

  function unggah() {
    if (pilihan.length === 0) { setHasil({ ok: false, pesan: 'Pilih minimal satu foto.' }); return; }
    const kosong = pilihan.findIndex(p => !p.tgl);
    if (kosong >= 0) { setHasil({ ok: false, pesan: `Isi tanggal pelaksanaan foto ${kosong + 1}.` }); document.getElementById(`tgl-${activityId}-${kosong}`)?.focus(); return; }
    mulai(async () => {
      setHasil(null);
      try {
        const data = new FormData();
        data.set('project_id', projectId);
        data.set('activity_id', activityId);
        for (const p of pilihan) { data.append('foto', await perkecil(p.file)); data.append('keterangan', p.ket); data.append('tanggal', p.tgl); }
        const h = await unggahFoto(data);
        setHasil(h);
        if (h.ok) { setPilihan([]); if (berkas.current) berkas.current.value = ''; }
      } catch (err) {
        setHasil({ ok: false, pesan: `Foto gagal diproses: ${err instanceof Error ? err.message : String(err)}` });
      }
    });
  }

  return (
    <div className="foto-aktivitas">
      {foto.length > 0 && (
        <div className="foto-mini">
          {foto.slice(0, 4).map(f => f.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.keterangan ?? 'Foto kegiatan'} title={f.keterangan ?? ''} /></a>
          ))}
          {foto.length > 4 && <span className="muted small">+{foto.length - 4}</span>}
        </div>
      )}
      <details>
        <summary className="btn-mini"><Camera size={13} aria-hidden="true" /> {foto.length ? `${foto.length} foto · tambah/ubah` : 'Tambah foto'}</summary>
        <div className="form-pica mini-form">
          {foto.length > 0 && <div className="small muted">Keterangan foto yang sudah diunggah</div>}
          {foto.map(f => <KeteranganFoto key={f.id} f={f} projectId={projectId} hariIni={hariIni} />)}
          <div className="small muted">Unggah foto baru</div>
          <span className="small muted">Tanggal pelaksanaan diisi per foto, bukan tanggal unggah. Tanggal dari kamera terisi otomatis bila tersedia.</span>
          <input ref={berkas} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pilih} aria-label={`Foto ${nama}`} />
          {pilihan.map((p, i) => (
            <div key={p.pratinjau} className="foto-ket">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.pratinjau} alt="" />
              <div>
                <textarea rows={2} value={p.ket} placeholder="Keterangan foto ini" aria-label={`Keterangan foto ${i + 1}`}
                  onChange={e => ubah(i, { ket: e.target.value })} />
                <label className="small">Tanggal pelaksanaan{p.exif ? <span className="muted"> · dari kamera</span> : <span className="flag"> · wajib diisi</span>}
                  <input id={`tgl-${activityId}-${i}`} type="date" required value={p.tgl} max={hariIni} aria-label={`Tanggal pelaksanaan foto ${i + 1}`}
                    onChange={e => ubah(i, { tgl: e.target.value, exif: false })} />
                </label>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={unggah} disabled={proses || pilihan.length === 0}>
            {proses && <Loader2 size={14} className="spin" aria-hidden="true" />}{proses ? 'Mengunggah…' : `Unggah${pilihan.length ? ` ${pilihan.length} foto` : ''}`}
          </button>
          {hasil && <span className={`small ${hasil.ok ? 'muted' : 'flag'}`} role="status">{hasil.pesan}</span>}
        </div>
      </details>
    </div>
  );
}

function KeteranganFoto({ f, projectId, hariIni }: { f: Foto; projectId: string; hariIni: string }) {
  const [ket, setKet] = useState(f.keterangan ?? '');
  const [tanggal, setTanggal] = useState(f.tanggal);
  const [hasil, setHasil] = useState<HasilUnggah | null>(null);
  const [proses, mulai] = useTransition();
  const berubah = ket !== (f.keterangan ?? '') || tanggal !== f.tanggal;
  return (
    <div className="foto-ket">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {f.url ? <img src={f.url} alt="" /> : <span className="foto-hilang" />}
      <div>
        <textarea rows={2} value={ket} disabled={!f.bisaUbah} placeholder="Keterangan foto ini" aria-label="Keterangan foto"
          onChange={e => { setKet(e.target.value); setHasil(null); }} />
        <input type="date" value={tanggal} max={hariIni} disabled={!f.bisaUbah} aria-label="Tanggal pelaksanaan kegiatan" title="Tanggal pelaksanaan kegiatan"
          onChange={e => { setTanggal(e.target.value); setHasil(null); }} />
        {f.bisaUbah && (
          <div className="foto-ket-aksi">
            {berubah && (
              <button type="button" className="btn-mini" disabled={proses}
                onClick={() => mulai(async () => setHasil(await ubahKeteranganFoto(f.id, ket, projectId, tanggal)))}>
                Simpan
              </button>
            )}
            <button type="button" className="btn-mini btn-hapus" disabled={proses}
              onClick={() => { if (confirm('Hapus foto ini? Foto yang dihapus tidak dapat dikembalikan.')) mulai(async () => setHasil(await hapusFotoKegiatan(f.id, projectId))); }}>
              <Trash2 size={12} aria-hidden="true" /> Hapus foto
            </button>
            {proses && <Loader2 size={13} className="spin" aria-hidden="true" />}
          </div>
        )}
        {hasil && <span className={`small ${hasil.ok ? 'muted' : 'flag'}`}> {hasil.pesan}</span>}
      </div>
    </div>
  );
}
