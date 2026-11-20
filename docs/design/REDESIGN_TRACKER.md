# Pelacak Redesain (urutan WAJIB, satu per sesi)
Aturan tiap halaman: DESIGN.md (VISUAL v2). Pakai komponen frontend/src/components/ui/.
Wajib loading (Skeleton), kosong (EmptyState + aksi), error (ErrorState + coba lagi). Satu aksi utama.
Teks Bahasa Indonesia, responsif 640/768/1024, status via ui/badgeStatus.ts, uang via utils/format.ts.
Latar bg-canvas. Jangan campur kelas wattvision-* dan token baru. Jangan ubah logika API/endpoint.

- [x] 1. pages/Campaigns.tsx: grid kartu (judul, progress, sisa hari, tombol Donasi yang membuka
  DonationDrawer atau mengarah ke "/" bila drawer hanya ada di sana), filter status di atas.
- [ ] 2. pages/CampaignDetail.tsx: kiri deskripsi + riwayat donasi, kanan lengket progress + tombol Donasi.
- [ ] 3. pages/DonationPayment.tsx: tetap sebagai tautan langsung, wizard 3 langkah. Alur sesi tidak diubah.
- [ ] 4. components/PaymentModal.tsx: Modal radius xl, ringkasan nominal, Badge status, Escape menutup.
- [ ] 5. pages/NewDistributionRecord.tsx: form satu kolom, upload bukti dengan pratinjau, ringkasan, validasi inline.
- [ ] 6. pages/PublicVerify.tsx: input hash/ID besar, hasil di kartu dengan Badge + catatan on-chain.
- [ ] 7. pages/OnChainExplorer.tsx: tabel hash terpotong + tombol salin, filter status.
- [ ] 8. pages/EvidenceGraph.tsx: graf di tengah, panel detail saat node diklik. Library graf tidak diubah.
- [ ] 9. pages/PovertyMapping.tsx: peta penuh, panel statistik wilayah, legenda token. Hanya pembungkus dan panel.
- [ ] 10. components/auth/*: kartu di tengah, satu aksi utama, label input, error jelas.
  Login memakai USERNAME. Logika autentikasi/token TIDAK diubah.
- [ ] 11. components/Analytics.tsx: warna token, legenda, label sumbu. Props tidak diubah.
