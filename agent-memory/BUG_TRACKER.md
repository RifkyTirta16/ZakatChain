# Bug Tracker (Current Evidence)

**Updated:** 2026-11-23 · Synced against `main`. Historical 2026-11-12 items resolved across Packages 1–5 + feature batch.

## Open / Release Prerequisites
- **OPEN / Prod Ops:** Local Hardhat `BLOCKCHAIN_PRIVATE_KEY`, `JWT_SECRET`, and DOKU Sandbox credentials in `backend/.env` must be replaced with production keys and deployed smart contracts (Sepolia/Mainnet) before live launch.
- **OPEN / Data Ref:** `poverty_cities.json` (114 Kota/Kabupaten) uses province-anchored calibration references; replace via `POST /api/mapping/import` once official BPS Kab/Kota datasets are supplied.
- **OPEN / P2 (`DEC-002`):** `payments` + `donations` dual-write persistence and legacy payment route aliases remain pending an explicit migration decision.
- **OPEN / P2:** Rate-limiting relies on in-memory `Map` stores (move to Redis if scaling to multiple backend instances); browser E2E uses manual/ad-hoc Chromium verification rather than committed Playwright CI specs.

## Resolved
- `/uploads` & `/mapping/region/*` PII access controls (`AMIL`/`AUDITOR`/`ADMIN` on `/uploads`, non-PII masking on public/USER routes).
- Explicit CORS allowlist + dev loopback port flexibility (`5173`/`5174`/`127.0.0.1`), HTTP security headers (`nosniff`, `DENY`, `no-referrer`), and scoped `rateLimit` stores.
- Hardhat canonical `ZakatVerify.sol` sticky-revoke invariants (`18/18` passing), auto-deploy/recovery (`TASK_NODE_SERVER_READY` + `sync:local-chain`), and `contracts/` + `backend/contracts/` removal (`DEC-007`).
- General & campaign donations, DOKU Sandbox QRIS polling + HMAC webhook verification, multi-region allocations/trace, mustahik CRUD, `PATCH /campaigns/:id`, and `PATCH /auth/password`.
- KPI/category/pending exclusion of `REJECTED`/`REVOKED` reports, `audit_logs` completeness (`reconcileTransaction`, `performReconciliation`, `updateCampaign`, `changePassword`), anomaly anti-loop scan, and cross-role `queryClient.clear()` + `canAccessPath` redirect guard.
- Frontend TypeScript unit test suite (`14/14` via `node:test`), `oxlint` (`0` warnings/errors), Vite chunk splitting without `wagmi` overhead, and GitHub Actions CI (`.github/workflows/ci.yml`).
