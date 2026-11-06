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

type Foto = { id: string; url: string | null; keterangan: string | null; bisaUbah: boolean; tanggal: string };

// Unggah foto kegiatan dari baris aktivitas di form update mingguan, dengan keterangan per foto.
// Berada di dalam form update, jadi isiannya tanpa atribut name (tidak ikut terkirim) dan dikirim lewat tombolnya sendiri.
export default function FotoAktivitas({ projectId, activityId, nama, hariIni, tanggalAwal, foto }: {
  projectId: string; activityId: string; nama: string; hariIni: string; tanggalAwal: string; foto: Foto[];
}) {
  const berkas = useRef<HTMLInputElement>(null);
  const tanggal = useRef<HTMLInputElement>(null);
  const [pilihan, setPilihan] = useState<{ file: File; pratinjau: string; ket: string }[]>([]);
  const [hasil, setHasil] = useState<HasilUnggah | null>(null);
  const [proses, mulai] = useTransition();

  useEffect(() => () => pilihan.forEach(p => URL.revokeObjectURL(p.pratinjau)), [pilihan]);

  function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    setHasil(null);
    setPilihan([...(e.target.files ?? [])].map(file => ({ file, pratinjau: URL.createObjectURL(file), ket: '' })));
  }

  function unggah() {
    if (pilihan.length === 0) { setHasil({ ok: false, pesan: 'Pilih minimal satu foto.' }); return; }
    if (!tanggal.current?.value) { setHasil({ ok: false, pesan: 'Isi tanggal pelaksanaan kegiatan pada foto.' }); tanggal.current?.focus(); return; }
    mulai(async () => {
      setHasil(null);
      try {
        const data = new FormData();
        data.set('project_id', projectId);
        data.set('activity_id', activityId);
        data.set('tanggal', tanggal.current?.value ?? '');
        for (const p of pilihan) { data.append('foto', await perkecil(p.file)); data.append('keterangan', p.ket); }
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
          {foto.map(f => <KeteranganFoto key={f.id} f={f} projectId={projectId} />)}
          <div className="small muted">Unggah foto baru</div>
          <label className="small">Tanggal pelaksanaan kegiatan (bukan tanggal unggah)
            <input ref={tanggal} type="date" defaultValue={tanggalAwal} max={hariIni} aria-label={`Tanggal pelaksanaan kegiatan ${nama}`} />
          </label>
          <input ref={berkas} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pilih} aria-label={`Foto ${nama}`} />
          {pilihan.map((p, i) => (
            <div key={p.pratinjau} className="foto-ket">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.pratinjau} alt="" />
              <textarea rows={2} value={p.ket} placeholder="Keterangan foto ini" aria-label={`Keterangan foto ${i + 1}`}
                onChange={e => setPilihan(l => l.map((x, j) => (j === i ? { ...x, ket: e.target.value } : x)))} />
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

function KeteranganFoto({ f, projectId }: { f: Foto; projectId: string }) {
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
        <input type="date" value={tanggal} disabled={!f.bisaUbah} aria-label="Tanggal pelaksanaan kegiatan" title="Tanggal pelaksanaan kegiatan"
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
