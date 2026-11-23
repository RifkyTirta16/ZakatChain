# Active Task / Recovery Checkpoint

**Updated:** 2026-11-23 · **Status:** Pengujian menyeluruh lintas role & perbaikan cache pembayaran QRIS + UI selesai (`fix/qris-cache-and-ui-polish` -> `main`).

## Completed
- **Paket 1–5 (`8fed84d`, `ecba671`, `a69dae0`, `faad715`, `b38ea0a`, `d692a1d`)**: hardening backend & signer lokal, DB hygiene, UI/UX Publik/Muzakki, konsolidasi kontrak (`DEC-007`), pemetaan 114 Kota/Kabupaten, suite tes unit frontend (`14/14`), serta konsistensi KPI & log audit rekonsiliasi.
- **Poin 1 & Paket 6 (`feat/lifecycle-cors-ci-cleanup`, `12c100b`, `f2492e0`)**: CORS loopback dev, `PATCH /api/campaigns/:id`, `PATCH /api/auth/password`, `autoComplete="username"` pada `/profile`, shell workspace pada `/transparency` saat login, pipeline `.github/workflows/ci.yml`, dan pembersihan `wagmi`/dump audit.
- **QA Lintas-Role & Perbaikan Cache/UI (`fix/qris-cache-and-ui-polish`)**:
  - Menyeragamkan invalidasi cache `invalidateDonationQueries(queryClient, options)` (`useDashboardData.ts`) di semua titik pembuatan/pelunasan QRIS (`DonationPayment.tsx`, `PaymentModal.tsx`, `CampaignDetail.tsx`, `DonationDrawer.tsx`, `useDonation.ts`) agar invoice `PENDING` langsung muncul di `/my-donations` selama navigasi SPA (`staleTime: 60s`).
  - Memperbaiki kondisi banner Zakat Umum (`selectedCampaignId === 'GENERAL'`) di `DonationPayment.tsx` & menghapus backtick literal pada teksnya.
  - Merapikan perataan vertikal `<select>` `"Semua Status"` di `MyDonationsPage.tsx` (`py-2 leading-5`).

## Remaining / Next Action
- **Produksi:** ganti kunci dev (`BLOCKCHAIN_PRIVATE_KEY`, `JWT_SECRET`, DOKU Sandbox), deploy `ZakatVerify.sol` ke jaringan tujuan, dan impor JSON BPS kab/kota resmi melalui `/mapping`.
- **Opsional lanjutan:** pemisahan tabel `payments` vs `donations` (`DEC-002`) serta uji E2E Playwright di CI.
