# Panduan UI/UX Aplikasi KINRA

Referensi gaya visual dan pola interaksi untuk aplikasi internal PT Kawasan Industri Nusantara (KINRA). Diturunkan dari **KINRA Performance Hub** (`about-kinra`) dan **Kinra Brand Identity Guideline (2022)**.

Tujuannya: aplikasi KINRA berikutnya terasa satu keluarga, tanpa harus menebak warna, ukuran, atau pola komponen.

> **Sumber kebenaran kode**: `app/globals.css` (token + komponen), `components/charts/tokens.ts` (warna grafik), `lib/format.ts` (format angka & status), `components/Chip.tsx`.

---

## 1. Prinsip

1. **Data dulu, dekorasi kemudian.** Angka utama besar dan jelas; elemen dekoratif (aurora, spotlight) selalu redup dan tidak bersaing dengan data.
2. **Warna tidak pernah berdiri sendiri.** Setiap status memakai ikon + label teks. Pengguna buta warna harus tetap paham.
3. **Satu sumber angka.** Semua angka diformat lewat helper yang sama (`angka`, `rupiah`, `persen`) agar pemisah ribuan, desimal, dan satuan konsisten.
4. **Bahasa Indonesia baku untuk UI.** Istilah teknis bisnis (SPJ, RJPP, RKAP, capex, opex) tetap seperti di dokumen sumber.
5. **Sebut sumber data.** Setiap kartu/section yang menampilkan angka menyebut dokumen asalnya di teks kecil (`.muted.small`).
6. **Gelap sebagai default, terang setara.** Kedua tema harus lolos uji kontras; jangan desain hanya untuk satu tema.

---

## 2. Identitas brand

### Warna identitas (dari guideline, jangan diubah)

| Nama | Hex | Pemakaian utama |
|---|---|---|
| Merah Kinra | `#f15a22` | Pilar 1 *Performance Driven*, aksen negatif/gap, penanda peringatan non-kritis |
| Jingga Kinra | `#fcaf17` | Pilar 3 *New Business Expansion*, highlight |
| Biru Kinra | `#32a3dc` | Pilar 2 *Stability & Growth*, data positif |
| Hijau Tosca | `#008187` | Warna institusi: header brand, tombol utama, bubble chat pengguna |
| Abu-abu | `#4d4d4f` | Teks netral pada materi cetak |

### Logo

- Simbol dan nama logo **selalu bersama**, jangan dipisah atau dipotong.
- Di atas Hijau Tosca: simbol tetap berwarna, nama logo **putih** (`public/brand/kinra-logo-tosca.png`).
- Di latar gelap lain: versi 1 warna putih (`public/brand/kinra-logo-putih.png`).
- Posisi standar: blok brand di pojok kiri atas sidebar, latar `var(--tosca)`, lebar logo 168px.

### Motif

Lingkaran bertumpuk (jingga, merah, biru, tosca) dari guideline. Di aplikasi dipakai sebagai:
- **Halaman login**: lingkaran solid di panel brand Tosca.
- **Latar dashboard**: "aurora" (radial-gradient blur 70px, opasitas 0,16–0,28) yang bergerak sangat lambat (30–40 detik).

---

## 3. Token desain

Semua warna dan ukuran dipakai lewat CSS custom property. **Jangan menulis hex langsung di komponen** kecuali untuk warna identitas di gradien.

### 3.1 Permukaan & tinta

| Token | Gelap (default) | Terang | Kegunaan |
|---|---|---|---|
| `--page` | `#041214` | `#eef3f3` | Latar halaman |
| `--surface` | `#0b1d20` | `#ffffff` | Kartu solid, header tabel sticky |
| `--surface-2` | `#10262a` | `#f3f7f7` | Input, segmented control, item list |
| `--surface-3` | `#163135` | `#e4eded` | Hover / item terpilih |
| `--ink` | `#eef6f6` | `#0f2629` | Teks utama, angka |
| `--ink-2` | `#c2d3d4` | `#34494c` | Teks sekunder, isi paragraf |
| `--muted` | `#86a0a2` | `#587073` | Label, keterangan, sumber |
| `--line` | rgba garis 8% | rgba garis 8% | Pemisah halus |
| `--line-2` | rgba garis 14% | rgba garis 14% | Border input & kontrol |
| `--brand` | `#3cc2c6` | `#00797e` | Aksen UI: fokus, menu aktif, ikon aktif (Tosca dicerahkan agar terbaca di gelap) |

Token pembantu transparansi: `--fg-rgb`, `--line-rgb`, `--shadow-rgb`, `--shadow-k`. Pakai sebagai `rgba(var(--fg-rgb), 0.04)` untuk tint hover yang otomatis benar di kedua tema.

### 3.2 Status

| Token | Gelap | Terang | Makna |
|---|---|---|---|
| `--good` | `#12b76a` | `#0e9258` | Tercapai (≥ 100%) |
| `--warn` | `#fab219` | `#b77b06` | Waspada (90–99%) |
| `--serious` | `#ec835a` | `#c95b2c` | Di bawah target (75–89%) |
| `--crit` | `#f04438` | `#d92d20` | Kritis (< 75%) |
| `--txt-good` / `--txt-bad` | `#6fd3a8` / `#ff8a80` | `#0b7a4a` / `#c4320a` | Teks naik/turun (versi kontras-aman untuk teks kecil) |

### 3.3 Data (grafik)

| Token | Nilai | Pemakaian |
|---|---|---|
| `--s1` | `#2a96d0` | Seri utama / realisasi (Biru Kinra digelapkan) |
| `--s2` | `#e0700f` | Seri pembanding / target (Jingga-Merah digelapkan) |
| `--s3` | `#6f8385` (gelap) · `#7d8f91` (terang) | Seri ketiga / netral / "lainnya" |

> Warna identitas murni gagal uji CVD & lightness di permukaan gelap, sehingga grafik memakai versi turunan di atas. **Tosca tidak dipakai di grafik** karena terlalu mirip Biru; Tosca khusus UI.

Skala ordinal (mis. tahap pipeline) memakai **satu ramp biru**; yang paling kontras dengan latar = paling dekat closing:

| Tahap | Gelap | Terang |
|---|---|---|
| GREEN (SPJ) | `#b7d3f6` | `#174f93` |
| HOT | `#6da7ec` | `#2a78d6` |
| WARM | `#2a78d6` | `#6da7ec` |
| COLD | `#184f95` | `#b7d3f6` |
| BLACK (batal) | `#383835` | `#a3a39e` |

Matriks/heatmap capaian: `--heat-buruk` (merah) ← `--heat-netral` (abu) → `--heat-baik` (biru), dicampur dengan `color-mix()` sesuai intensitas.

### 3.4 Bentuk, jarak, lapisan

| Token | Nilai |
|---|---|
| `--radius` | 18px (kartu besar) |
| `--radius-sm` | 12px (kartu kecil, input, kontainer peta) |
| Radius kontrol | 10px (tombol 36px), 9px (tombol di dalam seg), 999px (chip/pill) |
| `--sidebar` | 248px |
| Gap grid | 16px antar kartu, 14px antar insight |
| Padding kartu | 22px |
| Lebar konten maks | 1400px, padding samping 36px (16px di ponsel) |
| Jarak antar section | 72px |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)` |
| z-index | `--z-backdrop` 0 · `--z-content` 1 · `--z-sticky` 20 · `--z-sidebar` 30 · `--z-overlay` 50 |

---

## 4. Tipografi

| Peran | Font | Catatan |
|---|---|---|
| Sans (teks & angka besar) | **Nunito Sans** 400/500/600/700 | Pengganti bebas lisensi untuk Museo Sans di guideline |
| Mono (label, eyebrow, angka tabel) | **IBM Plex Mono** 400/500/600 | Untuk teks "data" dan metadata |

Muat via `next/font/google` dengan `variable: '--font-sans'` / `'--font-mono'`.

### Skala

| Elemen | Ukuran | Berat | Letter-spacing |
|---|---|---|---|
| Body | 14px (15px di ponsel), line-height 1.55 | 400 | normal |
| Hero title | `clamp(32px, 3.6vw, 52px)` | 600 | -0.035em |
| `h2` judul section | 30px (24px di ponsel) | 600 | -0.02em |
| `h3` judul kartu | 15px | 600 | -0.01em |
| Angka KPI tile | 34px | 600 | -0.03em |
| Angka side-stat | 28px | 600 | -0.02em |
| Teks kecil `.small` | 12.5px | 400 | normal |
| Eyebrow / label mono | 10.5–11px, UPPERCASE | 500 | 0.14–0.18em |

Aturan:
- Semua angka yang dibandingkan antar baris memakai `.tnum` (`font-variant-numeric: tabular-nums`).
- Kolom angka di tabel: rata kanan, font mono.
- Eyebrow (label di atas judul) selalu mono + uppercase + letter-spacing lebar.

---

## 5. Struktur halaman (shell)

```
┌──────────────┬──────────────────────────────────────────────┐
│  BRAND TOSCA │ Topbar sticky: crumbs · ⌘K · live · akun     │
│  (logo)      ├──────────────────────────────────────────────┤
│              │ Ticker KPI berjalan (pause saat hover)       │
│  Navigasi    ├──────────────────────────────────────────────┤
│  01 … 11     │  Section 01                                  │
│  (aktif =    │   eyebrow + no. section                      │
│   garis      │   H2 judul berupa kesimpulan                 │
│   tosca)     │   paragraf konteks (muted)                   │
│              │   [kartu] [kartu]                            │
│  Kartu       │  Section 02 …                                │
│  periode     │                                              │
│              │  Footer: daftar sumber data                  │
└──────────────┴──────────────────────────────────────────────┘
                                       [ KINRA AI ● ] FAB kanan bawah
```

- **Sidebar** sticky 248px, hilang di ≤ 1100px.
- **Topbar** sticky, blur 16px, latar semi transparan.
- **Navigasi** = anchor ke `section[id]`; item aktif disorot otomatis lewat IntersectionObserver (garis kiri 3px `--brand` + glow).
- **Progress scroll** 2px di paling atas dengan gradien Merah → Jingga → Biru → Tosca.
- **Command palette** (`⌘K` / `Ctrl+K`) untuk lompat ke section atau insight.

### Kepala section

```tsx
<SectionHead no="09" eyebrow="Tenant KEK Sei Mangkei" judul="32 perusahaan menempati 437,8 Ha lahan">
  <p className="muted">Konteks singkat + sumber data.</p>
</SectionHead>
```

Judul section **berupa kesimpulan berangka**, bukan label generik. Contoh baik: "32 perusahaan menempati 437,8 Ha lahan". Contoh buruk: "Data Tenant".

### Grid

| Kelas | Kolom | Pemakaian |
|---|---|---|
| `.grid-2` | 1fr 1fr | Dua grafik setara |
| `.grid-1-2` | 1fr 2fr | Ringkasan + tabel/detail |
| `.grid-3-1` | 3fr 1fr | Grafik utama + side-stat |
| `.tiles` | 3 kolom | KPI tile |
| `.insights` | 3 kolom bento | Insight; `.featured` span 2 baris |

Semua grid turun ke 1 kolom di ≤ 1100px (tiles/insight: 2 kolom, lalu 1 kolom di ≤ 640px).

---

## 6. Komponen

### 6.1 Kartu (`.card`, `.tile`, `.insight`)

- Latar gradien halus (`--card-bg`), radius 18px.
- Border 1px **gradien** via `::before` + mask (terang di kiri atas, memudar).
- **Spotlight** Tosca 7% mengikuti kursor via `::after` + variabel `--mx`/`--my`.
- Tile & insight naik 3px saat hover. Kartu biasa tidak bergerak.

```html
<div class="card">
  <div class="row">
    <div><h3>Judul kartu</h3><p class="muted small">Keterangan + satuan</p></div>
    <div class="mini-stats"><div><span>Total</span><b class="tnum">Rp339,3 M</b></div></div>
  </div>
  <!-- isi -->
</div>
```

`.row` = flex, judul kiri, statistik ringkas kanan, wrap di layar sempit.

### 6.2 KPI tile

Ikon 30px dalam kotak Tosca, label, chip status di kanan, angka 34px, meta (Realisasi/Target), mini-bar R/K/L, dan progress dengan penanda target (`.track u`).

### 6.3 Chip status

```tsx
<Chip capaian={92.4} />                 // otomatis: Waspada + ikon segitiga
<Chip kode="info" label="Signed (SPJ)" />
```

| Kode | Ikon (lucide) | Label default |
|---|---|---|
| `good` | `CircleCheck` | Tercapai |
| `warn` | `TriangleAlert` | Waspada |
| `serious` | `TrendingDown` | Di bawah target |
| `crit` | `CircleX` | Kritis |
| `na` | `CircleDot` | Tanpa target |
| `info` | `Info` | — |

Tinggi 22px, pill, border 45% + latar 7–9% warna status.

### 6.4 Insight

Kartu bento dengan strip kiri 3px berwarna tingkat (`kritis` = merah + glow, `perhatian` = jingga, `positif` = hijau, `info` = biru). Isi: area (mono uppercase), angka 26px, judul 15px, penjelasan 13px. Satu insight paling penting = `.featured` dengan angka 64px bergradien Jingga → Merah.

### 6.5 Kontrol

| Komponen | Spesifikasi |
|---|---|
| Segmented control `.seg` | Kontainer `--surface-2` radius 12px, tombol terpilih `aria-selected="true"` latar `--surface-3`. Varian `.seg.small` |
| Input cari `.cari-tenant` | Tinggi 36px, ikon `Search` 14px, border berubah `--brand` saat fokus |
| Input form `.input-wrap` | Tinggi 50px, radius 12px, fokus = border `--brand` + ring 4px Tosca 18% |
| Tombol utama `.btn-masuk` | Tinggi 52px, gradien Tosca, teks putih 700, bayangan Tosca |
| Tombol ikon | 36×36px (44×44px di ponsel), radius 10px, border `--line-2` |
| Slider | `accent-color: var(--s1)` |

### 6.6 Tabel `.tbl`

- Header sticky, mono 10.5px uppercase, warna `--muted`.
- Baris: padding 10px 8px, pemisah `--line`, hover tint 2.5%.
- Kolom angka `.num`: rata kanan + mono.
- Sub-keterangan di bawah nama: `.upd` (11.5px muted).
- Bungkus dengan `.table-wrap` (`.tall` = maks 440px + scroll).
- Selalu ada baris kosong: "Tidak ada … yang cocok." dan baris ringkasan di bawah (jumlah + total + sumber).

### 6.7 Matriks capaian `.matrix`

Sel dengan jarak 4px, radius 8px, warna dicampur `color-mix(in srgb, var(--heat-baik) var(--f), var(--heat-netral))`. Sertakan legenda skala `.legend-scale`.

### 6.8 Bar lahan / progres

- `.land-bar`: bar horizontal 54px, segmen terpakai (biru solid), rencana (biru arsir 135°), gap (merah arsir 45° + border), sisa (transparan). Penanda target = garis vertikal `--ink` dengan label di atasnya.
- `.pg .track`: progres 10px dengan penanda target `u`; jika lewat target pakai `.over` (biru + glow).
- Legenda `.lb-legend`: swatch 18×10px + label.

### 6.9 Timeline & roadmap

- `.timeline`: garis gradien 4 warna identitas, titik tahun berjalan `.kini` = Tosca berglow.
- Roadmap: kolom pilar dengan strip warna pilar (Merah/Biru/Jingga), item `.rm-item.berjalan` (biru) dan `.telat` (jingga), garis "sekarang" vertikal Tosca.

### 6.10 Peta interaktif

Pola untuk gambar denah/masterplan yang bisa diklik:
- Gambar (webp, maks ~4000px tinggi) + **SVG overlay** dengan `viewBox` sama dengan sistem koordinat gambar.
- Area = `<polygon>` dengan `role="button"`, `tabIndex=0`, `aria-label`, `<title>` untuk tooltip, Enter/Spasi untuk memilih.
- Isian warna kategori 18% → 42% saat hover/fokus → 55% + garis gelap saat terpilih; `vector-effect: non-scaling-stroke`.
- Kontainer scroll dengan tombol zoom +/− (36px), panel detail di kanan (320px), daftar cari di bawah panel.
- Klik nama di daftar = pilih + perbesar + gulir ke area.

### 6.11 Asisten AI & palette

- FAB pill 52px kanan bawah, gradien Tosca → Biru.
- Panel 460×680px, radius 20px; di ponsel layar penuh.
- Bubble pengguna: Tosca solid, teks putih, sudut kanan bawah 4px. Bubble asisten: `--surface-2` + border, sudut kiri bawah 4px.
- Saran pertanyaan sebagai tombol outline saat percakapan kosong.
- Command palette: overlay blur 6px, panel 620px di 14vh dari atas, item aktif tint Tosca 10%.

---

## 7. Grafik (ECharts)

- Satu wrapper client (`Grafik`) untuk semua grafik; opsi dibentuk di `components/charts/options.ts`, data dihitung di server component.
- Warna dibaca dari objek token `T` yang ditukar oleh `pakaiTema('dark' | 'light')`.
- **Font** grafik = font body halaman.
- Sumbu: label `--muted` 11px, garis grid tipis (`T.grid`), tanpa tick.
- Legenda: kanan atas, ikon `roundRect` 12×4px.
- Tooltip: radius 8px, padding 8×12px, bayangan lembut, border tipis.
- Titik data: lingkaran berwarna seri dengan cincin warna permukaan (2px).
- Animasi masuk 900ms `cubicOut`.
- Realisasi = `s1` (biru), target/rencana = `s2` (jingga) atau garis putus-putus, pembanding ketiga = `s3` (abu).
- Naik = biru, turun = Merah Kinra (`#f15a22`), netral = abu. **Hindari pasangan merah–hijau.**
- Tinggi standar: `.h-280`, `.h-320`, `.h-380`.

---

## 8. Format angka & bahasa

Gunakan `Intl.NumberFormat('id-ID')`: titik untuk ribuan, koma untuk desimal.

| Helper | Input | Output |
|---|---|---|
| `angka(1234.5, 1)` | angka | `1.234,5` |
| `rupiah(339300)` | Rp juta | `Rp339,3 M` |
| `rupiah(850)` | Rp juta | `Rp850 jt` |
| `rupiah(1_250_000)` | Rp juta | `Rp1,25 T` |
| `persen(92.4)` | % | `92,4%` |
| `delta(-3.2)` | % | `−3,2%` (tanda minus asli `−`, bukan `-`) |
| `volume(14.22, 'Ha')` | Ha | `14,22 Ha` (desimal hanya bila ada) |
| Nilai kosong | `null` | `–` (en dash) |

Konvensi:
- Simpan uang dalam **Rp juta** di database, format saat tampil.
- Luas lahan dalam **Ha**; tampilkan 0 desimal bila bulat, 1–2 desimal bila tidak.
- Bulan: `Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des`.
- Nama perusahaan di daftar ringkas boleh tanpa "PT ", di detail tulis lengkap.
- Nada teks: lugas, informatif, tanpa jargon pemasaran. Kalimat aktif. "Klik kavling berwarna untuk melihat detail tenant." bukan "Silakan Anda mengklik…".

---

## 9. Gerak (motion)

| Efek | Durasi | Catatan |
|---|---|---|
| Hover warna/border | 0.15–0.2s | |
| Tile/insight naik | 0.25s `--ease` | translateY(-3px) |
| Reveal saat scroll | 0.8s `--ease` | opacity + translateY(18px); kelas ditambah lewat JS, jadi tanpa JS konten tetap tampil |
| Panel/palette muncul | 0.18–0.2s | `pop`: fade + translateY(-8px) + scale(.98) |
| Aurora latar | 30–40s | bolak-balik, sangat lambat |
| Ticker | 70s linear | berhenti saat hover |

**Wajib**: hormati `prefers-reduced-motion: reduce`. Matikan aurora, ticker, reveal, pulse, dan transform hover.

---

## 10. Aksesibilitas

- Fokus keyboard: `outline: 2px solid var(--brand); outline-offset: 3px` (`:focus-visible`).
- Target sentuh minimum **44×44px** di ≤ 640px (tombol ikon, seg button `min-height: 40px`).
- Semua tombol ikon punya `aria-label`; ikon dekoratif `aria-hidden="true"`.
- Grafik/bar visual punya `role="img"` + `aria-label` yang menyebut angka kuncinya.
- Toggle/pilihan memakai `aria-selected` atau `aria-pressed`, bukan hanya kelas CSS.
- Status = ikon + teks + warna (tidak pernah warna saja).
- Kontras teks kecil memakai `--txt-good`/`--txt-bad`, bukan `--good`/`--crit`.
- `lang="id"` di `<html>`.

---

## 11. Tema terang/gelap

- Default mengikuti sistem (`prefers-color-scheme`).
- Pilihan pengguna disimpan di cookie `kinra_tema` dan dipasang server sebagai `data-theme` di `<html>` agar tidak berkedip.
- CSS: token gelap di `:root`, token terang di `:root[data-theme="light"]` **dan** di `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { … } }`.
- Grafik ikut berganti lewat `pakaiTema()` lalu render ulang.
- Warna identitas (Merah, Jingga, Biru, Tosca) **tidak berubah** antar tema.

---

## 12. Responsif

| Breakpoint | Perubahan |
|---|---|
| ≤ 1280px | Daftar kontribusi jadi 1 kolom |
| ≤ 1100px | Sidebar disembunyikan; semua grid 2-kolom jadi 1 kolom; tiles/insight 2 kolom; timeline vertikal; panel peta pindah ke bawah |
| ≤ 900px | Login jadi satu kolom |
| ≤ 640px | Body 15px; padding samping 16px; h2 24px; tiles/insight 1 kolom; tombol ikon 44px; email akun & teks tombol disembunyikan; roadmap scroll horizontal; chat layar penuh |

Tidak boleh ada scroll horizontal halaman; tabel dan roadmap scroll di dalam kontainernya sendiri.

---

## 13. Lakukan & hindari

**Lakukan**
- Pakai token, bukan hex.
- Judul section berupa kesimpulan berangka.
- Sebut sumber data di setiap kartu.
- Satu warna = satu makna di seluruh aplikasi (biru = realisasi/positif, jingga = target/rencana, merah = gap/turun).
- Uji di tema gelap **dan** terang, di 1440px **dan** 375px.

**Hindari**
- Tosca untuk seri grafik (gunakan hanya untuk UI).
- Pasangan merah–hijau untuk naik/turun.
- Status yang hanya dibedakan warna.
- Memisahkan simbol dan nama logo, atau mengganti warna logo.
- Animasi yang tidak bisa dimatikan oleh `prefers-reduced-motion`.
- Angka tanpa satuan atau tanpa format `id-ID`.

---

## 14. Starter CSS minimum

Salin blok ini ke aplikasi KINRA baru sebagai titik awal, lalu ambil komponen lain dari `app/globals.css` sesuai kebutuhan.

```css
:root {
  color-scheme: dark;
  --page: #041214; --surface: #0b1d20; --surface-2: #10262a; --surface-3: #163135;
  --line-rgb: 190, 240, 240; --fg-rgb: 255, 255, 255; --shadow-rgb: 0, 0, 0; --shadow-k: 1;
  --line: rgba(var(--line-rgb), 0.08); --line-2: rgba(var(--line-rgb), 0.14);
  --card-bg: linear-gradient(180deg, rgba(16, 40, 44, 0.9), rgba(9, 27, 30, 0.92));
  --ink: #eef6f6; --ink-2: #c2d3d4; --muted: #86a0a2;
  --merah: #f15a22; --jingga: #fcaf17; --biru: #32a3dc; --tosca: #008187; --abu: #4d4d4f;
  --s1: #2a96d0; --s2: #e0700f; --s3: #6f8385;
  --good: #12b76a; --warn: #fab219; --serious: #ec835a; --crit: #f04438;
  --txt-good: #6fd3a8; --txt-bad: #ff8a80;
  --brand: #3cc2c6;
  --radius: 18px; --radius-sm: 12px;
  --ease: cubic-bezier(.2, .8, .2, 1);
}
:root[data-theme="light"] {
  color-scheme: light;
  --page: #eef3f3; --surface: #ffffff; --surface-2: #f3f7f7; --surface-3: #e4eded;
  --line-rgb: 12, 60, 66; --fg-rgb: 10, 50, 56; --shadow-rgb: 16, 48, 52; --shadow-k: 0.35;
  --card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 252, 252, 0.96));
  --ink: #0f2629; --ink-2: #34494c; --muted: #587073; --s3: #7d8f91;
  --good: #0e9258; --warn: #b77b06; --serious: #c95b2c; --crit: #d92d20;
  --txt-good: #0b7a4a; --txt-bad: #c4320a;
  --brand: #00797e;
}
/* Ulangi blok terang di dalam:
   @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { … } } */

body {
  margin: 0; background: var(--page); color: var(--ink);
  font-family: var(--font-sans), system-ui, sans-serif; font-size: 14px; line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { margin: 0; font-weight: 600; letter-spacing: -0.02em; }
h2 { font-size: 30px; line-height: 1.15; }
h3 { font-size: 15px; }
.muted { color: var(--muted); }
.small { font-size: 12.5px; }
.tnum { font-variant-numeric: tabular-nums; }
.eyebrow { font-family: var(--font-mono), monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--ink-2); }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; border-radius: 6px; }

.card {
  position: relative; padding: 22px; border-radius: var(--radius); background: var(--card-bg);
  box-shadow: 0 1px 0 rgba(var(--fg-rgb), 0.05) inset, 0 20px 40px -24px rgba(var(--shadow-rgb), calc(0.8 * var(--shadow-k)));
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

---

*Disusun dari KINRA Performance Hub, Oktober 2026. Perbarui dokumen ini bila token di `app/globals.css` atau `components/charts/tokens.ts` berubah.*
