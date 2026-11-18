# ZakatChain — Project Baseline

> Frozen reference of what existed and what was verified at baseline review, 2026-11-08.
> Roadmap and task claims are measured against this baseline.

## Inventory (verified by file inspection)

| Workspace | Stack | State |
|---|---|---|
| `backend/` | Express 5 + TS (ESM/tsx), SQLite, bcrypt+JWT, ethers v6, zod, multer | Functional API, 13 route groups, 2 test files |
| `blockchain/` | Hardhat + ethers, `ZakatVerify.sol`, 1 test file | Compiles per artifacts/; test coverage minimal |
| `contracts/` | Hardhat + Ignition (JS), `ZakatAuditRegistry.sol` | Legacy/unused by runtime |
| `frontend/` | React 19, Vite, Tailwind, wagmi v3, viem, Leaflet, recharts | 8 pages + auth, axios client |

## Feature Map (as-built)

| Feature | Backend | Frontend | Chain |
|---|---|---|---|
| Auth (register/login/JWT/roles) | ✅ `authController` | ✅ `LoginPage` | — |
| Distribution transactions + proof upload | ✅ `transactionController` | ✅ `NewDistributionRecord` | ✅ registerReport |
| Proof verification workflow | ✅ `proofController` (PATCH /verify/:id) | partial | — |
| On-chain public verify | ✅ `explorerController` | ✅ `PublicVerify` | ✅ verifyReport |
| Reconciliation (retry/pending tx) | ✅ `reconcileTransaction` | — | ✅ |
| Period reconciliation (balance) | ✅ `reconciliationController` | — | — |
| Campaigns + donations | ✅ `campaignController`, `donationController` | ✅ Campaigns/CampaignDetail | — |
| QRIS sandbox payment + signed webhook | ✅ `paymentController` | ✅ `DonationPayment`/`PaymentModal` | — |
| Dashboard KPIs | ✅ `dashboardController` | ✅ `Dashboard` | — |
| Anomaly detection (5 rules) | ✅ `anomalyController` | — | read-only |
| Poverty mapping + priority score | ✅ `mappingController` | ✅ `PovertyMapping` (Leaflet) | — |
| CSV export | ✅ `exportController` | — | — |
| Audit trail | ⚠️ writer exists, TABLE MISSING | — | — |

## Roles matrix (as-built)

| Endpoint | ADMIN | AMIL | AUDITOR | USER | Public |
|---|---|---|---|---|---|
| GET /transactions | ✅ | ✅ | ✅ | ✅ | — |
| POST /transactions (distribusi) | ✅ | — | — | ✅ | — |
| PATCH /transactions/:id/reconcile | ✅ | — | — | — | — |
| PATCH /proofs/verify/:id | ✅ | — | ✅ | — | — |
| POST /campaigns | ✅ | ✅ | — | — | — |
| GET /campaigns | public | public | public | public | ✅ |
| GET /anomalies, /scan, /resolve | ✅ | — | ✅ | — | — |
| GET /audit | ✅ | — | ✅ | — | — |
| GET /export/csv | ✅ | — | ✅ | — | — |
| GET /mapping/* | any authed | any authed | any authed | any authed | — |
| GET /explorer/verify/* | public | public | public | public | ✅ |
| POST /payments/generate | public | public | public | public | ✅ |
| POST /payments/webhook | HMAC | HMAC | HMAC | HMAC | ✅ |
| GET /donations | any authed | any authed | any authed | any authed | — |

## Verified code-level facts (evidence anchors)

- `authController.ts:18` — role hardcoded `'USER'`; no invite/admin bootstrap path.
- `paymentController.ts:59-128` — HMAC SHA-256 verify + timingSafeEqual + BEGIN IMMEDIATE
  idempotency guard on `provider_tx_id`. Solid.
- `transactionController.ts:83-118` — persist-then-chain with idempotent reconcile fallback. Solid pattern.
- `paymentRoutes.ts:7` — `POST /payments/generate` is UNAUTHENTICATED (accepts arbitrary donor_id).
- `explorerRoutes.ts` — public verify returns DB record fields (amount/category/region) publicly.
- `web3.ts:62` — wallet connect pattern; contract ABI inline, no codegen.
- Schema: `audit_logs` referenced by `auditLogger.ts:10` but absent in `models/db.ts`.
- `index.ts` — no `express.static` for `/uploads`; no rate limiter; CORS wide open.

## Test baseline (execution pending)

Bash execution was classifier-blocked during the baseline session; the following are
UNVERIFIABLE until first run:
- `node --import tsx --test blockchain/tests/*.test.ts` (backend)
- `npx tsc -b` (frontend)
- `npx hardhat test` (blockchain)

First coordinator action after tooling recovers: run all three and record results here.
