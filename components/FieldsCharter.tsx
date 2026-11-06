import Link from 'next/link';
import type { DetailProyek } from '@/lib/data';
import type { Pic, Sasaran } from '@/lib/types';

// Field charter yang dipakai bersama oleh form buat proyek dan form ubah charter.
// PIC dipilih dari master PIC dan boleh lebih dari satu; salah satunya ditandai PIC utama.
// Sasaran strategis dipilih dari master sasaran (RJPP), dikelompokkan per pilar.
export default function FieldsCharter({ p, pics, terpilih = [], saya, sasaran = [], sasaranTerpilih = [] }: {
  p?: DetailProyek['proyek']; pics: Pic[]; terpilih?: DetailProyek['pics']; saya: string;
  sasaran?: Sasaran[]; sasaranTerpilih?: DetailProyek['sasaran'];
}) {
  // PIC lama yang sudah dinonaktifkan tetap tampil agar tidak hilang diam-diam saat disimpan.
  const pilihan = [...pics, ...terpilih.filter(t => !pics.some(x => x.id === t.id))];
  const dipilih = new Set(terpilih.length ? terpilih.map(t => t.id) : pics.filter(x => x.profile_id === saya).map(x => x.id));
  const utama = terpilih.find(t => t.utama)?.id ?? [...dipilih][0] ?? '';
  // Sponsor juga dari master PIC; sponsor lama yang nonaktif tetap muncul sebagai pilihan.
  const sponsor = p?.sponsor_id && !pics.some(x => x.id === p.sponsor_id) && p.sponsor
    ? [{ id: p.sponsor_id, nama: `${p.sponsor.nama} (nonaktif)`, jabatan: p.sponsor.jabatan }] : [];
  // Sasaran lama yang sudah dinonaktifkan tetap tampil agar tidak terlepas diam-diam saat disimpan.
  const opsiSasaran: Pick<Sasaran, 'id' | 'kode' | 'nama' | 'pilar' | 'aktif'>[] = [...sasaran, ...sasaranTerpilih.filter(t => !sasaran.some(x => x.id === t.id)).map(t => ({ ...t, aktif: false }))];
  const sasaranDipilih = new Set(sasaranTerpilih.map(t => t.id));
  const pilar = [...new Set(opsiSasaran.map(x => x.pilar ?? 'Lainnya'))];
  const opsiPic = [...pics, ...sponsor].map(x => <option key={x.id} value={x.id}>{x.nama}{x.jabatan ? ` · ${x.jabatan}` : ''}</option>);
  return (
    <>
      <label>Nama proyek<input name="nama" required defaultValue={p?.nama ?? ''} placeholder="Mis. Sertifikasi ISO 50001 (Sistem Manajemen Energi)" /></label>
      <div className="baris-form">
        <fieldset className="polos pilih-pic">
          <legend>PIC (penanggung jawab harian, boleh lebih dari satu)</legend>
          {pilihan.length === 0 && <p className="muted small">Master PIC masih kosong. <Link href="/pic">Tambah PIC</Link> terlebih dahulu.</p>}
          <div className="daftar-cek">
            {pilihan.map(x => (
              <label key={x.id} className="cek">
                <input type="checkbox" name="pic_ids" value={x.id} defaultChecked={dipilih.has(x.id)} />
                <span>{x.nama}{x.jabatan && <small className="muted"> · {x.jabatan}</small>}{!x.aktif && <small className="flag"> · nonaktif</small>}</span>
              </label>
            ))}
          </div>
          <label>PIC utama
            <select name="pic_utama" defaultValue={utama}>
              <option value="">Otomatis: PIC pertama yang dicentang</option>
              {pilihan.map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}
            </select>
          </label>
          <small className="muted"><Link href="/pic">Kelola master PIC</Link></small>
        </fieldset>
        <label>Sponsor (pejabat yang memutuskan)<select name="sponsor_id" defaultValue={p?.sponsor_id ?? ''}><option value="">Belum ditetapkan</option>{opsiPic}</select></label>
      </div>
      <div className="baris-form">
        <label>Tanggal mulai<input type="date" name="tanggal_mulai" defaultValue={p?.tanggal_mulai ?? ''} /></label>
        <label>Target selesai<input type="date" name="tanggal_selesai" defaultValue={p?.tanggal_selesai ?? ''} /></label>
      </div>
      <label>Tujuan — hasil bisnis yang ingin dicapai (1–2 kalimat)
        <textarea name="tujuan" rows={2} defaultValue={p?.tujuan ?? p?.deskripsi ?? ''} /></label>
      <label>Manfaat — dampak bagi perusahaan atau pengguna (satu per baris)
        <textarea name="manfaat" rows={3} defaultValue={p?.manfaat ?? ''} placeholder="Mis. Waktu pemesanan ruang rapat lebih singkat" /></label>
      <fieldset className="polos pilih-pic">
        <legend>Sasaran strategis RJPP yang didukung (boleh lebih dari satu)</legend>
        <input type="hidden" name="sasaran_form" value="1" />
        {opsiSasaran.length === 0 && <p className="muted small">Master sasaran strategis masih kosong. <Link href="/sasaran">Lihat master sasaran</Link>.</p>}
        <div className="daftar-cek daftar-sasaran">
          {pilar.map(g => [
            <span key={g} className="grup">{g}</span>,
            ...opsiSasaran.filter(x => (x.pilar ?? 'Lainnya') === g).map(x => (
              <label key={x.id} className="cek">
                <input type="checkbox" name="sasaran_ids" value={x.id} defaultChecked={sasaranDipilih.has(x.id)} />
                <span><b className="mono">{x.kode}</b> {x.nama}{!x.aktif && <small className="flag"> · nonaktif</small>}</span>
              </label>
            )),
          ])}
        </div>
        <small className="muted"><Link href="/sasaran">Lihat uraian sasaran strategis</Link></small>
      </fieldset>
      <div className="baris-form">
        <label>Ruang lingkup<textarea name="ruang_lingkup" rows={3} defaultValue={p?.ruang_lingkup ?? ''} /></label>
        <label>Di luar lingkup<textarea name="di_luar_lingkup" rows={3} defaultValue={p?.di_luar_lingkup ?? ''} placeholder="Pekerjaan yang tegas tidak termasuk" /></label>
      </div>
      <div className="baris-form">
        <label>Deliverable (satu per baris)<textarea name="deliverable" rows={3} defaultValue={p?.deliverable ?? ''} /></label>
        <label>Kriteria selesai<textarea name="kriteria_selesai" rows={3} defaultValue={p?.kriteria_selesai ?? ''} placeholder="Bukti yang menandakan proyek tuntas" /></label>
      </div>
      <label className="setengah">Anggaran (Rp juta, kosongkan bila tidak ada)<input name="anggaran_rp_juta" inputMode="decimal" defaultValue={p?.anggaran_rp_juta ?? ''} /></label>
    </>
  );
}
