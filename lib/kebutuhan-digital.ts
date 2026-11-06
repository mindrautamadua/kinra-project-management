// Ringkasan hasil Digitalization Needs Assessment 2026 (aplikasi pendataan B.1.1), diolah dari
// sumber-data/kinra-laporan-kebutuhan-2026-10-30.pdf. Data statis: perbarui bila laporan kebutuhan dicetak ulang.
// "proyek" memetakan kebutuhan ke proyek Project Hub; "cakupan" menilai seberapa jauh lingkup proyek itu menjawabnya.

export type Urgensi = 'tinggi' | 'sedang';
export type Cakupan = 'tercakup' | 'sebagian' | 'belum';

export interface Kebutuhan {
  kode: string;
  judul: string;
  masalah: string;
  urgensi: Urgensi;
  cakupan: Cakupan;
  proyek?: string;
  catatan?: string;
}

export interface BagianKebutuhan {
  bagian: string;
  singkat: string;
  kebutuhan: Kebutuhan[];
}

export const SUMBER_KEBUTUHAN = {
  judul: 'Laporan Kebutuhan Digital (Needs Assessment 2026)',
  tanggal: '2026-10-30',
  status: 'Seluruh kebutuhan masih Submitted, belum dinilai atau diberi skor.',
};

export const KEBUTUHAN_DIGITAL: BagianKebutuhan[] = [
  {
    bagian: 'Bagian SDM, Umum dan Pengadaan',
    singkat: 'SDM, Umum & Pengadaan',
    kebutuhan: [
      { kode: 'DNA-2026-0005', judul: 'Aplikasi SDM terintegrasi (slip gaji otomatis)', masalah: 'Slip gaji dihitung di Excel lalu dikirim lewat email satu per satu; sering terlambat.', urgensi: 'tinggi', cakupan: 'belum' },
      { kode: 'DNA-2026-0007', judul: 'Pengajuan Surat Perjalanan Dinas', masalah: 'Pengajuan dan bukti kunjungan masih hardcopy dan stempel basah, ±40 permintaan.', urgensi: 'tinggi', cakupan: 'belum' },
      { kode: 'DNA-2026-0008', judul: 'Performance management system (KPI)', masalah: 'Penetapan dan monitoring KPI manual di Google Sheet; dasar tunjangan kinerja.', urgensi: 'tinggi', cakupan: 'belum' },
      { kode: 'DNA-2026-0010', judul: 'Rekapitulasi pertanggungjawaban dana kerja', masalah: 'Bukti transaksi dikumpulkan manual, berisiko tercecer dan tidak terekap.', urgensi: 'tinggi', cakupan: 'belum' },
      { kode: 'DNA-2026-0009', judul: 'PKWT monitoring system', masalah: 'Masa kontrak tidak terpantau; pembuatan kontrak masih edit Word.', urgensi: 'sedang', cakupan: 'belum' },
    ],
  },
  {
    bagian: 'Bagian Keuangan dan Akuntansi',
    singkat: 'Keuangan & Akuntansi',
    kebutuhan: [
      { kode: 'DNA-2026-0018', judul: 'Dashboard monitoring hutang piutang', masalah: 'Saldo outstanding, aging, dan jatuh tempo direkap manual di Excel.', urgensi: 'tinggi', cakupan: 'sebagian', proyek: 'B.2.9' },
      { kode: 'DNA-2026-0017', judul: 'Dashboard keuangan harian', masalah: 'Posisi kas, bank, penerimaan, dan pengeluaran dikonsolidasi manual.', urgensi: 'sedang', cakupan: 'tercakup', proyek: 'B.2.9' },
      { kode: 'DNA-2026-0019', judul: 'Portal penyusunan RKAP', masalah: 'RKAP disusun di file Excel terpisah per bagian; rawan beda versi.', urgensi: 'sedang', cakupan: 'belum' },
      { kode: 'DNA-2026-0016', judul: 'Digitalisasi pembuatan invoice', masalah: 'Invoice dibuat manual di Excel; status dan dokumen pendukung sulit dilacak.', urgensi: 'sedang', cakupan: 'belum' },
    ],
  },
  {
    bagian: 'Bagian Mekanikal & Elektrikal, Fasilitas & Pengamanan',
    singkat: 'Mekanikal, Elektrikal, Fasilitas & Pengamanan',
    kebutuhan: [
      { kode: 'DNA-2026-0011', judul: 'Pencatatan kWh, lembur, dan stok sparepart', masalah: 'Pembacaan kWh manual menimbulkan losses pendapatan listrik; maintenance kurang termonitor.', urgensi: 'tinggi', cakupan: 'sebagian', proyek: 'B.2.5', catatan: 'kWh tercakup; lembur, sparepart, preventive maintenance belum' },
      { kode: 'DNA-2026-0013', judul: 'Check sheet, laporan pekerjaan, dan EAP', masalah: 'Check sheet ditulis tangan H+1; KM dan BBM kendaraan direkap admin.', urgensi: 'sedang', cakupan: 'tercakup', proyek: 'B.2.5' },
    ],
  },
  {
    bagian: 'Bagian Sekretariat Perusahaan, Hukum, Humas dan TJS',
    singkat: 'Sekretariat Perusahaan',
    kebutuhan: [
      { kode: 'DNA-2026-0014', judul: 'Digitalisasi pemakaian ruang rapat', masalah: 'Pemesanan lewat WhatsApp; jadwal ruang rapat bentrok.', urgensi: 'tinggi', cakupan: 'tercakup', proyek: 'B.2.7' },
      { kode: 'DNA-2026-0015', judul: 'Kalender perusahaan digital', masalah: 'Agenda mingguan dibagikan lewat spreadsheet dan grup; sering miskomunikasi.', urgensi: 'tinggi', cakupan: 'tercakup', proyek: 'B.2.8' },
    ],
  },
  {
    bagian: 'Bagian Pemasaran & Penjualan',
    singkat: 'Pemasaran & Penjualan',
    kebutuhan: [
      { kode: 'DNA-2026-0012', judul: 'Aplikasi tenant "HelloKinra"', masalah: 'Informasi dan keluhan tenant tersebar di surat, telepon, dan grup WhatsApp tanpa tiket.', urgensi: 'sedang', cakupan: 'belum', catatan: 'Penggunanya lebih dari 100 orang, jadi kebutuhan tenant perlu digali dulu sebelum aplikasinya dibuat' },
    ],
  },
];

