# Project State

**As of:** 2026-11-22 · **Branch:** `fix/audit-packages-1-2-3` (dari `feat/doku-qris-sandbox`) · **Phase:** Post-audit hardening & Muzakki/Public UX simplification (Paket 1–3 complete).

- **Blockchain (`blockchain/`):** Canonical Hardhat `2.29` + Solidity `0.8.24` (`ZakatVerify.sol`); `npm test` **18/18 passing**; auto-deploy & SQLite recovery on `npm run node:local`. Backend signer aktif untuk dev lokal sehingga `POST /transactions`, `reconcile`, dan `revoke` menembus node lokal Hardhat. Legacy `contracts/` & `backend/contracts/` masih dipertahankan hingga keputusan konsolidasi eksplisit.
- **Backend (`backend/`):** Express 5 + TS + SQLite + ethers; `tsc --noEmit -p .` bersih; `npm test` **81/81 passing**. Validasi Zod, proteksi `/uploads/*` & `/mapping/region/*` non-PII, sanitasi `/campaigns/:id`, penahanan trace donasi `PENDING`, `GET /api/public/network` ringan, serta isolasi upload test di `os.tmpdir()`.
- **Database (`backend/database.sqlite`):** Konsisten (`integrity_check` ok, `foreign_key_check` 0), saldo seimbang (`Rp 20.850.000` donasi terkonfirmasi vs `Rp 11.500.000` tersalurkan & on-chain -> saldo `+Rp 9.350.000 BALANCED`), 3 program zakat aktif, 4 mustahik terverifikasi, 0 anomali terbuka.
- **Frontend (`frontend/`):** React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + wagmi/viem; `npx tsc -b`, `oxlint` (**0 warnings / 0 errors**), dan `vite build` bersih. Beranda publik & `DonorHome` Muzakki telah disederhanakan tanpa jargon teknis berlebih; 4 alur bayar QRIS diselaraskan dengan polling otomatis + panduan sandbox lipat.
