# Project State

**As of:** 2026-11-21 · **Branch:** `feat/elegant-web3-ui-and-role-sync` · **Phase:** Feature-complete Web2+Web3 institutional build with local Hardhat persistence, strict RBAC/security hardening, and upgraded Web3 UI.

- Git repository initialized; canonical development branches track changes cleanly (`main` + feature branches).
- Backend (`backend/`): Express 5 + TypeScript + SQLite + ethers; `npx tsc --noEmit -p .` clean; `npm test` **75/75 pass**. Protected routes enforce `authenticate` + `authorize`, CORS allowlist, security headers, Zod validation, `trust proxy`, per-limiter rate limiting, webhook HMAC verification, and `audit_logs`.
- Smart Contract (`blockchain/`): Canonical Hardhat 2.29 + Solidity `0.8.24` (`ZakatVerify.sol` with sticky `revokeReport`); `npm test` **18/18 passing**; auto-deploy & SQLite recovery on local `hardhat node` restart. Legacy `contracts/` & `backend/contracts/` remain untouched pending explicit removal decision.
- Frontend (`frontend/`): React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + wagmi/viem; `npx tsc -b` clean, `oxlint` **0 warnings / 0 errors (83 files)**, `vite build` clean with zero chunk `>500 kB` warnings (`index` `79.29 kB`, largest `vendor-charts` `418.59 kB`).
- Visual & Role Architecture: Institutional Web3 × Islamic Fintech visual system (`Ondo` / `Safe{Wallet}` / `Aave Glass` / `ENS`) implemented across public pages and role-specific shells/homes (`USER`, `AMIL`, `AUDITOR`, `ADMIN`), verified live in headless Chromium `1280x800` including JWT-authenticated `/uploads/*` proof preview (`200 OK`) and `ADMIN /donate` `403` isolation.
- Active DB: `backend/database.sqlite` with additive schema (`users`, `transactions`, `transaction_allocations`, `mustahik`, `campaigns`, `donations`, `payments`, `payment_events`, `anomalies`, `audit_logs`, `reconciliation_logs`, `poverty_stats`).
- Production deployment still requires external environment configuration (`JWT_SECRET`, RPC endpoint, deployed contract address, `BLOCKCHAIN_PRIVATE_KEY`, production webhook secret) in `backend/.env` / `frontend/.env` without fallback defaults.
