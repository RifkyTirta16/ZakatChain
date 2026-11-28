# ZakatChain — Architecture Reference

**Updated:** 2026-11-28 · Synchronized with [agent-memory/ARCHITECTURE.md](agent-memory/ARCHITECTURE.md).

## Monorepo Layout

```
ZakatChain/
├── .github/workflows/  GitHub Actions CI (blockchain, backend, frontend)
├── backend/            Express 5 API (TypeScript, ESM, tsx runtime, SQLite, ethers v6)
├── blockchain/         Canonical Hardhat 2.29 workspace (ZakatVerify.sol, Solidity 0.8.24)
├── docs/               Audit history & UI design specifications
└── frontend/           React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + viem
```

> **Note:** Legacy `contracts/` and empty `backend/contracts/` were removed per `DEC-007`; `blockchain/` is the sole canonical smart contract workspace.

## Backend (`backend/blockchain/`)

- **Entry:** `index.ts` — Express 5 (`port 5000`), `trust proxy` (`loopback` default), strict security headers (`nosniff`, `DENY`, `no-referrer`, `Permissions-Policy`), explicit CORS allowlist in production (fail-closed `Origin` CSRF guard for cookie mutations) with loopback flexibility in non-production, scoped auth/global rate limiters, and lazy SQLite initialization.
- **Database:** SQLite (`models/db.ts`, WAL mode, `PRAGMA foreign_keys = ON`, `busy_timeout = 5000`). Additive schema migrations and performance indexes across `users`, `transactions`, `transaction_allocations`, `mustahik`, `campaigns`, `donations`, `payments`, `payment_events`, `anomalies`, `audit_logs`, `reconciliation_logs`, and `poverty_stats` (38 provinces + 114 cities/regencies).
- **Auth & RBAC:** `HttpOnly; SameSite=Lax` JWT cookie sessions (24h) with `token_version` revocation (including `POST /api/auth/logout?all=true`), `bcrypt` (cost 10), lockout tracking + `PATCH /api/users/:id/unlock`, `middleware/auth.ts` (`optionalAuthenticate`, `authenticate`, `authorize`, `authorizeSelfOr`). Roles: `USER | AMIL | AUDITOR | ADMIN`.
- **Audit Hashing & Web3 Reliability (`DEC-003`):** `generateRecordAuditHash` computes a unique record SHA-256 hash over transaction fields + row ID, transformed via `ethers.id(hex)` to `bytes32` for `ZakatVerify.registerReport`. Backend writes serialize through `enqueueChainWrite` using explicit `pending` nonces and explicit timeouts (`utils/web3.ts`), with `GET /api/admin/blockchain/telemetry` exposing signer balance, `owner()` match, latency, and queue depth.
- **Payments, Operational & Public APIs:** Supports campaign and campaign-less donations (`UnifiedPaymentFlow`) via DOKU Checkout Sandbox QRIS + local fallback simulator, polling cooldown + `EXPIRED` sync + amount validation (`utils/doku.ts`), and HMAC-SHA256 webhooks. Exposes `/api/admin/overview`, `/api/reconciliation/three-way` (SQL `period` filter), `/api/payments` + `/api/payments/:sessionId/events`, `/api/transactions/:id` cross-module detail, `/api/transactions/reconcile-batch`, `/api/donations/me/overview`, `/api/public/distributions` (JSON + CSV via `utils/csv.ts`), `/api/explorer/verify/lookup/:query`, and `?meta=1` paginated envelopes.
- **Uploads & Privacy:** Proof uploads validated by magic bytes and stored with random names under `backend/uploads/`. `/uploads/*` is protected by `authenticate` + `authorize(['AMIL', 'AUDITOR', 'ADMIN'])` with attachment + sandbox CSP headers.

## On-Chain (`blockchain/`)

- **Contract:** `ZakatVerify.sol` — owner-only `registerReport(bytes32, uint256)` and `revokeReport(bytes32, string)` with sticky revocation, zero-hash protection, original timestamp preservation, and `owner()` / `verifyReport(bytes32)` views.
- **Local Startup Recovery:** `hardhat.config.cjs` hooks `TASK_NODE_SERVER_READY` to deploy `ZakatVerify` and invoke `backend/blockchain/sync_local_chain.ts` (verifying `contract.owner() === signerAddress` before replaying `CONFIRMED`/`REVOKED` hashes onto restarted local Hardhat nodes).

## Frontend (`frontend/src/`)

- **Entry & Routing:** `main.tsx` mounts `QueryClientProvider` (`src/queryClient.ts`, 60s staleTime) around `MainApp.tsx` inside `<ErrorBoundary>` with lazy-loaded pages & role shells, `RequireRole` (`authHydrating` guard + `canAccessPath` redirect validation), and Vite chunking without eager `vendor-web3` or `recharts` preloads on `/`.
- **Dual-Altitude UX (`DESIGN.md`):**
  - *Muzakki & Public:* Concise Indonesian UX centered on `LandingPage`, `ZakatCalculatorPage`, `UnifiedPaymentFlow`, `PaymentSuccessCard`, `DonorHome`, `MyDonationsPage` (`DonationReceiptDrawer` for BSZ & proportional trace), `PublicTransparencyPage` (`87,5%` / `12,5%` amil policy, integrity scorecard, paginated non-PII CSV export), and progressive `PublicVerify` (*Verdict First, Hash Second*).
  - *Admin & Staff:* Consolidated Command Center (`AdminHome` 4-tab view, `PaymentWebhookMonitor`, `TransactionDetailDrawer` across transactions/proofs/anomalies/audit), `ReconciliationPage` (clickable 3-way view), `RolesPermissionsPage` (lockout & unlock), `NetworkMonitorPage`, `MustahikPage` (8-Asnaf summary), `PovertyMapping` (38 provinces + 114 cities, `PovertyImportModal`), and paginated operational ledgers.
- **Environment Config:** Dev requests route via Vite `/api` and `/uploads` proxies; production builds use `VITE_API_URL`. Chain config uses `VITE_CHAIN_ID`, `VITE_RPC_URL`, and `VITE_ZAKAT_CONTRACT_ADDRESS` via `viem` (`src/web3.ts`).

## Verification Gates

- `cd blockchain && npx hardhat compile`
- `cd backend && npx tsc --noEmit`
- `cd frontend && npx tsc -b && npm run lint && npm run build` (`"strict": true`, `oxlint` `0 warnings / 0 errors`, Vite chunked build)
