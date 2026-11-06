-- Deliverable per aktivitas: hasil/bukti yang diserahkan saat aktivitas selesai.
-- Isian deliverable proyek tetap dipakai sebagai ringkasan di charter.
alter table activities add column deliverable text;
comment on column activities.deliverable is 'Hasil atau bukti yang diserahkan aktivitas ini';
notify pgrst, 'reload schema';
