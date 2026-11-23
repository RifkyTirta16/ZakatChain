# Active Task / Recovery Checkpoint

**Updated:** 2026-11-23 · **Status:** Pembersihan file orphan, template bawaan, backup lama, dan file test selesai (`chore/cleanup-unused-and-tests` -> `main`).

## Completed
- **Paket 1–5 (`8fed84d`, `ecba671`, `a69dae0`, `faad715`, `b38ea0a`, `d692a1d`)**: hardening backend & signer lokal, DB hygiene, UI/UX Publik/Muzakki, konsolidasi kontrak (`DEC-007`), pemetaan 114 Kota/Kabupaten, serta konsistensi KPI & log audit rekonsiliasi.
- **Poin 1 & Paket 6 (`feat/lifecycle-cors-ci-cleanup`, `12c100b`, `f2492e0`)**: CORS loopback dev, `PATCH /api/campaigns/:id`, `PATCH /api/auth/password`, `autoComplete="username"` pada `/profile`, shell workspace pada `/transparency` saat login, pipeline `.github/workflows/ci.yml`, dan pembersihan `wagmi`/dump audit.
- **QA Lintas-Role & Perbaikan Cache/UI (`fix/qris-cache-and-ui-polish`, `098c0fc`)**: penyeragaman `invalidateDonationQueries`, kondisi banner Zakat Umum, dan padding `<select>` di `MyDonationsPage.tsx`.
- **Pembersihan Repo & File Test (`chore/cleanup-unused-and-tests`)**:
  - Mempertahankan penuh `backend/blockchain/` (folder source utama server Express backend).
  - Menggabungkan import `Campaign` di `DonationDrawer.tsx` ke `useDashboardData.ts` lalu menghapus `useDonation.ts`, serta menghapus `ChainPanel.tsx`, `ImpactPanel.tsx`, `DistributionMap.tsx`, `utils/status.ts`, aset/geo Vite lama, sisa Hardhat/template (`backend/hardhat.config.cjs`, `backend/cache/`, `backend/seed_campaigns.ts`, `blockchain/ignition/`, `send-op-tx.ts`, `deploy.ts`), backup/log lama (`AGENTS.md.save`, `session-ses_e093.md`, `.integration/`, `database.sqlite.bak-*`, 6 laporan lama root), `seed_test_users.ts`, dan seluruh folder test (`backend/blockchain/tests/`, `frontend/tests/`, `blockchain/test/`) beserta penyesuaian `package.json`, `hardhat.config.cjs`, `AGENTS.md`, dan `.github/workflows/ci.yml`.

## Remaining / Next Action
- **Produksi:** ganti kunci dev (`BLOCKCHAIN_PRIVATE_KEY`, `JWT_SECRET`, DOKU Sandbox), deploy `ZakatVerify.sol` ke jaringan tujuan, dan impor JSON BPS kab/kota resmi melalui `/mapping`.
- **Opsional lanjutan:** pemisahan tabel `payments` vs `donations` (`DEC-002`) atau penambahan kembali tes regresi saat dibutuhkan.
