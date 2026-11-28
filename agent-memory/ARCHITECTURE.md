# ZakatChain — Architecture Snapshot (Verified)

**Updated:** 2026-11-28 · Synchronized with root [ARCHITECTURE.md](../ARCHITECTURE.md).

## Monorepo Layout
- `blockchain/`: Canonical Hardhat `2.29` + Solidity `0.8.24` (`ZakatVerify.sol`, auto-deploy + `sync_local_chain.ts` dengan validasi `contract.owner() === signerAddress` saat `npx hardhat node`). Legacy `contracts/` dan `backend/contracts/` telah dihapus per `DEC-007`.
- `backend/`: Express 5 + TypeScript (`tsx` ESM), prefix `/api`, SQLite (`models/db.ts` dengan `FK ON`, `WAL`, `busy_timeout = 5000`, +7 indeks performa aditif), Zod validation, `bcrypt` + JWT `HttpOnly` cookie session (`USER`, `AMIL`, `AUDITOR`, `ADMIN`), `ethers` v6 (`utils/web3.ts` dengan `enqueueChainWrite` nonce mutex, `pending` nonce, timeout eksplisit & `getBlockchainTelemetry`), serta DOKU Sandbox QRIS Checkout + HMAC webhook (`utils/doku.ts`).
- `frontend/`: React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + `viem` (`"strict": true`, `oxlint` `0/0` pada 84 file, Vite chunk splitting tanpa preload `vendor-web3`/chart di `/`). Mengusung **Dual-Altitude UX** Bahasa Indonesia untuk Muzakki/Publik dan Admin/Staf Command Center.
- `.github/workflows/ci.yml`: CI 3-job otomatis (`hardhat compile`, `backend tsc --noEmit`, `frontend tsc -b && npm run lint && npm run build`).

## Core Architectural Decisions & Flow
- **Audit Hashing (`DEC-003`):** SHA-256 deterministik atas payload penyaluran + ID baris database (`generateRecordAuditHash`), dikirim ke `ZakatVerify.registerReport` sebagai `bytes32` (`ethers.id(hash)`). Blockchain membuktikan pencatatan hash audit saja — bukan kebenaran distribusi fisik di lapangan (`ON_CHAIN_NOTE`).
- **Access & Privacy Boundaries:** `/uploads/*`, `/transactions/:id`, dan ledger operasional dibatasi untuk `AMIL`/`AUDITOR`/`ADMIN`; `/public/transparency`, `/public/distributions`, dan `/mapping/region/:region` menanggalkan PII penerima/donor; `dashboard/stats` menanggalkan PII & anomali internal bagi `USER`; `AdminHome`/`/api/admin/*`/`/api/reconciliation/three-way`/`/api/payments*` dibatasi untuk `AUDITOR`/`ADMIN`; mutasi chain, snapshot rekonsiliasi, & `users/:id/(role|unlock)` khusus `ADMIN`.
- **Dual-Altitude UX & Reconciliation:** Muzakki memakai 1 alur terpadu (`UnifiedPaymentFlow` -> `PaymentSuccessCard` -> `DonationReceiptDrawer` BSZ & Jejak Wilayah); publik memakai `PublicTransparencyPage` (kebijakan `87,5%` / `12,5%`, skor integritas, ekspor CSV non-PII) dan `PublicVerify` progresif (*Verdict First, Hash Second*). Admin memakai `AdminHome` Command Center, `PaymentWebhookMonitor`, `TransactionDetailDrawer` lintas modul, dan `ReconciliationPage` 3-arah (*Gateway QRIS <-> Buku Besar SQLite <-> Smart Contract*).
