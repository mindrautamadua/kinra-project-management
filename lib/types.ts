export type Kesehatan = 'selesai' | 'belum_mulai' | 'sesuai' | 'data_belum_lengkap' | 'waspada' | 'terlambat' | 'kritis';
export type Peran = 'admin' | 'direksi' | 'kabag' | 'kasubag' | 'pic' | 'anggota' | 'pembaca';

export interface ProyekKesehatan {
  id: string; kode: string; nama: string; status: string;
  org_unit_id: string; unit_kode: string; unit_nama: string;
  pic_id: string | null; pic_nama: string;
  tanggal_mulai: string | null; tanggal_selesai: string | null; tanggal_selesai_baseline: string | null;
  versi_baseline: number | null;
  progres_rencana: number | null; progres_aktual: number | null; spi: number | null;
  status_kesehatan: Kesehatan | null; ada_override: boolean;
  update_terakhir: string | null; status_update_terakhir: string | null;
  masalah_terbuka: number; aksi_terlambat: number; dukungan_menunggu: number; ketergantungan_terbuka: number;
}

export interface Pic {
  id: string; nama: string; jabatan: string | null; org_unit_id: string | null; email: string | null;
  profile_id: string | null; aktif: boolean;
}

// Sasaran strategis dari RJPP/RKAP/KPI; dipilih per proyek di form charter.
export interface Sasaran {
  id: string; tahun: number; sumber: 'rjpp' | 'rkap' | 'kpi'; kode: string; nama: string;
  pilar: string | null; uraian: string | null; urutan: number; aktif: boolean;
}

export interface Periode { id: string; label: string; tanggal_mulai: string; tanggal_akhir: string; batas_input: string }

export interface Aktivitas {
  id: string; urutan: number; nama: string; bobot: number; pic_id: string | null;
  rencana_mulai: string | null; rencana_selesai: string | null;
  aktual_mulai: string | null; aktual_selesai: string | null;
  progres: number; status: 'belum_mulai' | 'berjalan' | 'selesai' | 'dibatalkan'; milestone: boolean;
  deliverable: string | null;
}

export interface UpdateMingguan {
  id: string; project_id: string; period_id: string; status: string;
  sudah_dilakukan: string | null; rencana_berikut: string | null;
  progres_rencana: number | null; progres_aktual: number | null; spi: number | null;
  status_kesehatan: Kesehatan | null; status_override: Kesehatan | null; alasan_override: string | null;
  catatan_reviewer: string | null; diajukan_at: string | null;
}

export interface Masalah {
  id: string; jenis: 'masalah' | 'risiko'; judul: string; dampak: string | null; akar_masalah: string | null;
  keparahan: string; kemungkinan: number | null; skor_dampak: number | null; status: string; owner_id: string;
  actions: { id: string; deskripsi: string; owner_id: string; tanggal_target: string; status: string }[];
}

export interface FotoKegiatan {
  id: string; activity_id: string; storage_path: string; nama_file: string;
  keterangan: string | null; tanggal_kegiatan: string | null; diunggah_oleh: string; created_at: string;
  url: string | null;
}
