# Active Task / Recovery Checkpoint

**Updated:** 2026-11-22 · **Status:** Paket 1, Paket 2, dan Paket 3 (perbaikan fungsional/keamanan backend + signer blockchain lokal, kebersihan data SQLite & konsistensi KPI, serta penyederhanaan UI/UX Publik dan Muzakki) selesai dikerjakan di branch `fix/audit-packages-1-2-3`.

## Completed
- **Paket 1 (Backend, Chain Signer, RBAC & Kebersihan Tes):**
  - Konfigurasi lokal Hardhat signer (`BLOCKCHAIN_PRIVATE_KEY` dev lokal) & `PAYMENT_WEBHOOK_SECRET` di `backend/.env` tanpa mematahkan isolasi tes (`apiIntegration.test.ts` menghapus env key per test server); `PATCH /api/transactions/2/reconcile` sukses mengonfirmasi transaksi `#2` on-chain ke Blok `#3`.
  - Perbaikan `CampaignSchema` (`validation.ts`: terima `deadline: null`), `proofController.ts` (`409` jika menyetujui bukti tanpa `proof_url`), `campaignController.ts` (hapus `donor_id` & `payment_reference` dari respons publik `/campaigns/:id`), `donationController.ts` (`GET /donations/:id/trace` menahan sebaran alokasi saat status donasi belum `CONFIRMED`), dan `mappingController.ts` (`GET /mapping/region/:region` normalisasi provinsi + hapus kolom PII untuk role `USER`).
  - Isolasi upload tes ke `os.tmpdir()` (`upload.ts` + `index.ts`) dan pembersihan 36 file dummy `.png` 12-byte dari `backend/uploads/`.
  - Penambahan endpoint ringan `GET /api/public/network` + cache 5s pada `probeNetworkStatus` (`web3.ts`) dan tuning `DEFAULT_LIMIT` non-produksi (`rateLimit.ts`).
- **Paket 2 (Kebersihan Data DB & Konsistensi KPI):**
  - Pembaruan data uji `database.sqlite` secara aditif (3 program zakat realistis, 4 data mustahik terverifikasi, koreksi label penerima, status `REJECTED` jujur pada transaksi `#3` yang belum punya berkas & penyelesaian anomali `#5`/`#6`, penyeimbangan donasi terkonfirmasi sehingga saldo positif `+Rp 9.350.000` dengan snapshot rekonsiliasi `BALANCED`).
  - Perbaikan `AmilHome` (total tersalurkan selaras tanpa transaksi `REJECTED`/`REVOKED`), `AuditorHome` (hapus teks internal `/uploads` & lokalkan status rekonsiliasi), `StatCard` (hapus `truncate` label KPI), `ImpactPanel` (hitung provinsi terdampak `total_distributed > 0`), `Campaigns` (`deadline: undefined`), dan `EvidenceGraph` (pakai `useQuery` TanStack Query).
- **Paket 3 (Penyederhanaan UI/UX Publik & Muzakki):**
  - `LandingPage.tsx`: disederhanakan dari 834 kata / 37 jargon / `9.003px` mobile menjadi beranda manusiawi berbasis Rupiah (`~441` kata, `2` istilah `on-chain`, `~5.229px` mobile / `~2.482px` desktop) dengan kartu Ringkasan Amanah dan detail teknis kriptografi di dalam `<details>` lipat.
  - `DonorHome.tsx`, `WelcomeCard.tsx`, `KpiRow.tsx`, `PopularCampaigns.tsx`, `ActivityList.tsx`: fokus pada kebutuhan pribadi Muzakki (memindahkan `ChainPanel`, `ImpactPanel`, & peta 38 provinsi dari home pribadi ke Portal Transparansi; menyusun `ActivityList` ringkas 3 baris tanpa 20 bulatan stepper).
  - `ShellFrame.tsx`, `PublicShell.tsx`, `navConfig.ts`, `QrCodeBox.tsx`, `PaymentModal.tsx`, `CampaignDetail.tsx`, `MyDonationsPage.tsx`, `JourneyTracker.tsx`: menghapus `NetworkBadge` dev dari header Muzakki & footer publik, menyatukan auto-polling 4 detik + tombol `Simulasikan Bayar (Sandbox)` DEV ke seluruh 4 alur bayar, dan melingkupi panduan DOKU Simulator dalam panel `<details>` di `QrCodeBox`.

## Remaining / Next Action
- **Paket 4 (Opsional jika diminta):** penambahan data kemiskinan level **Kota/Kabupaten** ke `poverty_stats` (saat ini baru 38 Provinsi).
- Catatan produksi: sebelum deployment produksi, wajib mengganti `BLOCKCHAIN_PRIVATE_KEY`, `JWT_SECRET`, dan kredensial DOKU Sandbox dengan kunci produksi.
