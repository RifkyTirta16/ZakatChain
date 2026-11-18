# ZakatChain — Full Repository Audit

**Audit date:** 2026-11-12  
**Scope:** Current source and configuration under `/home/jarvis/ZakatChain`; local test/build checks; read-only inspection of the backend's default SQLite database.  
**Evidence policy:** Findings are classified as verified from current source, verified by an executed command, potential risk, historical, or unverified. No `.env` file contents or application records were inspected. No public network or real payment transaction was attempted.

## Executive summary

The repository is a multi-package Web2/Web3 application, not a single root-managed workspace. Current source differs materially from the 2026-11-08 baseline documents: several listed P0 defects are now fixed (audit log schema, CSV escaping, payment aliases, upload serving, test coverage), while other risks remain. A safe first payment fix was applied in this audit: campaign-less sessions now validate, and donation attribution comes from the authenticated user rather than request input. The backend suite now passes after correcting integration isolation and fixtures.

**Current readiness:** not release-ready. The frontend builds, backend tests/typecheck pass, and the active SQLite file passes physical integrity checks. Blockchain tests are not currently discovered by the default Hardhat command (0 passing); the explicit TypeScript test invocation fails to parse its type annotations. Public upload access, unrestricted on-chain registration, permissive CORS, absent rate limiting, split chain configuration, and unverified deployment ownership/address remain release blockers or design decisions.

## Repository and tooling

- **Verified:** root contains `frontend/`, `backend/`, `blockchain/`, `contracts/`, `docs/`, and `.integration/`.
- **Verified:** no `.git` metadata was found within the workspace and `git rev-parse --show-toplevel` reports that the workspace is not a Git repository. No Git history or remote state was changed; no repository was initialized.
- **Verified:** no GitHub workflow/CI configuration or frontend unit/e2e test configuration was found in the inspected tree.
- **Verified:** package scripts are per-workspace. Backend: `dev`, `start`, `test`; frontend: `dev`, `build`, `lint`, `preview`; blockchain: `test`; contracts workspace test script is a placeholder that exits with failure.
- **Verified:** backend runtime is Express 5/TypeScript via `tsx`; frontend is React/Vite/TypeScript with wagmi/viem; the blockchain workspace declares Hardhat 2.29.x, ethers 6, Solidity 0.8.24.

## Current architecture (as inspected)

1. **Frontend:** `frontend/src/main.tsx` mounts Wagmi and TanStack Query providers around `MainApp`. `MainApp.tsx` owns login session state and routes dashboard, mapping, campaigns, evidence graph, explorer, donation, distribution creation, and verification pages. The live frontend API base remains hard-coded to `http://localhost:5000/api`; wagmi targets Mainnet and Sepolia.
2. **Backend:** `backend/blockchain/index.ts` creates the Express application, lazy-initializes one SQLite connection, and mounts route groups under `/api`. The payment provider implementation is explicitly a sandbox; webhook authenticity is HMAC-checked. Blockchain reads/writes use `utils/web3.ts`, ethers, `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, and `ZAKAT_CONTRACT_ADDRESS`.
3. **Database:** `backend/blockchain/models/db.ts` defines users, transactions, payments, reconciliation logs, anomalies, poverty statistics, campaigns, donations, payment events, and audit logs. It turns on foreign-key enforcement, WAL for file databases, and additive transaction migrations.
4. **Blockchain:** per accepted `DEC-001`, `blockchain/contracts/ZakatVerify.sol` is the intended canonical source. `backend/contracts/ZakatVerify.sol` is a divergent legacy copy; `contracts/contracts/ZakatAuditRegistry.sol` is a separate legacy contract. Deployment address, deployed bytecode, owner, signer, and active network were not verified.

## Verified findings

### Fixed or improved in current source

- `audit_logs` is created and indexed; backend tests exercise table creation and API reads. The historical claim that it is absent is stale.
- CSV output quotes/escapes values and protects spreadsheet formula prefixes. A regression test covers malicious values. The earlier CSV-injection finding is no longer current.
- Payment routers include `/generate`, `/session`, `/create`, `/status/:sessionId`, `/verify/:paymentId`, and a signed webhook. The singular campaign route is also mounted. The frontend payment integration test exercises these shapes.
- Uploaded content is inspected by file signature and stored under generated names. `/uploads` is served with dotfiles denied and directory indexes disabled. This fixes broken proof URLs, but public reachability remains a privacy risk below.
- SQLite foreign keys are enabled in source. The active `backend/database.sqlite` exists, its schema includes `audit_logs`, and `PRAGMA integrity_check` returned `ok`; `PRAGMA foreign_key_check` returned no rows. This checks file integrity and existing referential constraints, not business-data correctness.
- Audit hashing now includes the persistent record ID (`generateRecordAuditHash`), avoiding identical-content collisions. Audit hash uniqueness is intentionally not imposed in SQLite.
- Anomaly scanning counts newly inserted anomalies; webhook processing is transactional and idempotent by provider event ID.
- Backend providers created for request-scoped chain probes are now destroyed after use to avoid leaked retry timers during RPC failures.

### Changes made during this audit

- `PaymentIntentSchema` now permits an absent `campaign_id` for the existing general donation form.
- The payment controller derives `donor_id` from the authenticated request identity and ignores client-supplied attribution.
- Integration tests now seed valid users/records under active SQLite foreign-key enforcement, assert an actual missing-proof anomaly, and account for text decoding removing a CSV BOM.
- A test-only DB reset hook prevents integration tests from reusing a cached connection to a deleted temporary database.
- Strict backend TypeScript diagnostics found during baseline were fixed; the subsequent compiler run was clean.
- Follow-up runtime check on 2026-11-12 reproduced HTTP 503 `Authentication is not configured`. A value-safe check found no root, backend, or frontend `.env` file. Backend loads `backend/.env` from an absolute module-relative path. Without nonempty `JWT_SECRET`, it now warns but still starts; health returned HTTP 200 while protected API returned HTTP 503. The operator must configure the local secret and restart to enable authentication.

### Remaining verified risks / gaps

| Priority | Finding | Evidence and impact |
|---|---|---|
| P0 | Uploaded proof files are served publicly | `index.ts` mounts `/uploads` without authentication or per-record authorization. Proofs may contain beneficiary identity or sensitive evidence. Directory listing is disabled, but possession/guessing of a URL is not access control. Do not make this a private-data channel until an authorization/redaction design is chosen. |
| P0 | First-class rate limiting is absent | No limiter is configured in backend startup/routes. Authentication, payment session creation, webhook processing, and potentially expensive scans lack application-level throttling. |
| P0 | Contract registration is permissionless | Canonical `ZakatVerify.registerReport` is callable by anyone; duplicate and zero hashes are rejected, but anyone may register other hashes. `revokeReport` is owner-only. This is a verified source policy, not proof of an exploit against a deployed contract. Decide whether permissionless anchoring is intentional and establish the real deployed owner/signer before release. |
| P1 | CORS is unrestricted | `app.use(cors())` allows any origin by default. Combined with browser-stored bearer tokens, this broadens the exposure surface; define an explicit deployment allowlist. |
| P1 | Browser token is in localStorage | `frontend/src/MainApp.tsx` and `utils/api.ts` store/read `zakat_token` from localStorage. An XSS defect could expose it. No XSS was demonstrated in this audit. |
| P1 | Chain configuration stories are split | Frontend wagmi uses Mainnet/Sepolia; backend defaults to local RPC `127.0.0.1:8545`. API base is hard-coded. No end-to-end chain/receipt verification was run. |
| P1 | General payment completion is not fully integrated | General (non-campaign) sessions now validate, but current code only creates a `donations` row when `campaign_id` is present. The webhook can update the payment session without a linked donation; dashboard donation totals derive from `donations`. Therefore a general payment is not yet a complete recorded donation flow. The provider is sandbox-only and cannot confirm real QRIS payment. |
| P1 | No admin bootstrap workflow is evident | Self-registration assigns `USER`; tests promote an account directly in SQLite. Provisioning a first ADMIN/AMIL/AUDITOR remains an operational dependency. Do not accept client-supplied roles. |
| P1 | Hardhat suite is not providing contract-test coverage | `npm test` compiled one Solidity source but reported **0 passing**. Explicit `npx hardhat test test/ZakatVerify.test.ts` failed with `SyntaxError: Unexpected token ':'` on TypeScript test syntax. The current Hardhat 2/CJS config and ESM/TypeScript test setup are inconsistent. |
| P1 | Contract sources still diverge | Canonical source permits anyone to register and rejects zero hash; `backend/contracts/ZakatVerify.sol` uses `onlyOwner` and different revert text/invariants. Legacy workspaces/artifacts can mislead deployment. No deployment address was verified. |
| P2 | Orphan frontend source remains | `frontend/src/App.tsx\`` has a literal trailing backtick, is not imported by `main.tsx`, and contains old API/Web3 code. It is not the active application entry. Do not delete until references/build scope are formally checked. |
| P2 | No backend/frontend automated integration or CI gate | Backend has 67 node:test tests. Frontend has build/lint only; no CI config was found. Blockchain tests are undiscovered as noted above. |
| P2 | Frontend quality warnings and bundle size | Build succeeds but emits a >500 kB minified chunk warning. Lint completes with 7 warnings: unused catch variables (4), hook dependency (1), render purity (1), and setState-in-effect (1). |

## Verified test and database baseline

- Backend `npm test`: **67 passed, 0 failed** after the audit fixes.
- Backend `npx tsc --noEmit -p tsconfig.json`: completed without diagnostics after fixing three reported strict-type errors.
- Frontend `npm run build`: succeeded (`tsc -b` + Vite); Vite warned that one minified chunk is over 500 kB.
- Frontend `npm run lint`: completed with 7 warnings; no failing lint command reported.
- Blockchain `npm test`: Solidity compile succeeded, but Mocha reported **0 passing**. Explicit TypeScript test path failed parsing; contract behavior is therefore not verified by executed tests.
- SQLite `backend/database.sqlite`: file exists; schema-only inspection found the expected tables; `PRAGMA integrity_check` returned `ok`; `PRAGMA foreign_key_check` returned no rows. No user rows or credentials were read.

## Historical findings reconciled

The 2026-11-08 documents remain useful history, not current authority. Confirmed no longer current: missing audit table, unsafe CSV escaping, absent upload serving, missing payment route aliases, deterministic identical-record hash collision, and several missing integration checks. Still current or partially current: CORS allow-all, no rate limiting, hard-coded frontend API/chain configuration, contract-source divergence, public proof access risk, missing admin provisioning, and contract test discovery/toolchain mismatch. Some older claims about exact frontend response shapes and payment failures are contradicted by current source/tests.

## Unverified assumptions and limits

- No `.env` contents were read. Contract address, RPC endpoint, deployed chain, deployed contract bytecode, owner, signer, and real signing permissions remain unverified.
- No public deployment, real funds, or payment provider was contacted.
- SQLite checks establish physical integrity and no reported FK violations, not data correctness, duplicate policy, privacy compliance, backups, or recovery.
- No beneficiary records were queried. Public exposure of any specific record was not tested beyond source configuration.
- No dependency vulnerability scan was run; declared dependency ranges are not a vulnerability assessment.
- No Git diff/history can be produced because this workspace is not a Git repository. Files changed by this audit are recorded in `agent-memory/ACTIVE_TASK.md` and the session summary.

## Prioritized next actions

1. **P0 privacy:** design authenticated proof retrieval and redaction/retention rules before changing public file serving; identify whether existing proof uploads contain personal data without displaying it.
2. **P0 availability/security:** add scoped rate limiting and explicit CORS origin configuration, including safe webhook limits.
3. **P0 chain trust:** decide registration authorization policy; align canonical ABI/source and deployment artifact; verify RPC chain ID, contract bytecode/address, owner and backend signer in a local controlled network.
4. **P1 payment integrity:** persist a donation record for general payment intents, link signed webhook outcomes idempotently, and test that only trusted confirmation marks it paid. Keep sandbox labels explicit.
5. **P1 blockchain QA:** reconcile Hardhat 2 vs ESM/TypeScript project configuration so `npm test` runs actual `ZakatVerify` tests; require a nonzero test count.
6. **P1 operations:** establish a secret-safe ADMIN bootstrap procedure; add env-driven frontend API/chain configuration and document deployment.
7. **P2 release confidence:** add CI, frontend tests, end-to-end tests, privacy-safe backup/restore verification, and resolve lint/bundle warnings.
