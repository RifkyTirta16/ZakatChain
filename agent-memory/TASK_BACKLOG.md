# Prioritized Task Backlog

**Updated:** 2026-11-23 · P0/P1 audit backlog from 2026-11-12 is resolved; below reflects remaining engineering & pre-production items.

## Completed Milestones
1. Authenticated `/uploads` access, per-role RBAC (`USER`, `AMIL`, `AUDITOR`, `ADMIN`), `/mapping` PII stripping, and `/campaigns/:id` redaction.
2. Environment CORS allowlist (`403` untrusted, loopback dev flexibility), security headers, `trust proxy`, `ALLOW_PUBLIC_REGISTRATION`, and `create:admin` CLI (`seed_admin.ts`).
3. Canonical `blockchain/` `ZakatVerify.sol` (`18/18` passing) + legacy workspace removal (`DEC-007`).
4. General + campaign DOKU Sandbox QRIS checkout, HMAC webhooks, multi-region `transaction_allocations`, Mustahik registry, and `PATCH /campaigns/:id` + `PATCH /auth/password`.
5. 38-Province + 114-City/Kabupaten poverty spatial mapping (`poverty_stats`), anomaly scan false-positive fixes, `audit_logs` reconciliation trail, frontend `node:test` unit suite, CI workflow, and bundle cleanup.

## Remaining / Backlog
1. **Production Keys & Deployment:** Provision KMS/multisig signer + `JWT_SECRET`, deploy `ZakatVerify` to target testnet/mainnet, configure live DOKU credentials & HTTPS notification URL, and swap SQLite/local uploads for production DB/object storage when scaling.
2. **Official City BPS Dataset Import:** Import official BPS county/city survey JSON through `/mapping` (`POST /api/mapping/import`) to replace calibrated references.
3. **`DEC-002` & Long-File Modularization (Optional Refactor):** Consolidate `payments` vs `donations` schema & split `>300`-line controllers/pages (`paymentController.ts`, `PovertyMapping.tsx`, `NewDistributionRecord.tsx`) and eliminate remaining `db as any` helpers.
4. **Automated Browser E2E (Optional):** Add dedicated headless Playwright workflow alongside existing unit/integration suites.
