# ZakatChain — Architecture Baseline

> As-is snapshot, established 2026-11-08 by the Principal Architect role.
> This document describes what EXISTS, not what is planned. Changes require a DECISIONS.md entry.

## Monorepo Layout

```
ZakatChain/
├── backend/          Express.js API (TypeScript, ESM, tsx runtime)  ← THE live API
├── blockchain/       Hardhat workspace (contracts, tests, deploy)
├── contracts/        Secondary Hardhat workspace (legacy ZakatAuditRegistry)
└── frontend/         React 19 + Vite + Tailwind + wagmi/viem
```

### Workspace duplication warning
There are **two Hardhat workspaces** (`blockchain/` and `contracts/`) and **two copies of
`ZakatVerify.sol`** (`blockchain/contracts/` and `backend/contracts/`). `contracts/` holds
`ZakatAuditRegistry.sol` (string-keyed registry, unused by the backend). `backend/contracts/`
holds ABI source copies. The runtime only uses `blockchain/contracts/ZakatVerify.sol`.
Treat `contracts/` as LEGACY — do not extend it without a DECISIONS.md ruling.

## Backend (`backend/blockchain/`)

- Entry: `index.ts` — Express 5, port 5000, lazy DB init middleware, 13 route groups.
- DB: SQLite via `sqlite3` + `sqlite` wrapper, `models/db.ts`.
  Tables: `users`, `transactions`, `payments`, `reconciliation_logs`, `anomalies`,
  `poverty_stats`, `campaigns`, `donations`, `payment_events`.
  Additive migrations via `ensureColumn` (proof_status, proof_rejection_reason,
  is_reconciled, blockchain_status, tx_hash, block_number).
- Auth: JWT (Bearer, 24h), `middleware/auth.ts` — `authenticate` + `authorize(roles)`.
  Roles: ADMIN | AMIL | AUDITOR | DONOR | USER. bcrypt (cost 10). Registration hard-codes role USER.
- Blockchain client: `utils/web3.ts` — ethers v6, `ZakatVerify` ABI inline,
  RPC `http://127.0.0.1:8545`, signer from `BLOCKCHAIN_PRIVATE_KEY`.
- Hash flow: `generateAuditHash` = SHA-256 of JSON-ified record → `ethers.id(hex)` → keccak
  bytes32 on-chain key.
- Tests: `node:test` + in-memory SQLite (`tests/database.test.ts`, `tests/paymentWebhook.test.ts`).

## On-chain

- `ZakatVerify.sol`: owner-gated `registerReport(bytes32, uint256)`, `revokeReport`,
  `verifyReport(bytes32)` → (exists, timestamp, revoked). Events: ReportRegistered, ReportRevoked.
- Deploy default address in `.env.example`: `0x5FbDB231...` (Hardhat network account #0 first deploy).
- Tests: `blockchain/test/ZakatVerify.test.ts` (happy path only — no auth/revocation/dup tests yet).

## Frontend (`frontend/src/`)

- Entry `MainApp.tsx` — react-router v7, routes: `/` Dashboard, `/mapping`, `/campaigns`,
  `/graph`, `/explorer`, `/donate`, `/new-record`, `/verify`.
- API client `utils/api.ts` — axios, baseURL hardcoded `http://localhost:5000/api`,
  JWT from `localStorage.zakat_token`, 401 → wipe + redirect `/`.
- wagmi config targets mainnet + sepolia with injected wallet; backend talks to localhost:8544
  Hardhat. **These two chain stories are not wired to each other.**
- Leaflet map (indonesia_districts geojson asset), recharts analytics.
- Styling theme: `wattvision-*` Tailwind tokens (repurposed from another project).

## Environment Contracts

- backend `.env`: PORT, JWT_SECRET, DATABASE_PATH, BLOCKCHAIN_RPC_URL,
  ZAKAT_CONTRACT_ADDRESS, BLOCKCHAIN_PRIVATE_KEY, PAYMENT_WEBHOOK_SECRET.
- blockchain `.env`: PRIVATE_KEY, SEPOLIA_RPC_URL.
- Frontend has NO env file — API base and chain config are hardcoded.

## Known-As-Is Gaps (from baseline audit, 2026-11-08)

1. `audit_logs` table is written by `utils/auditLogger.ts` but NOT created in `db.ts` schema.
2. `/uploads/<file>` proof files are stored by multer but never served (no static middleware).
3. `payments` table is created but the payment flow actually uses `donations` + `payment_events`.
4. CSV export does not escape `"` / `=` prefixes → CSV injection.
5. No rate limiting anywhere (auth, payments, scan).
6. `anomalyController` Rule 4 makes per-row RPC calls in a synchronous loop.
7. Frontend API base + wagmi chain config hardcoded, ignores env.
8. `web3.ts` `getZakatContract(provider)` connects signerless contract for writes; callers
   must `.connect(wallet)` — fragile pattern, works today but easy to misuse.
