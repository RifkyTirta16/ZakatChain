# Panduan Desain ZakatChain

Gaya: retro-playful hangat berbasis teal, emas, dan coral, diadaptasi dari
docs/design/FLIP7_REFERENCE.md. Hanya ambil bahasa visualnya (warna, bentuk, glow).
JANGAN ambil elemen game: logo kartu kipas, BOOM, confetti, mahkota, medali.
Produk ini soal kepercayaan dan transparansi: ceria tapi tetap rapi dan terbaca.

## Warna (token Tailwind, tidak boleh pakai hex ad-hoc)
- primary:       #2BA8A2  (UI utama, progress, avatar)
- primary-light: #3CC4BD  (hover, aksen)
- primary-dark:  #1E8C86  (teks di permukaan terang, judul)
- primary-bg:    #E8F6F5  (tint latar)
- gold:          #FFD23F  (CTA utama, highlight)  | gold-light #FFE47A | gold-dark #E6B800
- coral:         #EF6C4A  (peringatan, anomali, ditolak) | coral-light #FF8A6A | coral-dark #D45233
- cream:         #FFF8E7  (permukaan input, kartu hangat)
- sky:           #5DADE2  (info, status "Ditinjau")
- surface:       #EFF8F7 (latar halaman) | kartu #FFFFFF
- success #27AE60 | error #E74C3C
Teks di atas gold SELALU primary-dark (#1E8C86 atau lebih gelap), bukan putih.

## Tipografi
Plus Jakarta Sans (fallback: system-ui, -apple-system, Segoe UI, sans-serif).
Judul extra-bold (800), letter-spacing lebar sedikit. Skala:
display 40 / h1 30 / h2 24 / h3 20 / body 16 / sm 14 / xs 12 (px)

## Spacing & radius
Basis 4px: 4, 8, 12, 16, 24, 32, 48.
Radius: sm 8 (tag, input kecil) | md 12 (tombol kotak, input) | lg 16 (kartu, panel)
| xl 24 (hero, modal) | full (tombol pill, badge)

## Elevasi: glow berwarna (jangan shadow hitam polos untuk elemen interaktif)
- shadow-card:  0 4px 20px rgba(43,168,162,.10)
- teal-glow:    0 4px 20px rgba(43,168,162,.30)
- gold-glow:    0 4px 20px rgba(255,210,63,.40)
- coral-glow:   0 4px 20px rgba(239,108,74,.35)
- sky-glow:     0 4px 16px rgba(93,173,226,.30)
- focus ring:   0 0 0 4px rgba(43,168,162,.20)
Shadow hitam halus (8-16%) hanya untuk elemen non-interaktif.

## Komponen (buat di frontend/src/components/ui/, wajib dipakai semua halaman)
- Button: bentuk pill, tinggi min 44px, transisi memantul (cubic-bezier(.34,1.56,.64,1)),
  active: scale(.95).
  * primary = gradient gold + gloss tipis + gold-glow, teks primary-dark
  * secondary = teal solid/outline + teal-glow
  * danger = coral + coral-glow
- Card: putih, radius 16, shadow-card, garis aksen kiri 4px berwarna status.
  * default: primary-light | highlight: gold + gradient emas lembut + gold-glow
  * anomali/ditolak: coral + gradient coral lembut
- Input/Select: latar cream, radius 12, border tipis, focus ring teal, label selalu ada
- Badge: pill. Lihat "Status bukti" di bawah
- SectionTitle: ikon lucide-react di dalam kotak (bukan emoji teks),
  garis bawah putus-putus 2px
- Table, Modal (radius 24), Toast, Skeleton, EmptyState: ikut token yang sama
- Pembagi section: border dashed
- Podium/peringkat (kalau ada leaderboard donor): perak 2nd, coral 3rd, default 4th+,
  tanpa emoji medali, pakai angka + ikon lucide

## Status bukti (inti produk, satu komponen Badge, jangan dicampur)
Diajukan (sky) -> Ditinjau (gold) -> Hash tercatat on-chain (primary) ->
Pembayaran terkonfirmasi (success). Ditolak/Anomali = coral.
Selalu sertakan catatan: "On-chain hanya membuktikan hash, bukan penerimaan di lapangan".
Mapping di frontend/src/utils/status.ts. Warna status tidak boleh dipakai untuk dekorasi.

## Animasi
- Micro-interaction maksimal 500ms. Hormati prefers-reduced-motion.
- Boleh: bounce tombol, glow-pulse lembut (2s) untuk kartu sorotan,
  progress bar mengisi. Tidak ada animasi untuk data keuangan yang bergerak-gerak.

## Wajib di setiap halaman
- Loading (skeleton), kosong (pesan + aksi), error (pesan + tombol coba lagi)
- Mobile-first, breakpoint 640/768/1024; tabel scroll horizontal di mobile
- Kontras WCAG AA, fokus keyboard terlihat, target sentuh >= 44px
- Teks Bahasa Indonesia, angka Rupiah via utils/format.ts
- Hash/alamat dipotong (0x12ab…89ef) + tombol salin

## Do & Don't
Do: glow berwarna di elemen interaktif, pill konsisten, input krem, garis aksen kiri
untuk status, pembagi putus-putus.
Don't: shadow hitam polos di tombol, warna hardcode, animasi >500ms, emoji sebagai ikon
fungsional, meniru elemen game.

## Cara bekerja
1. Pasang token ke tailwind.config.js (gabungkan, jangan timpa isi lama)
2. Buat komponen ui/ (Button, Card, Badge, Input dulu)
3. Rapikan SATU halaman (Dashboard) sampai bagus, jadikan acuan, lalu halaman lain
4. Jalankan `npm run build` dan `npm run lint` setelah tiap perubahan
