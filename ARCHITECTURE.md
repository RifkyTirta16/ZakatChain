# ZakatChain — Architecture Reference

**Updated:** 2026-11-23 · Synchronized with [agent-memory/ARCHITECTURE.md](agent-memory/ARCHITECTURE.md).

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

- **Entry:** `index.ts` — Express 5 (`port 5000`), `trust proxy` (`loopback` default), strict security headers (`nosniff`, `DENY`, `no-referrer`), explicit CORS allowlist in production with loopback port flexibility in non-production, global + scoped auth rate limiters, and lazy SQLite initialization.
- **Database:** SQLite (`models/db.ts`, WAL mode, `PRAGMA foreign_keys = ON`, `busy_timeout = 5000`). Additive schema migrations across `users`, `transactions`, `transaction_allocations`, `mustahik`, `campaigns`, `donations`, `payments`, `payment_events`, `anomalies`, `audit_logs`, `reconciliation_logs`, and `poverty_stats` (38 provinces + 114 cities/regencies).
- **Auth & RBAC:** JWT Bearer tokens (24h), `bcrypt` (cost 10), `middleware/auth.ts` (`authenticate`, `authorize`, `authorizeSelfOr`). Roles: `USER | AMIL | AUDITOR | ADMIN`. Self-registration (`POST /api/auth/register`) always assigns `USER` and respects `ALLOW_PUBLIC_REGISTRATION`. Self-service password change at `PATCH /api/auth/password`.
- **Audit Hashing (`DEC-003`):** `generateRecordAuditHash` computes a unique record SHA-256 hash over transaction fields + row ID, transformed via `ethers.id(hex)` to `bytes32` for `ZakatVerify.registerReport`.
- **Payments:** Supports campaign and campaign-less donations via DOKU Checkout Sandbox QRIS + local fallback simulator, polling order status sync, and HMAC-SHA256 verified webhooks (`paymentController.ts`, `utils/doku.ts`). Legacy `payments` / `donations` schema consolidation remains tracked in `DEC-002`.
- **Uploads & Privacy:** Proof uploads validated by magic bytes and stored with random names under `backend/uploads/`. `/uploads/*` is protected by `authenticate` + `authorize(['AMIL', 'AUDITOR', 'ADMIN'])`.

## On-Chain (`blockchain/`)

- **Contract:** `ZakatVerify.sol` — owner-only `registerReport(bytes32, uint256)` and `revokeReport(bytes32, string)` with sticky revocation, zero-hash protection, and original timestamp preservation; public read view `verifyReport(bytes32)`.
- **Local Startup Recovery:** `hardhat.config.cjs` hooks `TASK_NODE_SERVER_READY` to deploy `ZakatVerify` and invoke `backend/blockchain/sync_local_chain.ts` to replay SQLite `CONFIRMED`/`REVOKED` hashes onto restarted local Hardhat nodes.

## Frontend (`frontend/src/`)

- **Entry & Routing:** `main.tsx` mounts `QueryClientProvider` (`src/queryClient.ts`, 60s staleTime) around `MainApp.tsx` (React Router 7 lazy-loaded pages, `RequireRole` route guard with cross-role cache clearing & `canAccessPath` redirect validation).
- **Environment Config:** API base via `VITE_API_URL` (falls back to `http://localhost:5000/api` or `/api` over LAN dev); chain config via `VITE_CHAIN_ID`, `VITE_RPC_URL`, and `VITE_ZAKAT_CONTRACT_ADDRESS` using `viem` directly (`src/web3.ts`). Unused `wagmi` removed.
- **Mapping & Verification:** Leaflet interactive map (`PovertyMapping.tsx`) supports national 38-province stats and 114-city/kabupaten drilldown (`src/utils/cityCoords.ts`, `src/utils/regions.ts`); `PublicVerify` & `OnChainExplorer` verify hashes against `/api/explorer/verify/*` and reinforce that blockchain proofs anchor audit hashes rather than physical delivery truth.

## Verification Gates

- `cd blockchain && npm test` (Hardhat Mocha/Chai contract suite)
- `cd backend && npx tsc --noEmit && npm test` (Typecheck + `node:test` API/integration suite)
- `cd frontend && npm test && npx tsc -b && npm run lint && npm run build` (`node:test` utils/RBAC suite + `tsc` + `oxlint` + Vite build)
