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

## DASHBOARD UTAMA (route "/") dengan Visual v2
Semua 8 komponen berada di SATU halaman: frontend/src/pages/home/DonorHome.tsx
(dirender untuk semua role di "/"). Urutan 1-8 tidak berubah.
Tambahan per role (di atas komponen 1, hanya untuk ADMIN/AUDITOR/AMIL):
ActionPanel "Perlu tindakan" (bukti menunggu review, anomali terbuka, rekonsiliasi terakhir > 7 hari).
Admin/Auditor/Amil tetap melihat 8 komponen di bawahnya, tapi data "personal" (1, 5) berisi
ringkasan sistem, bukan donasi pribadi.
Layout desktop (12 kolom, gap 24px): 
- Baris 1: Hero (1 + Quick Donation di dalam hero, kolom kanan 5/12)
- Baris 2: KPI 4 kartu (3 kolom masing-masing)
- Baris 3: Kampanye populer (8 kolom) + Dampak sosial (4 kolom)
- Baris 4: Aktivitas transaksi (7 kolom) + Transparansi blockchain (5 kolom)
- Baris 5: Peta distribusi (12 kolom, tinggi 380px, daftar wilayah teratas di sisi kanan peta)
Mobile: satu kolom berurutan 1 sampai 8, KPI grid 2x2, kampanye carousel.

## DONASI LENGKAP DI HALAMAN UTAMA (menggantikan "Quick Donation" sederhana)
Seluruh alur donasi terjadi di route "/" tanpa pindah halaman.
Komponen: components/dashboard/DonationDrawer.tsx (panel geser), dipicu dari:
(a) QuickDonation di hero, (b) tombol Donasi pada tiap kartu kampanye (no. 4).
State kampanye terpilih dan nominal diangkat ke DonorHome.tsx (atau context kecil).

Langkah di drawer:
1. Pilih kampanye (dropdown/kartu kecil dengan progress), nominal cepat
   (Rp 50.000, 100.000, 250.000, Lainnya) atau input bebas. Validasi inline Bahasa Indonesia
   (minimal sesuai aturan backend; cari di validation.ts, jangan menebak).
2. Ringkasan: kampanye, nominal, catatan jujur "Donasi tercatat setelah pembayaran terkonfirmasi.
   On-chain hanya membuktikan hash, bukan penerimaan di lapangan".
3. Tombol "Lanjut bayar" (gold) memanggil pembuatan sesi pembayaran YANG SUDAH ADA
   (POST /payments/session; jangan ubah endpoint atau payload) lalu menampilkan instruksi/kode
   pembayaran persis seperti yang dikembalikan backend/PaymentModal sekarang.
4. Pemantauan status: polling GET /payments/status/:sessionId tiap 3 detik, maksimal 5 menit,
   berhenti saat status akhir. JourneyTracker menampilkan posisi. Ada tombol "Periksa sekarang".
5. Selesai: ucapan terima kasih singkat, tombol "Donasi lagi" dan "Tutup".
   Setelah sukses: invalidate query donasi, KPI, dan aktivitas supaya data halaman utama langsung segar.
Keadaan khusus: belum login -> ajakan masuk, kembali ke "/" dengan pilihan tersimpan di sessionStorage
(hanya kampanye dan nominal, tanpa data sensitif). Gagal/kedaluwarsa -> pesan jelas + "Coba lagi".
Aksesibilitas: drawer memakai role="dialog", fokus terkunci, Escape menutup, fokus kembali ke pemicu.
Jangan ubah: alur backend, webhook, nama endpoint, PaymentModal.tsx (dipakai sebagai referensi
atau dibungkus ulang), pages/DonationPayment.tsx (tetap ada sebagai tautan langsung).
