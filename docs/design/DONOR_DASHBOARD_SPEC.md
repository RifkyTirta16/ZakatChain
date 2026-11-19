# Spesifikasi Dashboard Donor (8 komponen, urutan WAJIB)
Berkas: frontend/src/pages/home/DonorHome.tsx. Komponen baru di frontend/src/components/dashboard/.
Data via TanStack Query dari endpoint YANG SUDAH ADA. Butuh endpoint baru -> STOP dan tanya.
Tiap komponen: loading (Skeleton), kosong (EmptyState + aksi), error (ErrorState + coba lagi).
Semua teks Bahasa Indonesia, uang via utils/format.ts, status via ui/badgeStatus.ts.
Teks sekunder minimal slate-600. Satu aksi utama gold per layar (Quick Donation).

## 1. Welcome + ringkasan personal
Sapaan "Halo, {username}" + role badge. Tiga angka personal dari GET /donations/donor/:id:
total donasi saya, jumlah donasi, donasi terakhir (tanggal). Baris status singkat:
"{n} donasi menunggu konfirmasi" bila ada. Tanpa data -> ajakan "Mulai donasi pertamamu".

## 2. KPI keuangan (4 StatCard + hint)
Dari GET /dashboard/stats dan GET /donations: (a) Donasi saya (terkonfirmasi),
(b) Total donasi platform terkonfirmasi, (c) Total terdistribusi platform,
(d) Saldo belum tersalurkan = (b) - (c), hanya jika kedua angka tersedia.
Setiap kartu punya hint, misalnya "dari 12 donasi". Jangan mengarang angka yang tidak
tersedia dari endpoint: tampilkan "-" dan hint "Belum tersedia".

## 3. Quick Donation
Kartu gold-accent: pilihan nominal cepat (Rp 50.000, 100.000, 250.000, Lainnya),
dropdown kampanye (default: kampanye teratas dari no. 4), tombol "Donasi sekarang"
yang membuka components/PaymentModal.tsx YANG SUDAH ADA di halaman yang sama.
Jangan mengubah alur pembuatan sesi pembayaran. Validasi nominal inline.

## 4. Kampanye populer
Dari GET /campaigns, urut berdasarkan progres (current_amount/target_amount) lalu
terbaru. Maks 6 kartu: judul, progress bar, terkumpul/target, sisa hari, tombol Donasi
(memilih kampanye itu di Quick Donation, tanpa pindah halaman). Garis aksen kiri
sesuai status. Link "Lihat semua" ke /campaigns.

## 5. Aktivitas transaksi
Dari GET /donations/donor/:id: 5 donasi terakhir. Tiap baris: kampanye, nominal, tanggal,
Badge status, dan JourneyTracker versi ringkas (ukuran kecil). Link "Lihat semua".
Kosong -> "Belum ada aktivitas" + tombol donasi.

## 6. Peta distribusi zakat
Leaflet (sudah ada di dependencies), data dari GET /mapping/stats. Marker/lingkaran
per WILAYAH dengan ukuran sesuai total distribusi, legenda warna dari token, daftar 5
wilayah teratas di sebelah/bawah peta. JANGAN menampilkan nama atau lokasi penerima individu.
Peta tidak boleh dimuat tanpa tinggi tetap (cegah layout loncat). Link "Buka pemetaan lengkap" ke /mapping bila route ada.
Penting: jangan merusak PovertyMapping.tsx atau mengubah utils/regions.ts; hanya membaca.

## 7. Transparansi blockchain
Dari GET /transactions (5 terbaru yang punya tx_hash) dan blockchain_status: daftar hash
terpotong (0x12ab…89ef) + tombol salin + Badge status + nomor blok bila ada.
Input "Cek keabsahan" (hash/ID) yang membuka /verify. Selalu tampilkan catatan:
"On-chain hanya membuktikan hash, bukan penerimaan di lapangan".
Bila belum ada transaksi bertx_hash -> EmptyState yang menjelaskan alasannya.

## 8. Dampak sosial (AGREGAT SAJA)
Angka dari data platform: total terdistribusi, jumlah wilayah terjangkau, distribusi per
kategori (donut/bar Recharts, warna token), jumlah catatan distribusi yang bukti-nya sudah
ditinjau. Opsional: "Kontribusi saya = X% dari total donasi terkonfirmasi" (hitungan
aritmetika murni, beri keterangan "perkiraan proporsi, bukan pelacakan per donasi").
DILARANG: klaim dana donasi tertentu sudah diterima penerima tertentu, memakai kata
"sudah sampai/diterima", atau menampilkan data pribadi penerima. Gunakan kata
"tercatat", "terverifikasi hash", "tersalurkan menurut catatan".
