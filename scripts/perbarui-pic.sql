-- Tetapkan PIC proyek:
--   RIZKY DELIANNGI  : B.2.1, B.2.2, B.2.3, B.2.4, B.2.10, B.2.11, B.2.12, B.2.13
--   Muhammad Fajrin  : B.1.1, B.3.2
-- PIC disimpan di master pics + project_pics (lihat migrasi master_pic), sama seperti form Ubah proyek:
-- relasi PIC lama dihapus, orang tersebut dijadikan satu-satunya PIC (utama), lalu projects.pic_id diisi akunnya
-- (null bila tidak punya akun). Aman dijalankan ulang.
-- Jalankan di SQL Editor Studio sebagai postgres. Bila nama tidak ditemukan tepat satu di master PIC,
-- atau ada kode proyek yang tidak ada, transaksi dibatalkan dan tidak ada yang tersimpan.

begin;

create function pg_temp.tetapkan_pic(p_pola text, p_kode text[]) returns void
language plpgsql as $$
declare
  v_pic pics;
  v_jumlah int;
  v_daftar text;
begin
  select count(*), string_agg(nama, '; ') into v_jumlah, v_daftar from pics where nama ~* p_pola;
  if v_jumlah <> 1 then
    raise exception 'PIC "%" ditemukan % kali di master PIC (%); harus tepat satu.', p_pola, v_jumlah, coalesce(v_daftar, '-');
  end if;
  select * into v_pic from pics where nama ~* p_pola;

  select string_agg(k, ', ') into v_daftar
  from unnest(p_kode) k where not exists (select 1 from projects where kode = k);
  if v_daftar is not null then raise exception 'Proyek tidak ditemukan: %', v_daftar; end if;

  delete from project_pics pp using projects p
  where p.id = pp.project_id and p.kode = any (p_kode) and pp.pic_id <> v_pic.id;
  insert into project_pics (project_id, pic_id, utama)
  select id, v_pic.id, true from projects where kode = any (p_kode)
  on conflict (project_id, pic_id) do update set utama = true;

  update projects set pic_id = v_pic.profile_id where kode = any (p_kode);
end;
$$;

select pg_temp.tetapkan_pic('ri[sz]k?y', array['B.2.1', 'B.2.2', 'B.2.3', 'B.2.4', 'B.2.10', 'B.2.11', 'B.2.12', 'B.2.13']);
select pg_temp.tetapkan_pic('fajr?in', array['B.1.1', 'B.3.2']);

commit;

select p.kode, p.nama,
       (select string_agg(x.nama || case when pp.utama then ' (utama)' else '' end, ', ' order by pp.utama desc, x.nama)
        from project_pics pp join pics x on x.id = pp.pic_id where pp.project_id = p.id) as pic
from projects p
where p.kode like 'B.%' order by string_to_array(substr(p.kode, 3), '.')::int[];
