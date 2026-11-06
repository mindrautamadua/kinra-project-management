-- Manfaat proyek: dampak yang diharapkan bagi perusahaan atau pengguna, satu poin per baris.
-- Tampil di kotak Tujuan pada charter. Tidak dihitung dalam kelengkapan charter.
alter table projects add column if not exists manfaat text;
