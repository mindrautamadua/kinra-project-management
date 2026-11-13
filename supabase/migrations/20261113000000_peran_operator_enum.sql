-- Peran baru Operator: menginput realisasi dan capaian mingguan proyek pada unitnya.
-- Nilai enum harus di-commit sebelum dipakai, jadi dipisah dari 20261113010000_peran_operator.sql.
-- Jalankan file ini dulu (sendiri), baru file berikutnya.

alter type app_role add value if not exists 'operator';
