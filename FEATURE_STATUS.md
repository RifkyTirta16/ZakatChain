# ZakatChain — Feature Status

> **Historical snapshot (2026-11-08).** Current verification is in `docs/audit/GEMINI_FULL_AUDIT.md` (2026-11-12); statuses below are not authoritative for current source.

**Date:** 2026-11-08 · Read-only audit. Legend: **WORKING** · **PARTIALLY WORKING** · **BROKEN** · **MISSING** · **NEEDS IMPROVEMENT**.

Status reflects the code as it exists. Where a feature was confirmed by a running command it is marked `[verified]`; otherwise the basis is static inspection `[inspection]`.

---

## Frontend

| Feature | Status | Evidence / Notes |
|---|---|---|
| App bootstrap & providers | WORKING | `main.tsx` wires `WagmiProvider` + `QueryClientProvider` + `MainApp`. |
| Routing (9 routes) | WORKING | `MainApp.tsx` `Routes`; every target page file exists. |
| Nav active-state for detail routes | NEEDS IMPROVEMENT | `location.pathname === item.path` never matches `/campaigns/:id`. |
| Session persistence (localStorage) | WORKING | `MainApp.tsx` rehydrates with try/catch. |
| Session security (token in localStorage) | NEEDS IMPROVEMENT | XSS-exposed; see `DEBT-10`. |
| Login page | WORKING | `LoginPage.tsx` → `POST /api/auth/login`. |
| Register UI | MISSING | Backend `POST /api/auth/register` exists; no UI surfaces it. |
| Dashboard (KPIs, charts, table, filters) | WORKING | `Dashboard.tsx`; TanStack Query, 30 s refetch. |
| Dashboard "network status" panel | NEEDS IMPROVEMENT | Hard-coded `Connected/Active/Healthy` (`dashboardController.ts:56-60`). |
| Poverty mapping (map + detail + priority list) | PARTIALLY WORKING | Renders, but falls back to **built-in demo data** when `poverty_stats` empty (`mappingController.ts:19-32`); UI discloses this. Frontend re-derives province matching because backend matches `region` exactly. |
| Poverty data import (paste JSON) | WORKING | `POST /api/mapping/import`, ADMIN/AMIL. |
| New distribution record form | WORKING | `NewDistributionRecord.tsx` → multipart `POST /api/transactions`; client + server validation aligned. |
| Campaigns list | PARTIALLY WORKING | List renders, but progress bars read frozen `current_amount` (BUG-14). |
| Campaign create (modal) | WORKING | Gated to ADMIN/AMIL in UI; `POST /api/campaigns`. |
| Campaign detail | WORKING | `GET /api/campaigns/:id`; `total_confirmed` aggregate is correct. |
| Campaign donate / QRIS | BROKEN | Calls `/payment/generate` (singular) — BUG-01. |
| Donation payment page (session/QR/poll) | BROKEN | Calls `/payments/session` and `/payments/status/:id` — BUG-01. |
| Payment modal component | BROKEN | Calls `/payments/create` and `/payments/verify/:id`; not imported by any live route — dead + broken. |
| Public verification portal | BROKEN | Consumes wrong response shape; crashes on success — BUG-02. |
| On-chain explorer | WORKING | `OnChainExplorer.tsx` reads the correct `{blockchain, database, status, match}` shape. |
| Evidence graph | WORKING | SVG graph built from campaigns/donations/transactions; degrades gracefully. |
| Analytics component | PARTIALLY WORKING | `Analytics.tsx` present but not imported by any live route (legacy). |
| Orphan `App.tsx\`` | BROKEN / dead | Imports non-existent `LuxuryCard`, `DistributionMap` — BUG-04. |
| Leaflet map rendering | WORKING | `PovertyMapping.tsx` + local GeoJSON; schematic polygons only (disclosed). |
| Geo province dataset vs districts dataset | NEEDS IMPROVEMENT | `indonesia_provinces.json` (8 schematic features), `indonesia_districts.json`, `indonesia_provinces_backup.json` — three sources, unclear provenance. |

## Backend API

| Feature | Status | Evidence / Notes |
|---|---|---|
| Server bootstrap / DI of `db` | WORKING | `index.ts` lazy-init per request; 503 on failure. |
| `/health` | WORKING | `index.ts:32`. |
| Auth: login | WORKING | bcrypt compare + JWT 24h; refuses without `JWT_SECRET`. |
| Auth: register | PARTIALLY WORKING | Works, but always `role='USER'` (BUG-03). |
| Auth: role provisioning | MISSING | No seed/endpoint for ADMIN/AUDITOR/AMIL (BUG-03). |
| Auth: rate limiting | MISSING | No throttle on login. |
| Transactions: list (+search/filter) | WORKING | `getTransactions`. |
| Transactions: create (multipart) | WORKING | Persist-first design; anchors on-chain with graceful downgrade. |
| Transactions: reconcile (ADMIN) | WORKING | Idempotent; verifies on-chain before re-submitting. |
| Transactions: audit-hash uniqueness | BROKEN | Deterministic hash → collisions (BUG-12). |
| Proof status update (ADMIN/AUDITOR) | PARTIALLY WORKING | Updates `transactions.proof_status`, but its `logActivity` write is silently lost (BUG-05). |
| Anomaly scan | PARTIALLY WORKING | Inserts anomalies correctly but returns `anomaliesFound: 0` (BUG-13); N+1 RPC calls. |
| Anomaly list / resolve | WORKING | `getAnomalies`, `resolveAnomaly`. |
| Dashboard stats | WORKING | `getDashboardStats`; but "networkStatus" is fake. |
| Reconciliation run/history | PARTIALLY WORKING | Runs and logs; label/query mismatch vs `payments` (BUG-16). |
| Mapping stats / recommendations / region | WORKING | Falls back to demo data when table empty. |
| Mapping import | WORKING | `INSERT OR REPLACE`; validates required fields. |
| Explorer verify (by id / by hash) | WORKING | Public; validates 32-byte hex. |
| CSV export | PARTIALLY WORKING | Works but unsafe quoting / no filter (BUG-15). |
| Audit log read | BROKEN | 500 — table missing (BUG-05). |
| Payment: generate QR | WORKING | Creates donation + payment event; sandbox payload. |
| Payment: webhook | WORKING | HMAC-SHA256 verified, `timingSafeEqual`, idempotent, transactional `BEGIN IMMEDIATE`. Best-implemented component. |
| Payment: session/status/verify routes | MISSING | Not defined; UI expects them (BUG-01). |
| Donations: list / by donor | WORKING | `getDonations`, `getDonorHistory`. |
| Donations: create route | MISSING | Donations are created only as a side effect of `POST /payments/generate`. |
| Campaigns: list/create/detail | WORKING | — |
| Campaigns: current_amount maintenance | BROKEN | Never updated (BUG-14). |
| File upload (multer) | WORKING | 5 MB, MIME allow-list, disk storage, SHA-256 hashed. |
| Uploaded file retrieval | MISSING | No static mount (BUG-10). |
| `payments` table lifecycle | MISSING | Table created, never read/written by any controller. |

## Database

| Feature | Status | Evidence / Notes |
|---|---|---|
| Schema bootstrap (9 tables) | WORKING | `db.ts` `CREATE TABLE IF NOT EXISTS`. |
| Additive migrations (`ensureColumn`) | WORKING | Idempotent; covered by `tests/database.test.ts`. |
| `audit_logs` table | MISSING | Referenced by 2 modules, never created (BUG-05). |
| `payments` table usage | MISSING | Dead table. |
| Money precision | NEEDS IMPROVEMENT | `REAL` columns for currency. |
| Foreign-key enforcement | NEEDS IMPROVEMENT | `PRAGMA foreign_keys` never enabled; FKs declared but unenforced by default in SQLite. |
| Indexes | NEEDS IMPROVEMENT | No indexes on `transactions.region/category/blockchain_status`, `donations.campaign_id`. |
| Tests (db + webhook) | WORKING | `node:test` suites exist and target in-memory DBs. |

## Blockchain

| Feature | Status | Evidence / Notes |
|---|---|---|
| `ZakatVerify` contract (canonical) | PARTIALLY WORKING | Three divergent copies; access control unclear (BUG-07, DEBT-01). |
| `ZakatAuditRegistry` contract | MISSING (unused) | `contracts/contracts/`; not referenced by app; `pragma 0.8.19`. |
| `blockchain/` Hardhat config | BROKEN | HH2 config + HH3 tests + missing `Counter` (BUG-09). |
| `blockchain/` deploy scripts | PARTIALLY WORKING | `deploy.cjs`/`deploy.ts` are HH2-style and coherent with `ZakatVerify`. |
| `contracts/` Hardhat config | WORKING (config only) | ESM HH2, solidity 0.8.19. |
| `contracts/` Ignition module | BROKEN | Imports `modules-base` which doesn't exist (BUG-08). |
| `blockchain/` Ignition Counter module | BROKEN | Targets a contract whose source is absent. |
| ethers.js provider/wallet wiring | WORKING | Provider + optional wallet from env; contract facade typed. |
| On-chain anchor + retry | WORKING | Persist-first, `PENDING_BLOCKCHAIN` fallback, reconcile path. |
| Contract ownership/authorization probe | MISSING | No startup check; reverts swallowed silently. |
| `blockchain/test/ZakatVerify.test.ts` | PARTIALLY WORKING | HH2/chai style; may run under the installed Hardhat 2 if the config is fixed. |
| `blockchain/test/Counter.ts` | BROKEN | HH3 API + missing contract. |

## Configuration & Tooling

| Feature | Status | Evidence / Notes |
|---|---|---|
| `.env.example` (backend, blockchain) | WORKING | Documents all required vars. |
| Committed secrets | NEEDS IMPROVEMENT | `contracts/hardhat_contracts.log` contains 20 well-known Hardhat test private keys (harmless, but sloppy). |
| CORS policy | NEEDS IMPROVEMENT | `cors()` with no origin restriction. |
| Dependency hygiene | NEEDS IMPROVEMENT | Backend `package.json` mixes runtime + Hardhat tooling; version ranges inconsistent across the three sub-projects. |
| Build artifacts committed | NEEDS IMPROVEMENT | `backend/dist`, `frontend/dist`, `backend/artifacts`, `*/cache`. |
| CI / automated checks | MISSING | No CI configuration anywhere. |
| Frontend lint config | WORKING | `oxlint` with react/typescript/oxc plugins; no `lint` gate in CI. |
| Root README / docs | MISSING | Only sub-project READMEs (two of which are framework templates). |
| TypeScript strictness (backend) | NEEDS IMPROVEMENT | `types: []` yet Node globals used; no compile gate (runtime uses `tsx`). |
