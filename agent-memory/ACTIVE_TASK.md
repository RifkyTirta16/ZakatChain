# Active Task / Recovery Checkpoint

**Updated:** 2026-11-20 · **Status:** Transformasi UI/UX + paket perbaikan keamanan, backend, manajemen role, dan optimasi bundle selesai di branch `feat/ui-ux-transformation`.

## Completed
- **Fase 1–10 (UI/UX & Ethereum):** Public website, workspace per role, design system (`Emerald #047857`, `Gold #C9A45C`, `Soft Cream #F8F7F2`), logo resmi Ethereum & deteksi jaringan lokal/testnet/mainnet aktif (`0x5FbDB2315678afecb367f032d93F642f64180aa3` terpasang di Hardhat lokal `31337`).
- **Paket 1 (Keamanan & Bug Backend):** `?search=` OR fix di `transactionController.ts`; `GET /api/transactions`, `GET /api/donations`, & `/uploads` dibatasi ke `['AMIL','AUDITOR','ADMIN']`; `resolveAnomaly` mencatat `audit_logs`; donasi "Zakat Umum" tercatat ke `donations` + sinkron `campaigns.current_amount` saat webhook `CONFIRMED`.
- **Paket 2 (Ethereum Retry & Sandbox):** tombol `Catat ke Ethereum` (`PATCH /api/transactions/:id/reconcile`) untuk `ADMIN` di `OnChainExplorer.tsx`; endpoint `POST /api/payments/sandbox/confirm/:sessionId` (non-production) + tombol simulasi dev di `DonationPayment.tsx` & `DonationDrawer.tsx`.
- **Paket 3 (Manajemen User, Bundle, & Kebersihan Repo):** `GET /api/users` & `PATCH /api/users/:id/role` (`ADMIN`-only, cegah self-demote `409`) + UI `RolesPermissionsPage.tsx`; `ImpactPanel`/`ChainPanel` dialihkan ke `usePublicTransparency()`; `/analytics` ditambah ke sidebar; lazy-loading route `MainApp.tsx`; `App.tsx\`` & `components/wattvision/` + token `wattvision` Tailwind dihapus.
- **Verifikasi:** Backend `tsc --noEmit` + `71/71` tests pass; Frontend `tsc -b` + `oxlint` (`0 warnings, 0 errors`, 80 files) + `vite build` (chunk awal `523.43 kB` / `164.24 kB` gzip); live API/Chromium check bersih (`docs/design/UI_TEST_REPORT.md`).

## Remaining / Next Action
- Siap untuk review pengguna atau merge `feat/ui-ux-transformation` ke `main`. Item minor tersisa (`trust proxy`, `EADDRINUSE` callback, literal `'DONOR'` di `auth.ts`) dicatat di `KNOWN_ISSUES.md`.
