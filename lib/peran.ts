import type { Peran } from './types';

// Keterangan peran untuk halaman kelola pengguna. perluUnit: peran berlaku pada unit tertentu (dan unit turunannya).
export const PERAN: Record<Peran, { label: string; ket: string; perluUnit: boolean }> = {
  admin: { label: 'Admin', ket: 'Mengelola seluruh aplikasi, pengguna, dan periode laporan.', perluUnit: false },
  direksi: { label: 'Direksi', ket: 'Melihat seluruh portofolio dan menanggapi permintaan dukungan.', perluUnit: false },
  kabag: { label: 'Kabag', ket: 'Mengelola proyek, rencana kerja, dan baseline di unitnya.', perluUnit: true },
  kasubag: { label: 'Kasubag', ket: 'Mengelola proyek, rencana kerja, dan baseline di unitnya.', perluUnit: true },
  pic: { label: 'PIC', ket: 'Penanggung jawab proyek; hak ubah per proyek diberikan lewat Master PIC. Dapat membuat proyek baru di unitnya dan mengaktifkannya.', perluUnit: true },
  operator: { label: 'Operator', ket: 'Mengisi update mingguan, progres aktivitas, PICA, dan foto proyek di unitnya, serta membuat proyek baru (Draf). Tidak dapat mengubah charter, rencana kerja, atau baseline proyek yang sudah aktif.', perluUnit: true },
  anggota: { label: 'Anggota', ket: 'Anggota unit; melihat data dan menjadi pemilik masalah atau aksi.', perluUnit: true },
  pembaca: { label: 'Pembaca', ket: 'Hanya melihat.', perluUnit: false },
};
export const DAFTAR_PERAN = Object.keys(PERAN) as Peran[];
