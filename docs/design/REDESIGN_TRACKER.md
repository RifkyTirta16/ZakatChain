# Pelacak Redesain (urutan WAJIB diikuti, satu per sesi)

Aturan tiap halaman: ikuti DESIGN.md. Pakai komponen frontend/src/components/ui/.
Wajib: loading (Skeleton), kosong (EmptyState + aksi), error (ErrorState + coba lagi).
Satu aksi utama. Teks Bahasa Indonesia. Responsif 640/768/1024. Status via ui/badgeStatus.ts.
Uang via utils/format.ts. Tanpa hex/URL hardcode. Bungkus halaman dengan
`min-h-screen bg-surface` supaya tidak ikut latar gelap lama dari index.css.
Jangan mencampur kelas wattvision-* dan token baru di satu halaman.
Jangan ubah logika API, nama endpoint, atau struktur data.

- [x] 1. pages/Dashboard.tsx
  Tata letak: 4 kartu angka (total donasi, total distribusi, saldo, anomali terbuka), lalu grafik
  tren (Recharts, warna token) + tabel 5 transaksi terakhir. Aksi utama: "Catat Distribusi" (AMIL)
  atau "Tinjau Anomali" (AUDITOR/ADMIN).
- [x] 2. components/Analytics.tsx
  Tata letak: komponen grafik dipakai Dashboard. Warna dari token, legenda + label sumbu,
  angka kunci besar. Jangan ubah props yang dipakai pemanggilnya.
- [x] 3. pages/Campaigns.tsx
  Tata letak: grid kartu (judul, progress bar target, sisa hari, tombol "Donasi" gold),
  filter status di atas. Garis aksen kiri kartu sesuai status kampanye.
- [ ] 4. pages/CampaignDetail.tsx
  Tata letak: kiri deskripsi + riwayat donasi, kanan lengket progress + tombol Donasi.
- [ ] 5. pages/DonationPayment.tsx
  Tata letak: wizard 3 langkah (nominal, metode, konfirmasi), lalu status pembayaran.
  Jangan ubah alur pembuatan sesi pembayaran.
- [ ] 6. components/PaymentModal.tsx
  Tata letak: Modal radius xl, ringkasan nominal, status pembayaran dengan Badge,
  tombol tutup dengan fokus terkelola (Escape menutup).
- [ ] 7. pages/NewDistributionRecord.tsx
  Tata letak: form satu kolom, upload bukti dengan pratinjau, ringkasan sebelum kirim,
  validasi inline Bahasa Indonesia.
- [ ] 8. pages/PublicVerify.tsx
  Tata letak: input hash/ID besar di tengah, hasil di kartu dengan Badge status +
  catatan "On-chain hanya membuktikan hash, bukan penerimaan di lapangan".
- [ ] 9. pages/OnChainExplorer.tsx
  Tata letak: tabel dengan hash terpotong (0x12ab…89ef) + tombol salin, filter status.
- [ ] 10. pages/EvidenceGraph.tsx
  Tata letak: graf di tengah, panel detail di samping saat node diklik. Jangan ubah library graf.
- [ ] 11. pages/PovertyMapping.tsx
  Tata letak: peta Leaflet penuh, panel statistik wilayah di samping, legenda warna dari token.
- [ ] 12. components/auth/* (login/daftar)
  Tata letak: kartu di tengah, satu aksi utama, label di semua input, pesan error jelas.
  Login memakai USERNAME, bukan email. Jangan ubah logika autentikasi/token.
- [ ] 13. SELESAI: pensiun wattvision (hanya jika `grep -rn "wattvision-" frontend/src` kosong
  di luar index.css dan components/wattvision/). Ganti @apply di index.css dengan token baru.
