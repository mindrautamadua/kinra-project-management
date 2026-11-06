import 'server-only';
import { supabase } from './supabase/server';
import type { FotoKegiatan } from './types';

export const BUCKET_LAMPIRAN = 'lampiran';

// Foto kegiatan untuk sekumpulan aktivitas, urut tanggal kegiatan, dengan signed URL (berlaku 2 jam, cukup untuk cetak).
export async function muatFoto(aktivitasIds: string[]): Promise<FotoKegiatan[]> {
  if (aktivitasIds.length === 0) return [];
  const sb = await supabase();
  // Laporan memuat ratusan aktivitas: daftar id sepanjang itu melewati batas panjang URL (HTTP 414) di gateway.
  // Untuk daftar panjang, ambil semua foto aktivitas lalu saring di sini (jumlah fotonya kecil).
  const banyak = aktivitasIds.length > 40;
  let kueri = sb.from('attachments')
    .select('id,entitas_id,storage_path,nama_file,keterangan,tanggal_kegiatan,diunggah_oleh,created_at')
    .eq('entitas', 'activity');
  if (!banyak) kueri = kueri.in('entitas_id', aktivitasIds);
  const { data, error } = await kueri.order('tanggal_kegiatan', { ascending: true, nullsFirst: false }).order('created_at');
  if (error) throw new Error(`attachments: ${error.message}`);
  const ids = new Set(aktivitasIds);
  const baris = (data ?? []).filter(b => ids.has(b.entitas_id));
  if (baris.length === 0) return [];
  const { data: url } = await sb.storage.from(BUCKET_LAMPIRAN).createSignedUrls(baris.map(b => b.storage_path), 60 * 60 * 2);
  const peta = new Map((url ?? []).map(u => [u.path, u.signedUrl]));
  return baris.map(({ entitas_id, ...b }) => ({ ...b, activity_id: entitas_id, url: peta.get(b.storage_path) ?? null }));
}
