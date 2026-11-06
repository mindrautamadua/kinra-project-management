'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';

const teks = (form: FormData, k: string) => String(form.get(k) ?? '').trim() || null;
const angkaId = (v: string | null) => (v == null ? null : Number(v.replace(/\./g, '').replace(',', '.')));

const ke = (id: string, p: { ok?: string; galat?: string }): never => {
  revalidatePath(`/proyek/${id}`, 'layout');
  revalidatePath('/');
  redirect(`/proyek/${id}/ubah?${new URLSearchParams(p as Record<string, string>)}#${p.galat ? 'pesan' : 'atas'}`);
};

// Field charter yang sama untuk buat dan ubah.
function identitas(form: FormData) {
  return {
    nama: teks(form, 'nama'),
    sponsor_id: teks(form, 'sponsor_id'),
    tanggal_mulai: teks(form, 'tanggal_mulai'),
    tanggal_selesai: teks(form, 'tanggal_selesai'),
    tujuan: teks(form, 'tujuan'),
    manfaat: teks(form, 'manfaat'),
    ruang_lingkup: teks(form, 'ruang_lingkup'),
    di_luar_lingkup: teks(form, 'di_luar_lingkup'),
    deliverable: teks(form, 'deliverable'),
    kriteria_selesai: teks(form, 'kriteria_selesai'),
    anggaran_rp_juta: angkaId(teks(form, 'anggaran_rp_juta')),
  };
}

// PIC dari master: tulis ulang relasi project_pics, lalu salin akun PIC utama ke projects.pic_id
// (dipakai untuk kompatibilitas; hak ubah proyek juga dihitung dari semua PIC yang punya akun).
const picDipilih = (form: FormData) => [...new Set(form.getAll('pic_ids').map(String).filter(Boolean))];

async function simpanPic(projectId: string, form: FormData): Promise<string | null> {
  const ids = picDipilih(form);
  const pilihUtama = teks(form, 'pic_utama');
  const utama = pilihUtama && ids.includes(pilihUtama) ? pilihUtama : ids[0];
  const sb = await supabase();
  // Urutan: lepas tanda utama, simpan pilihan, baru hapus yang tidak dipilih. Menghapus lebih dulu dapat mencabut
  // hak ubah PIC yang sedang menyimpan (hak itu dihitung dari project_pics) sebelum pilihannya tersimpan.
  const { error: eLepas } = await sb.from('project_pics').update({ utama: false }).eq('project_id', projectId);
  if (eLepas) return eLepas.message;
  const { error } = await sb.from('project_pics')
    .upsert(ids.map(pic_id => ({ project_id: projectId, pic_id, utama: pic_id === utama })), { onConflict: 'project_id,pic_id' });
  if (error) return error.message;
  const { error: eHapus } = await sb.from('project_pics').delete().eq('project_id', projectId).not('pic_id', 'in', `(${ids.join(',')})`);
  if (eHapus) return eHapus.message;
  const { data: akun } = await sb.from('pics').select('profile_id').eq('id', utama).single();
  const { error: eProyek } = await sb.from('projects').update({ pic_id: akun?.profile_id ?? null }).eq('id', projectId);
  return eProyek?.message ?? null;
}

// Sasaran strategis: tulis ulang relasi project_objectives sesuai centang di form.
// Hanya dijalankan bila form memuat bagian sasaran, agar form lain tidak mengosongkannya.
async function simpanSasaran(projectId: string, form: FormData): Promise<string | null> {
  if (!form.has('sasaran_form')) return null;
  const ids = [...new Set(form.getAll('sasaran_ids').map(String).filter(Boolean))];
  const sb = await supabase();
  if (ids.length) {
    const { error } = await sb.from('project_objectives')
      .upsert(ids.map(objective_id => ({ project_id: projectId, objective_id })), { onConflict: 'project_id,objective_id', ignoreDuplicates: true });
    if (error) return error.message;
  }
  let hapus = sb.from('project_objectives').delete().eq('project_id', projectId);
  if (ids.length) hapus = hapus.not('objective_id', 'in', `(${ids.join(',')})`);
  const { error } = await hapus;
  return error?.message ?? null;
}

// Kode = kode unit + nomor urut berikutnya (A.1 → A.1.7), sesuai FR-11.
async function kodeBerikut(unitId: string) {
  const sb = await supabase();
  const { data: unit } = await sb.from('org_units').select('kode').eq('id', unitId).single();
  const { data: ada } = await sb.from('projects').select('kode').like('kode', `${unit!.kode}.%`);
  const maks = Math.max(0, ...(ada ?? []).map(p => Number(p.kode.slice(unit!.kode.length + 1))).filter(Number.isInteger));
  return `${unit!.kode}.${maks + 1}`;
}

export async function buatProyek(form: FormData) {
  const unitId = String(form.get('org_unit_id'));
  const sb = await supabase();
  const data = identitas(form);
  if (!data.nama || picDipilih(form).length === 0) redirect(`/proyek/baru?galat=${encodeURIComponent('Nama proyek dan minimal satu PIC wajib diisi.')}`);
  const { data: baru, error } = await sb.from('projects')
    .insert({ ...data, org_unit_id: unitId, kode: await kodeBerikut(unitId), status: 'draf' })
    .select('id').single();
  if (error) redirect(`/proyek/baru?galat=${encodeURIComponent(error.message.includes('row-level security') ? 'Anda tidak berwenang membuat proyek di unit ini.' : error.message)}`);
  const galatPic = await simpanPic(baru!.id, form);
  const galatSasaran = await simpanSasaran(baru!.id, form);
  ke(baru!.id, galatPic ? { galat: `Proyek dibuat, tetapi PIC gagal disimpan: ${galatPic}` }
    : galatSasaran ? { galat: `Proyek dibuat, tetapi sasaran strategis gagal disimpan: ${galatSasaran}` } : { ok: 'Proyek dibuat sebagai Draf. Tambahkan aktivitas, lalu aktifkan.' });
}

export async function simpanIdentitas(form: FormData) {
  const id = String(form.get('id'));
  if (picDipilih(form).length === 0) ke(id, { galat: 'Pilih minimal satu PIC.' });
  const sb = await supabase();
  const unitBaru = teks(form, 'org_unit_id');
  const { data: lama } = await sb.from('projects').select('org_unit_id').eq('id', id).single();
  const pindah = !!unitBaru && unitBaru !== lama?.org_unit_id;
  // Pindah unit: kode ikut unit baru (FR-11); PICA dan permintaan dukungan proyek ikut pindah.
  const { error } = await sb.from('projects')
    .update({ ...identitas(form), ...(pindah && { org_unit_id: unitBaru, kode: await kodeBerikut(unitBaru!) }) })
    .eq('id', id);
  if (!error && pindah) {
    await sb.from('issues').update({ org_unit_id: unitBaru }).eq('project_id', id);
    await sb.from('support_requests').update({ org_unit_id: unitBaru }).eq('project_id', id);
  }
  const galat = error?.message ?? await simpanPic(id, form) ?? await simpanSasaran(id, form);
  ke(id, galat ? { galat } : { ok: pindah ? 'Charter tersimpan. Proyek pindah unit dan mendapat kode baru.' : 'Charter tersimpan.' });
}

// Simpan semua baris aktivitas sekaligus: ubah yang ada, hapus/batalkan yang dicentang, tambah baris baru.
export async function simpanAktivitas(form: FormData) {
  const id = String(form.get('id'));
  const draf = form.get('status_proyek') === 'draf';
  const sb = await supabase();
  for (const aid of String(form.get('ids') ?? '').split(',').filter(Boolean)) {
    if (form.get(`hapus_${aid}`)) {
      const { error } = draf
        ? await sb.from('activities').delete().eq('id', aid)
        : await sb.from('activities').update({ status: 'dibatalkan' }).eq('id', aid);
      if (error) ke(id, { galat: error.message });
      continue;
    }
    const { error } = await sb.from('activities').update({
      urutan: Number(form.get(`urutan_${aid}`)) || 1,
      nama: teks(form, `nama_${aid}`) ?? '(tanpa nama)',
      bobot: angkaId(teks(form, `bobot_${aid}`)) ?? 1,
      rencana_mulai: teks(form, `mulai_${aid}`),
      rencana_selesai: teks(form, `selesai_${aid}`),
      pic_id: teks(form, `pic_${aid}`),
      milestone: form.get(`milestone_${aid}`) === 'on',
      deliverable: teks(form, `deliverable_${aid}`),
    }).eq('id', aid);
    if (error) ke(id, { galat: error.message });
  }
  const baru = [];
  for (let i = 0; form.has(`baru_nama_${i}`); i++) {
    const nama = teks(form, `baru_nama_${i}`);
    if (!nama) continue;
    baru.push({
      project_id: id, nama,
      urutan: Number(form.get(`baru_urutan_${i}`)) || 99,
      bobot: angkaId(teks(form, `baru_bobot_${i}`)) ?? 1,
      rencana_mulai: teks(form, `baru_mulai_${i}`),
      rencana_selesai: teks(form, `baru_selesai_${i}`),
      pic_id: teks(form, `baru_pic_${i}`),
      milestone: form.get(`baru_milestone_${i}`) === 'on',
      deliverable: teks(form, `baru_deliverable_${i}`),
    });
  }
  if (baru.length) {
    const { error } = await sb.from('activities').insert(baru);
    if (error) ke(id, { galat: error.message });
  }
  if (!draf && form.get('jadikan_baseline')) {
    const { error } = await sb.rpc('fn_ajukan_baseline', { p_project: id, p_alasan: teks(form, 'alasan_baseline') ?? '' });
    if (error) ke(id, { galat: `Aktivitas tersimpan, tetapi baseline belum diperbarui: ${error.message}` });
    ke(id, { ok: 'Aktivitas tersimpan dan menjadi baseline baru.' });
  }
  ke(id, { ok: draf ? 'Aktivitas tersimpan.' : 'Aktivitas tersimpan sebagai rencana kerja. Status tetap dihitung terhadap baseline lama sampai baseline diperbarui.' });
}

export async function ubahStatus(form: FormData) {
  const id = String(form.get('id'));
  const status = String(form.get('status'));
  const sb = await supabase();
  const { error } = await sb.from('projects').update({ status }).eq('id', id);
  const pesan: Record<string, string> = {
    aktif: 'Proyek diaktifkan. Baseline v1 dikunci dan proyek masuk laporan mingguan.',
    selesai: 'Proyek ditutup sebagai Selesai.', ditunda: 'Proyek ditunda.', dibatalkan: 'Proyek dibatalkan.',
  };
  ke(id, error ? { galat: error.message } : { ok: pesan[status] });
}

// Baseline baru langsung berlaku (tanpa persetujuan Kabag); alasan wajib dan versi lama tetap tersimpan.
export async function perbaruiBaseline(form: FormData) {
  const id = String(form.get('id'));
  const sb = await supabase();
  const { error } = await sb.rpc('fn_ajukan_baseline', { p_project: id, p_alasan: teks(form, 'alasan') ?? '' });
  ke(id, error ? { galat: error.message } : { ok: 'Baseline baru berlaku. Status proyek kini dihitung terhadap rencana terbaru.' });
}

export async function hapusProyek(form: FormData) {
  const id = String(form.get('id'));
  const kode = String(form.get('kode'));
  if (teks(form, 'konfirmasi') !== kode) ke(id, { galat: `Ketik kode proyek "${kode}" persis untuk mengonfirmasi penghapusan.` });
  const sb = await supabase();
  const { error } = await sb.rpc('fn_hapus_proyek', { p_project: id, p_alasan: teks(form, 'alasan') ?? '' });
  if (error) ke(id, { galat: error.message });
  revalidatePath('/', 'layout');
  redirect(`/proyek?status=semua&ok=${encodeURIComponent(`Proyek ${kode} dihapus. Isinya tetap tercatat di audit log.`)}`);
}
