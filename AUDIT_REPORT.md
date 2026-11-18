# ZakatChain — Comprehensive Code Audit

> **Historical snapshot (2026-11-08).** Current source and test evidence is recorded in
> `docs/audit/GEMINI_FULL_AUDIT.md` (2026-11-12). Do not treat this report's defect status as current without re-verifying it.

**Auditor role:** Senior Code Auditor
**Date:** 2026-11-08
**Scope:** Read-only audit of `/home/jarvis/ZakatChain`
**Method:** Static inspection of source; selective runtime verification of the SQLite file, installed dependency versions, and package exports. No source file was modified, no dependency installed, no functionality rebuilt.

> Verification note: the shell was intermittently unavailable during the session. Every claim below is grounded in a specific file/line or a completed command. Claims that could **not** be executed live are labelled `[inspection]` (code-derived, not executed). Claims verified by a running command are labelled `[verified]`.

---

## 1. Executive Summary

ZakatChain is a zakat distribution transparency system composed of four loosely-coupled sub-projects. The *conceptual* architecture is sound: an off-chain record is persisted first, then anchored on-chain via a hash, with a reconciliation path for retry. Several of the implementation seams between those parts are, however, disconnected.

**The system does not currently run end-to-end as a coherent product.** The most consequential defects:

1. The `audit_logs` table is **never created**, yet two modules read/write it — so the audit-trail feature is 100% non-functional. (`AUD-01`)
2. Three frontend payment screens call **API paths that do not exist** on the backend — the donation flow cannot complete. (`BUG-01`)
3. `PublicVerify` reads a **response shape the backend never returns** and will crash on success. (`BUG-02`)
4. There is **no way to create an ADMIN/AUDITOR/AMIL user** through the API, so the majority of privileged endpoints are unreachable. (`BUG-03`)
5. The Solidity contract exists in **three divergent copies** across three sub-projects; only one is wired to the app. (`DEBT-01`)

Detail is split across the companion documents:
- `BUG_REPORT.md` — defect list with evidence, severity, root cause, fix, regression risk.
- `FEATURE_STATUS.md` — per-feature classification (WORKING / PARTIALLY WORKING / BROKEN / MISSING / NEEDS IMPROVEMENT).
- `TECHNICAL_DEBT.md` — structural, duplication, configuration and security debt.

---

## 2. Repository Layout

```
ZakatChain/
├── frontend/     React 19 + Vite 8 + TS 6 + wagmi/viem + react-router 7 + TanStack Query + Tailwind + Leaflet/Recharts
├── backend/      Express 5 + SQLite (sqlite/sqlite3) + ethers 6 + JWT + bcrypt + multer + zod
│   └── blockchain/   server source (controllers, routes, middleware, models, utils, tests)
│   └── contracts/    a *duplicate* copy of the Solidity sources
│   └── artifacts/    stale committed build output
├── blockchain/   Hardhat project (ZakatVerify.sol) — Hardhat 2 config, Hardhat 3 test/script files
└── contracts/    Hardhat project (ZakatAuditRegistry.sol) — unused by the application
```

There is no git repository, no CI configuration, and no non-template README at the root. `[inspection]`

---

## 3. Area-by-Area Findings

### 3.1 Frontend — components & routing

- **Router:** `frontend/src/MainApp.tsx` mounts `BrowserRouter` and declares 9 routes. All page components exist and are reachable. **WORKING.**
- **Orphan entry file:** `frontend/src/App.tsx\`` — a 26 KB file whose *filename ends in a literal backtick*. `main.tsx:7` imports `./MainApp`, not `./App`. This file imports `./components/LuxuryCard` and `./components/DistributionMap` (**neither exists**). It is dead code. Because its extension is `tsx\`` (not `tsx`), TypeScript's `include: ["src"]` will not compile it, so it does not break `tsc -b` today — but it is a landmine. `[inspection]` (`BUG-04`, `DEBT-02`)
- **Nav active-state:** `MainApp.tsx` highlights nav items with `location.pathname === item.path`, so `/campaigns/:id` matches no item. Cosmetic. `[inspection]`

### 3.2 Frontend — state management

- **Session:** held in `localStorage` (`zakat_user`, `zakat_token`) and mirrored into `useState` in `MainApp.tsx`. Rehydrated on boot with a `try/catch`. Works, but tokens in `localStorage` are XSS-exposed. `[inspection]`
- **Server state:** TanStack Query is used **only** in `Dashboard.tsx` and `PovertyMapping.tsx`. `Campaigns.tsx`, `CampaignDetail.tsx`, `EvidenceGraph.tsx`, `DonationPayment.tsx`, `PublicVerify.tsx`, `OnChainExplorer.tsx` use ad-hoc `useEffect` + `useState`. Inconsistent, not broken. `[inspection]`
- **Auth redirect:** `utils/api.ts` response interceptor clears storage and hard-redirects to `/` on 401. Reasonable. `[inspection]`

### 3.3 Backend — API endpoints

- `backend/blockchain/index.ts` mounts 13 routers under `/api/*`, plus `/health`. `[verified]` (line listing).
- **Payment-router mismatch:** the app-level router is mounted at **`/api/payments` (plural)** and exposes only `POST /generate` and `POST /webhook`. Three frontend files call non-existent paths — see `BUG-01`. `[verified]`
- **Audit endpoint:** `GET /api/audit` executes a query against a table that is never created → always HTTP 500. `BUG-05`. `[inspection]`
- **Dashboard "network status"** (`dashboardController.ts:56-60`) is a hard-coded literal `{rpc:'Connected', contract:'Active', status:'Healthy'}` regardless of actual RPC state. `NEEDS IMPROVEMENT` (`DEBT-05`). `[inspection]`

### 3.4 SQLite database & schema

- Schema is defined in `backend/blockchain/models/db.ts`. It creates **9 tables**: `users, transactions, payments, reconciliation_logs, anomalies, poverty_stats, campaigns, donations, payment_events`. `[verified]` (grep of `CREATE TABLE`).
- **`audit_logs` is absent** from the schema, but is inserted into by `utils/auditLogger.ts:10` and selected by `controllers/auditController.ts:6-12`. `[verified]` (grep: only these two references exist; no `CREATE TABLE audit_logs` anywhere). This is the root of `AUD-01`.
- **Additive migrations** via `ensureColumn()` are idempotent and covered by `tests/database.test.ts`. **WORKING.**
- **Money as `REAL`:** `transactions.amount` and `donations.amount` are `REAL` — floating-point currency. `DEBT-06`. `[inspection]`
- **`payments` table is dead:** no controller reads or writes it; it is created but unused. `MISSING` (payment-session storage). `[inspection]`

### 3.5 Solidity smart contracts

Three divergent copies exist:

| Path | Contract | pragram | Access control on `registerReport` | Used by app? |
|---|---|---|---|---|
| `blockchain/contracts/ZakatVerify.sol` | `ZakatVerify` | 0.8.24 | none (write-once guard) | deployed target |
| `backend/contracts/ZakatVerify.sol` | `ZakatVerify` | 0.8.24 | `onlyOwner` + dup guard | duplicate |
| `contracts/contracts/ZakatAuditRegistry.sol` | `ZakatAuditRegistry` | 0.8.19 | none | **no** |

- The ABI in `backend/blockchain/utils/web3.ts` matches `ZakatVerify` (uint256 reportId). `[inspection]`
- **Frontend ABI disagrees:** `frontend/src/web3.ts` declares `registerReport(bytes32, string reportId)` (string, not uint256) — but that file is only consumed by the orphan `App.tsx\``, so it is inert today. `BUG-06`. `[inspection]`
- `blockchain/contracts/ZakatVerify.sol` was observed to change on disk during the audit (a hardened rewrite adding a zero-hash guard and a write-once require, plus owner-only `revokeReport`). The version in `backend/contracts/` still carries `onlyOwner` on `registerReport`, which the live ABI/backend writer would violate unless the backend key is the contract owner. **See `BUG-07` / `DEBT-01`.** `[inspection]`
- `contracts/contracts/ZakatAuditRegistry.sol` uses `mapping(string => ...)` — a dead-end design (unbounded string keys, no linkage to the app). Entirely unused. `[inspection]`

### 3.6 Hardhat configuration

- **`contracts/`**: config is ESM Hardhat 2, `solidity: 0.8.19`. `ignition/modules/ZakatModule.js:2` imports `@nomicfoundation/hardhat-ignition/modules-base`. `[verified]` (package.json `exports` contains only `.`, `./modules`, `./helpers` — **`./modules-base` does not exist**). Deployment via Ignition is therefore **BROKEN**. `BUG-08`
- **`blockchain/`**: `package.json` pins `hardhat ^2.29.1` `[verified]` and `hardhat.config.cjs` is Hardhat-2 style (`require("@nomicfoundation/hardhat-toolbox")`). But `test/Counter.ts` and `scripts/send-op-tx.ts` use the **Hardhat 3** `network.create()` API, and the README/AGENTS describe a Hardhat 3 project. The `Counter` contract source is absent (only `Counter.sol.bak` / `Counter.t.sol.bak`). `npx hardhat test` cannot pass. `BUG-09`. `[inspection]`
- **`backend/hardhat.config.cjs`** exists in the backend root but is not referenced by any runtime script — leftover. `DEBT-03`. `[inspection]`

### 3.7 ethers.js integration

- `backend/blockchain/utils/web3.ts` builds a `JsonRpcProvider` (default `http://127.0.0.1:8545`), an optional `Wallet` from `BLOCKCHAIN_PRIVATE_KEY`, and a typed contract facade. `[inspection]`
- **Graceful degradation is correct:** `createTransaction` persists the row first, then attempts `registerReport`, leaving the row in `PENDING_BLOCKCHAIN` if the chain is unavailable, with a retry path in `reconcileTransaction` (ADMIN-only). This is the strongest part of the system. **WORKING** (design), `NEEDS IMPROVEMENT` (N+1 RPC in anomaly scan, `DEBT-07`).
- Hash derivation is consistent: `ethers.id(audit_hash_hex)` on both write and verify paths. `[inspection]`

### 3.8 File uploads

- `middleware/upload.ts` uses multer disk storage, 5 MB limit, MIME allow-list (`jpeg/png/pdf`). Filenames are `${fieldname}-${Date.now()}-${rand}${ext}`. Works. `[inspection]`
- SHA-256 of the uploaded file is computed in `transactionController.ts:61-62` and stored in `file_hash`. **WORKING.**
- **No static serving:** `proof_url` is set to `/uploads/<file>` but no `express.static('uploads')` is registered anywhere → the URL is a dead link. `[verified]` (grep for `express.static` returned nothing). `BUG-10`
- MIME type is trusted from the client (`fileFilter` uses `file.mimetype`) — spoofable. `NEEDS IMPROVEMENT` (`DEBT-08`).

### 3.9 Authentication & authorization

- JWT (`jsonwebtoken`), bcrypt-hashed passwords (cost 10), 24h expiry, `authenticate` + role-based `authorize()` middleware. Correctly refuses to run without `JWT_SECRET` (503). **WORKING.**
- **No admin bootstrap:** `register` (`authController.ts:18`) hard-codes `role = 'USER'`. There is no seed and no endpoint that creates ADMIN/AUDITOR/AMIL. Consequently every `authorize(['ADMIN', …])` / `['ADMIN','AMIL']` route is unreachable in a fresh deployment. `BUG-03`
- **No rate limiting** on `POST /api/auth/login`. `DEBT-09`.
- **CORS is wide open** (`app.use(cors())`) while the frontend stores bearer tokens in `localStorage`. `DEBT-10`.

### 3.10 Dependencies & configuration

Installed versions were confirmed by reading each package's `package.json` under `node_modules` `[verified]`:

| Package | Declared | Installed |
|---|---|---|
| react | ^19.2.8 | 19.3.0 |
| vite | ^8.3.0 | 8.3.4 |
| typescript (frontend) | ~6.0.2 | 6.0.3 |
| wagmi | ^3.7.7 | 3.7.7 |
| viem | ^2.57.6 | 2.57.6 |
| lucide-react | ^1.57.0 | 1.57.0 |
| express | ^5.3.0 | 5.3.0 |
| sqlite3 | ^6.0.1 | 6.0.1 |
| multer | ^2.4.0 | 2.4.0 |
| zod | ^4.6.7 | 4.6.7 |
| bcrypt | ^6.0.0 | 6.0.0 |
| hardhat | ^2.29.1 | 2.29.1 |

All declared versions resolve to real, installed packages — **no phantom dependency versions**. The `package.json` files, however, are internally inconsistent (backend lists Hardhat/typechain/solidity-coverage tooling that the backend runtime never uses; `contracts/package.json` declares `typescript ^7.0.2` while `blockchain/package.json` declares `~6.0.3`). `DEBT-04`.

- `backend/tsconfig.json` sets `"types": []` yet the code uses Node globals (`process`, `Buffer`). Compilation is not enforced (runtime uses `tsx` with type-stripping), so this is latent. `DEBT-11`.
- `backend/dist/` and `frontend/dist/` are stale committed build output. `DEBT-12`.

---

## 4. Severity Ledger

| ID | Area | Severity |
|---|---|---|
| AUD-01 | Missing `audit_logs` table | **CRITICAL** |
| BUG-01 | Frontend payment endpoints 404 | **CRITICAL** |
| BUG-02 | `PublicVerify` response-shape crash | **HIGH** |
| BUG-03 | No ADMIN/privileged account bootstrap | **HIGH** |
| BUG-04 | Orphan `App.tsx\`` referencing missing components | **MEDIUM** |
| BUG-05 | `/api/audit` always 500 (=AUD-01) | **HIGH** |
| BUG-06 | Frontend ABI signature disagrees (inert file) | **LOW** |
| BUG-07 | Divergent contract access control vs backend writer | **HIGH** |
| BUG-08 | Ignition `modules-base` import path invalid | **MEDIUM** |
| BUG-09 | `blockchain/` HH2-config vs HH3-tests mismatch | **MEDIUM** |
| BUG-10 | `proof_url` not served statically | **MEDIUM** |

Full detail in `BUG_REPORT.md`.

---

## 5. Overall Feature Verdict

- **WORKING:** auth (login/register/JWT), transaction create + on-chain anchor + retry, file hashing, DB bootstrap + additive migrations, webhook signature verification (HMAC, idempotent, transactional), dashboard + poverty-mapping read views, on-chain explorer, campaign list/create/detail, evidence graph rendering, CSV export (with caveats), public health check.
- **PARTIALLY WORKING:** campaign fundraising (progress never updates), anomaly engine (writes to DB but reports `anomaliesFound: 0`), poverty mapping (falls back to built-in demo data), data export (unsafe CSV quoting), audit trail (schema missing).
- **BROKEN:** donation/QRIS checkout (3 screens), public verification page, Ignition deployment in `contracts/`, the `blockchain/` Hardhat test suite.
- **MISSING:** `payments`-table lifecycle, admin account provisioning, static upload serving, admin UI for anomaly/proof/audit workflows (backend endpoints exist but no reachable admin), CI.

See `FEATURE_STATUS.md` for the per-feature table and `TECHNICAL_DEBT.md` for remediation sequencing.
