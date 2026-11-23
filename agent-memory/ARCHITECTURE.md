# ZakatChain — Architecture Snapshot (Verified)

**Updated:** 2026-11-23 · Synchronized with root [ARCHITECTURE.md](../ARCHITECTURE.md).

## Monorepo Layout
- `blockchain/`: Canonical Hardhat `2.29` + Solidity `0.8.24` (`ZakatVerify.sol`, `18/18` passing, auto-deploy + `sync_local_chain` recovery on `npx hardhat node`). Legacy `contracts/` and `backend/contracts/` were removed per `DEC-007`.
- `backend/`: Express 5 + TypeScript (`tsx` ESM), prefix `/api`, SQLite (`models/db.ts` with `FK ON`, `WAL`, `busy_timeout = 5000`), Zod validation, `bcrypt` + JWT auth (`USER`, `AMIL`, `AUDITOR`, `ADMIN`), `ethers` v6 (`utils/web3.ts`), and DOKU Sandbox QRIS Checkout + HMAC webhook (`utils/doku.ts`). `npm test`: **83/83** passing.
- `frontend/`: React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + `viem` (`utils/web3.ts` / `queryClient.ts`; unused `wagmi` removed). `npm test` (**14/14** via `node:test`), `tsc -b`, `oxlint` (`0/0`), and Vite chunked build cleanly passing.
- `.github/workflows/ci.yml`: Automated CI running blockchain, backend, and frontend suites on push/PR to `main`.

## Core Architectural Decisions & Flow
- **Audit Hashing (`DEC-003`):** Deterministic SHA-256 over record payload + database row ID (`generateRecordAuditHash`), anchored via `ethers.id(hash)` (`bytes32`) to `ZakatVerify.registerReport`. Blockchain proves hash presence only — never field distribution truth.
- **Access & Privacy Boundaries:** `/uploads/*` and operational ledgers require `AMIL`/`AUDITOR`/`ADMIN`; `/public/transparency` and `/mapping/region/:region` strip beneficiary/donor PII for public/`USER`; `queryClient.clear()` + `canAccessPath` isolate multi-role switching on shared browsers.
- **Payments & Reconciliation:** Both campaign and campaign-less ("Zakat Umum") donations persist across `payments` + `donations` + `payment_events` (`DEC-002` deduplication open backlog) and settle idempotently via webhook/status sync; `reconcileTransaction` and `performReconciliation` write immutable entries to `audit_logs` and refuse `REJECTED`/`REVOKED` distributions.
