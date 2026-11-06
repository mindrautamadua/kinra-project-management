-- Foto lama: tanggal_kegiatan dulu terisi otomatis dengan tanggal unggah, sehingga tidak mencerminkan tanggal pelaksanaan.
-- Kosongkan agar keterangan foto di lampiran memakai periode aktivitas sampai pengunggah mengisi tanggal yang benar.
-- Mulai sekarang tanggal pelaksanaan wajib diisi saat unggah, jadi tanggal yang sama dengan tanggal unggah dianggap sah.
update attachments
set tanggal_kegiatan = null
where entitas = 'activity'
  and tanggal_kegiatan = (created_at at time zone 'Asia/Jakarta')::date
  -- Batas: commit f264779, form unggah mulai mewajibkan tanggal.
  and created_at < timestamptz '2026-11-06 10:11:16+07';
