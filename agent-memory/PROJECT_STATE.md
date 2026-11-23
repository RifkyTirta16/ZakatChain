# Project State

**As of:** 2026-11-23 · **Branch:** `main` (digabung bersih dari `feat/lifecycle-cors-ci-cleanup`) · **Phase:** Feature complete & clean repo (`~6 MB` tanpa `node_modules`/`.git`), GitHub Actions CI ready.

- **Blockchain (`blockchain/`):** Satu-satunya workspace Hardhat `2.29` + Solidity `0.8.24` (`ZakatVerify.sol`); `npm test` **18/18 passing**; auto-deploy & SQLite recovery saat `npm run node:local`. Folder lama `contracts/` & `backend/contracts/` telah dihapus per `DEC-007`.
- **Backend (`backend/`):** Express 5 + TS + SQLite + ethers; `tsc --noEmit -p .` bersih; `npm test` **83/83 passing**. Mendukung CORS dev loopback dinamis, `PATCH /campaigns/:id`, `PATCH /auth/password`, pemetaan 38 Provinsi + 114 Kota/Kabupaten, audit log lengkap, dan pengecualian konsisten record `REJECTED`/`REVOKED`.
- **Database (`backend/database.sqlite`):** Konsisten (`integrity_check` ok, `foreign_key_check` 0), saldo seimbang (`Rp 20.850.000` donasi terkonfirmasi vs `Rp 11.500.000` tersalurkan & on-chain -> `+Rp 9.350.000 BALANCED`), `poverty_stats` berisi **38 Provinsi + 114 Kota/Kabupaten**, 3 program zakat aktif, 4 mustahik terverifikasi, 0 anomali terbuka.
- **Frontend (`frontend/`):** React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + `viem` (tanpa `wagmi`, **0 `any` casts** di `frontend/src/`); `npm test` **14/14 passing**, `npx tsc -b`, `oxlint` (**0 warnings / 0 errors**), dan `vite build` bersih. Mendukung kelola program (AMIL/ADMIN) di `CampaignDetail.tsx`, ganti sandi di `ProfilePage.tsx`, dan matriks `/mustahik` di `RolesPermissionsPage.tsx`.
