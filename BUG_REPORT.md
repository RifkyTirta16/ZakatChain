# ZakatChain — Bug Report

> **Historical snapshot (2026-11-08).** Several findings below have changed or been fixed.
> Use `docs/audit/GEMINI_FULL_AUDIT.md` for current verified status before acting on this list.

**Date:** 2026-11-08 · **Method:** read-only static analysis; runtime checks where the shell allowed.
Each entry: file path(s) · technical evidence · severity · root cause · recommended solution · regression risk.
No source file was modified.

---

## BUG-01 — Donation / QRIS checkout calls endpoints that do not exist

**Files**
- `frontend/src/pages/CampaignDetail.tsx:31`
- `frontend/src/pages/DonationPayment.tsx:16,29`
- `frontend/src/components/PaymentModal.tsx:21,39`

**Evidence**
The backend mounts the payment router only at `/api/payments` and declares exactly two routes:

```ts
// backend/blockchain/index.ts:54
app.use('/api/payments', paymentRoutes);
// backend/blockchain/routes/paymentRoutes.ts
router.post('/generate', generatePaymentQR);
router.post('/webhook', handlePaymentWebhook);
```
```ts
// CampaignDetail.tsx:31 — SINGULAR "payment", and no such mount exists
apiClient.post('/payment/generate', { campaign_id: id, amount: parseFloat(amount) })
// DonationPayment.tsx:16,29 — routes never defined
apiClient.post('/payments/session', formData)
apiClient.get(`/payments/status/${paymentData.session_id}`)
// PaymentModal.tsx:21,39 — routes never defined
axios.post('http://localhost:5000/api/payments/create', ...)
axios.get(`http://localhost:5000/api/payments/verify/${paymentData.paymentId}`, ...)
```

**Severity:** CRITICAL (core "donate" journey is non-functional).

**Root cause:** The frontend and backend evolved against different API contracts. The controllers that would serve these paths (`paymentController`) were renamed/reshaped to `/generate` + `/webhook`, but the UI was not updated. `PaymentModal` additionally expects a `qrCodeUrl` field, while `generatePaymentQR` returns `{ status, provider, paymentData: { qrCode, paymentReference, expiry, amount }, donationId }`.

**Recommended solution:** Freeze one contract. Either (a) add thin backend routes `/payments/session`, `/payments/status/:id`, `/payments/verify/:id` as adapters over the existing donation+webhook model, or (b) update the three UI files to call `POST /api/payments/generate` and reconcile field names. Fix `CampaignDetail`'s singular path regardless. Add a shared API-path constant module so the two sides cannot drift again.

**Regression risk:** Low. Adapter routes are additive; UI edits touch only request URLs/field reads. The real risk is deploying (a) without also handling `donation_id` correlation, but that ships behind the existing sandbox model, not production payment rails.

---

## BUG-02 — `PublicVerify` reads a response shape the backend never returns (crash on success)

**Files:** `frontend/src/pages/PublicVerify.tsx:17,74,84,115,120` · `backend/blockchain/controllers/explorerController.ts:38-58`

**Evidence**
The component stores the response and then indexes `result.data.*`:
```tsx
const response = await apiClient.get(`/explorer/verify/${reportId}`);
setResult(response.data);
...
<h2>…#{result.data.id}</h2>
<p>Rp {result.data.amount?.toLocaleString('id-ID')}</p>
<p>{result.data.audit_hash}</p>
```
The controller returns a **flat, differently-named** object — there is no `data` key:
```ts
return res.json({
  verified: exists,
  blockchain: { exists, timestamp, revoked, formattedHash },
  database: dbInfo ? { id, amount, category, region, status, auditHash } : null,
  match, status
});
```
So on any successful verification `result.data` is `undefined` and `result.data.id` throws `TypeError`, blanking the page. The field names also differ (`audit_hash` vs `database.auditHash`).

**Severity:** HIGH (the flagship "transparency" page fails exactly on the happy path; it only "works" when the request errors).

**Root cause:** The page was written against an earlier response envelope (`{ data: {...} }`) that the controller no longer produces.

**Recommended solution:** Point the page at the real shape: read `result.database?.id`, `result.database?.amount`, `result.database?.auditHash`, `result.blockchain?.formattedHash`, and `result.status`. Render the existing "database null" case explicitly. `OnChainExplorer.tsx` already consumes the correct shape — reuse that mapping.

**Regression risk:** Low–moderate. This page is currently broken, so any correct mapping is an improvement; verify with both an on-chain record and a not-found record (the not-found path currently still renders the `result &&` block and would also crash).

---

## BUG-03 — No way to provision ADMIN / AUDITOR / AMIL accounts

**Files:** `backend/blockchain/controllers/authController.ts:16-19`; all `*.routes.ts` `authorize([...])` guards

**Evidence**
`register` hard-codes the role:
```ts
await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
  [username.trim(), hashedPassword, 'USER']);
```
Every privileged route requires a role that can never be created through the API:
```
transactions POST     authorize(['USER','ADMIN'])
transactions PATCH reconcile  authorize(['ADMIN'])
proofs  PATCH verify  authorize(['ADMIN','AUDITOR'])
anomalies GET/scan/resolve    authorize(['ADMIN','AUDITOR'])
reconciliation POST run       authorize(['ADMIN'])
export  GET csv               authorize(['ADMIN','AUDITOR'])
mapping POST import           authorize(['ADMIN','AMIL'])
campaigns POST                authorize(['ADMIN','AMIL'])
```

**Severity:** HIGH (most of the system's workflows are unreachable on a fresh deployment).

**Root cause:** Deliberate privilege escalation prevention in `register` was correct, but no provisioning path (seed script or admin-only user-management endpoint) was ever added. `backend/seed_campaigns.ts` seeds campaigns only; `backend/blockchain/seed.ts` seeds transactions only.

**Recommended solution:** Add a one-time, ADMIN-authenticated (or CLI/env-gated) endpoint or a documented seed script that mints the first ADMIN; then let ADMINs assign roles. Do **not** re-open `register` to accept a client-supplied role.

**Regression risk:** Moderate if done wrong — the temptation is to accept `role` from the request body, which is a privilege-escalation hole. Keep role assignment server-side and gated.

---

## BUG-04 — Orphan `App.tsx\`` entry file imports components that do not exist

**File:** `frontend/src/App.tsx\`` (filename ends in a literal backtick)

**Evidence**
```
frontend/src/App.tsx`:27:import LuxuryCard from './components/LuxuryCard';
frontend/src/App.tsx`:28:import DistributionMap from './components/DistributionMap';
```
`frontend/src/components/` contains only `Analytics.tsx`, `PaymentModal.tsx`, `auth/`, `wattvision/` — **no `LuxuryCard`, no `DistributionMap`**. Meanwhile the real entry is `main.tsx:7 → import MainApp from './MainApp'`. So this 26 KB file is dead.

**Severity:** MEDIUM (dead code; a latent build break).

**Root cause:** A stale/duplicated dashboard was renamed by appending a backtick instead of being deleted. Its `.tsx\`` extension keeps it out of `tsconfig.app.json`'s `include: ["src"]`, which is the only reason `tsc -b` does not currently fail.

**Recommended solution:** Confirm no build tool consumes it, then delete it (with the filenames normalized to plain `.tsx` in the same commit if any content is still wanted). Do not "fix" it by creating the missing components.

**Regression risk:** Very low — nothing imports it.

---

## BUG-05 — `audit_logs` table is never created → audit endpoints always 500

**Files:** `backend/blockchain/models/db.ts` (schema) · `backend/blockchain/utils/auditLogger.ts:10` · `backend/blockchain/controllers/auditController.ts:6-12`

**Evidence**
`db.ts` creates 9 tables; `audit_logs` is **not** among them `[verified: grep of CREATE TABLE]`. Yet:
```ts
// auditLogger.ts:10 — INSERT into a non-existent table
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip_address) VALUES (?,?,?,?,?,?,?)
// auditController.ts:6 — SELECT from a non-existent table
SELECT a.*, u.username AS actor_username FROM audit_logs a LEFT JOIN users u ...
```
`logActivity` swallows the resulting `SQLITE_ERROR: no such table` (it only `console.error`s), so proof-status changes silently lose their audit trail; `GET /api/audit` returns HTTP 500 every time.

**Severity:** CRITICAL (an audit/traceability product has no working audit log).

**Root cause:** The table was referenced from two call sites but never added to `initDb()`'s `CREATE TABLE IF NOT EXISTS` block. Note `auditController.ts` also selects columns (`actor_username`) via join that the insert schema implies but which were never defined together — the table definition must be written to satisfy both call sites.

**Recommended solution:** Add a `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id INTEGER, action TEXT, entity_type TEXT, entity_id INTEGER, old_value TEXT, new_value TEXT, ip_address TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(actor_id) REFERENCES users(id))` to `initDb()`, consistent with the existing additive-migration style. Add a test asserting the table and a round-trip insert/select.

**Regression risk:** Low — purely additive DDL, consistent with the existing `IF NOT EXISTS` + `ensureColumn` migration approach.

---

## BUG-06 — Frontend contract ABI disagrees with the deployed contract (inert today)

**File:** `frontend/src/web3.ts:8-13`

**Evidence**
```ts
inputs: [ {name:"reportHash", type:"bytes32"}, {name:"reportId", type:"string"} ]  // string
```
Backend ABI (`backend/blockchain/utils/web3.ts:6-14`) and the Solidity both use `uint256 reportId`. The frontend module is imported only by the orphan `App.tsx\`` (BUG-04), so nothing executes it today — but if the orphan is ever revived, its `registerReport` signature would revert.

**Severity:** LOW (latent).

**Root cause:** Two hand-maintained ABI copies.

**Recommended solution:** Export a single ABI (e.g. from the Hardhat artifact JSON) and import it in both frontend and backend; delete `frontend/src/web3.ts`'s hand-rolled copy.

**Regression risk:** Low, contingent on resolving BUG-04 first.

---

## BUG-07 — Solidity `registerReport` access control diverges from the backend writer

**Files:** `blockchain/contracts/ZakatVerify.sol` (current) · `backend/contracts/ZakatVerify.sol` (duplicate) · `backend/blockchain/utils/web3.ts`

**Evidence**
- `backend/contracts/ZakatVerify.sol:27` — `function registerReport(...) external onlyOwner { ... }`
- `blockchain/contracts/ZakatVerify.sol` — `registerReport` has **no** `onlyOwner` (relying on a write-once guard); `revokeReport` is `onlyOwner`.
- The backend writes with `getBlockchainWallet(provider)` from `BLOCKCHAIN_PRIVATE_KEY` and calls `walletContract.registerReport(...)` (`transactionController.ts:101`).

If the deployed contract is the `onlyOwner` variant, every `registerReport` from a non-owner backend key reverts, and `createTransaction` silently downgrades to `PENDING_BLOCKCHAIN` (the error is caught, `transactionController.ts:115-118`), so the failure is invisible at the API layer.

**Severity:** HIGH (silent, total anchoring failure depending on which copy is deployed).

**Root cause:** The same contract exists in three places with different invariants (see `DEBT-01`); there is no single source of truth, and no startup check that the backend key is authorized.

**Recommended solution:** Pick one canonical contract, delete the others, and add a startup/reconciliation-time capability probe (`verifyReport` + an ownership/allowance check) that surfaces "backend signer not authorized" instead of swallowing it. Document the ownership decision explicitly.

**Regression risk:** Moderate — changing access control can break existing deployments; do it deliberately with a migration/deploy step, not by editing in place.

---

## BUG-08 — Ignition module imports a non-existent subpath → `contracts/` cannot deploy

**Files:** `contracts/ignition/modules/ZakatModule.js:2` · `contracts/node_modules/@nomicfoundation/hardhat-ignition/package.json`

**Evidence**
```js
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules-base";
```
The installed package's `exports` map `[verified]` is:
```json
"exports": { ".": "./dist/src/index.js", "./modules": "./dist/src/modules.js", "./helpers": "./dist/src/helpers.js" }
```
There is **no `./modules-base` export**. Immediately correct form (as used by `blockchain/ignition/modules/Counter.ts:1`) is `@nomicfoundation/hardhat-ignition/modules`.

**Severity:** MEDIUM (deployment path in `contracts/` is broken; the project is otherwise unused).

**Root cause:** Wrong import subpath; likely copied from a different Ignition version's docs.

**Recommended solution:** Change to `@nomicfoundation/hardhat-ignition/modules`, or delete the `contracts/` sub-project if it is confirmed superseded (it is not referenced by frontend/backend).

**Regression risk:** Low. Verify the module compiles via `npx hardhat ignition deploy` dry-run.

---

## BUG-09 — `blockchain/` mixes Hardhat 2 configuration with Hardhat 3 test/script APIs and a missing contract

**Files:** `blockchain/package.json` (`hardhat ^2.29.1`, `[verified]` installed 2.29.1) · `blockchain/hardhat.config.cjs` (`require("@nomicfoundation/hardhat-toolbox")`) · `blockchain/test/Counter.ts:4,7` · `blockchain/scripts/send-op-tx.ts:1-6` · `blockchain/contracts/` (only `*.sol.bak`)

**Evidence**
```ts
// blockchain/test/Counter.ts
import { network } from "hardhat";
const { viem } = await network.create();      // Hardhat 3 API
```
```ts
// blockchain/scripts/send-op-tx.ts
const { viem } = await network.create({ network: "hardhatOp", chainType: "op" });
```
But the installed Hardhat is 2.x, and `hardhat.config.cjs` is Hardhat-2 CommonJS. `network.create()` does not exist in Hardhat 2. Additionally, `Counter` has no `.sol` source (only `Counter.sol.bak`, `Counter.t.sol.bak`), so `viem.deployContract("Counter")` cannot resolve. `blockchain/README.md` and `AGENTS.md` both describe a "Hardhat 3 project".

**Severity:** MEDIUM (the `blockchain/` test suite cannot run; the Solidity test that *does* exist — `test/ZakatVerify.test.ts` — is Hardhat-2-style and may be the only runnable one).

**Root cause:** The project was scaffolded from a Hardhat 3 template, its contract sources were later removed/renamed to `.bak`, and the dependency/config were pinned back to Hardhat 2 — leaving the template's HH3 test/scripts orphaned.

**Recommended solution:** Decide the toolchain. For Hardhat 2: rewrite `test/Counter.ts` and `scripts/send-op-tx.ts` to the HH2 style (`ethers`/`hre`), restore or delete the `Counter` sources, and align `README/AGENTS`. For Hardhat 3: upgrade the dependency and config and migrate `test/ZakatVerify.test.ts`. Either way, keep `ZakatVerify.test.ts` runnable.

**Regression risk:** Medium — migrating the framework touches the config the deploy script depends on. Prefer the smaller change (align to Hardhat 2, since it is what is installed) unless Hardhat 3 is a hard requirement.

---

## BUG-10 — Uploaded proof files are stored but never served

**Files:** `backend/blockchain/middleware/upload.ts:7` · `backend/blockchain/controllers/transactionController.ts:63` · `backend/blockchain/index.ts`

**Evidence**
The controller stores a URL intended to be fetched:
```ts
proof_url = `/uploads/${file.filename}`;
```
but `index.ts` registers no static handler, and a grep for `express.static` across `backend/blockchain` returns nothing `[verified]`. Files land in `backend/uploads/` (11 PNGs present on disk) and are unreachable via HTTP.

**Severity:** MEDIUM (proof-of-delivery evidence is not viewable; the "Ada berkas" indicator in the dashboard leads nowhere).

**Recommended solution:** Mount `app.use('/uploads', express.static(uploadDirectory, { dotfiles: 'deny', index: false }))` — with an explicit decision about authorization, since proofs may contain beneficiary PII (`PublicVerify` explicitly claims beneficiary identity is redacted; a public static mount would contradict that).

**Regression risk:** Low technically; **high privacy risk** if mounted publicly. Gate access behind auth and/or serve a redacted/thumbnail form. Coordinate with the privacy claim in `PublicVerify.tsx:144`.

---

## BUG-11 — `AMIL` operators cannot record distributions

**File:** `backend/blockchain/routes/transactionRoutes.ts:12`

**Evidence**
```ts
router.post('/', authenticate, authorize(['USER', 'ADMIN']), uploadSingle, createTransaction);
```
`AMIL` — the zakat-institution operator role, granted campaign creation (`campaignRoutes.ts:8`) and poverty-data import (`mappingRoutes.ts:10`) — is omitted from the distribution-record route, which is the role's core duty. Meanwhile the UI hides the Create-Campaign button behind `['ADMIN','AMIL']` (`Campaigns.tsx:15`), confirming AMIL is an intended operational role.

**Severity:** MEDIUM (role/permission inconsistency).

**Root cause:** Role lists maintained independently per route.

**Recommended solution:** Centralize the role→permission matrix and confirm intent; most likely AMIL belongs in the distribution-create allow-list.

**Regression risk:** Low, but it is a deliberate authorization widening — confirm with the product owner.

---

## BUG-12 — Deterministic audit hash means identical distributions collide on-chain

**Files:** `backend/blockchain/utils/crypto.ts:4-7` · `backend/blockchain/controllers/transactionController.ts:66-77,101`

**Evidence**
```ts
const transactionData = { amount, donor_name, recipient_name, category, region, proof_url, file_hash };
const audit_hash_hex = generateAuditHash(transactionData);   // sha256 of JSON of those fields
const formattedHash = ethers.id(audit_hash_hex);
...
await walletContract.registerReport(formattedHash, transactionId);
```
`transactionData` contains **no unique nonce / id / timestamp**. Two legitimate distributions with the same amount, recipient, category, region and proof state produce the **same** `audit_hash` → the same `formattedHash`. The contract's write-once guard (`require(!reports[reportHash].exists)`) then reverts the second `registerReport`. Because the write path catches blockchain errors and downgrades to `PENDING_BLOCKCHAIN` (`transactionController.ts:115-118`), the second record will look merely "pending" forever, and `reconcileTransaction` will find `verifyReport(formattedHash).exists === true` and mark it CONFIRMED against the **first** record's on-chain entry — a false reconciliation.

**Severity:** HIGH (silent data-integrity failure: two distinct distributions collapse to one on-chain proof, or a record can never anchor).

**Root cause:** The audit hash is a pure function of business fields with no per-record uniqueness, while the on-chain key is that hash.

**Recommended solution:** Include a unique, immutable per-record component in the pre-image — the local `id` (already returned by `result.lastID`) or a UUID/timestamp generated at insert. Hashing `id` together with the payload keeps the record tamper-evident *and* unique. Update the write and verify paths together so `verifyReport` remains consistent.

**Regression risk:** Moderate — changing the hash pre-image invalidates hashes of already-stored rows; any fix must version the format (e.g. `hash_v1` vs `hash_v2`) or backfill, and both the write and verification code must agree.

---

## BUG-13 — Anomaly scan reports `anomaliesFound: 0` even when it inserts anomalies

**File:** `backend/blockchain/controllers/anomalyController.ts:9,71`

**Evidence**
```ts
const newAnomalies: any[] = [];          // never pushed to
...
res.json({ message: 'Anomaly scan completed successfully', anomaliesFound: newAnomalies.length });
```
The loop computes `issues`, persists new rows via INSERT, but never appends to `newAnomalies`, so the response always claims zero findings regardless of what was stored.

**Severity:** LOW (misleading API response; the work is actually done).

**Root cause:** The accumulator was created but not wired to the insert branch.

**Recommended solution:** Increment a counter (or push to `newAnomalies`) inside the insert branch and return the real count.

**Regression risk:** Very low.

---

## BUG-14 — Campaign `current_amount` / progress never reflects confirmed donations

**Files:** `backend/blockchain/controllers/campaignController.ts:41-53` · `frontend/src/pages/Campaigns.tsx:94-105` · `backend/seed_campaigns.ts:11-13`

**Evidence**
`getCampaignDetail` computes `total_confirmed` from the `donations` table and returns it, but `getCampaigns` (`:6-11`) returns the raw `campaigns` row, whose `current_amount` is only ever set by the seed script. The campaign list card renders progress from `campaign.current_amount / campaign.target_amount` (`Campaigns.tsx:94,100,104`). Because the working webhook path updates `donations`, never `campaigns.current_amount`, list progress is frozen at seed values (e.g. `120000000`) while details show a different `total_confirmed`.

**Severity:** MEDIUM (two screens disagree; the headline fundraising metric is static).

**Root cause:** `current_amount` denormalized into `campaigns` with no update on donation confirmation, while the detail endpoint uses a live aggregate.

**Recommended solution:** Either compute campaign progress as an aggregate everywhere (`SUM(donations.amount) WHERE status='CONFIRMED'`), or update `campaigns.current_amount` transactionally inside `handlePaymentWebhook` on `SUCCESS`. Prefer the aggregate to avoid a second source of truth.

**Regression risk:** Low. Deleting the denormalized column later is a migration; the aggregate approach is non-destructive.

---

## BUG-15 — CSV export uses unsafe quoting and dumps the whole table

**File:** `backend/blockchain/controllers/exportController.ts:14-19`

**Evidence**
```ts
const headers = Object.keys(transactions[0]).join(',');
const rows = transactions.map(tx => Object.values(tx).map(val => `"${val}"`).join(','));
```
Values are wrapped in quotes but embedded `"` are **not escaped/doubled**, and embedded newlines are not handled — a `recipient_name` or `region` containing `"` or `\n` corrupts the CSV (or enables CSV injection when opened in a spreadsheet). The endpoint also has no filter/limit and selects `*`.

**Severity:** MEDIUM (data-integrity / formula-injection risk on a downloadable report).

**Recommended solution:** Use a real CSV serializer (double-quoted, quote-escaped, CRLF) or a maintained library; prefix values beginning with `= + - @` to neutralize formula injection; add date-range filtering.

**Regression risk:** Low.

---

## BUG-16 — `reconciliation_logs` stores donation side from `donations` but the reporting label says otherwise

**Files:** `backend/blockchain/controllers/reconciliationController.ts:8-23` · `dashboardController.ts:7-8` · `Dashboard.tsx:180`

**Evidence**
`performReconciliation` and `getDashboardStats` both sum `donations WHERE status='CONFIRMED'` for the "total donations" figure, while the dashboard UI labels it *"Pembayaran berstatus PAID"* (`Dashboard.tsx:180`) and the methodology note says *"Total donasi = jumlah pembayaran berstatus PAID (tabel payments)"* (`Dashboard.tsx:442`). The `payments` table is written by nothing (see `DEBT` / `FEATURE_STATUS`) and is never summed. The label and the query disagree, and the `payments` table referenced by the UI copy is dead.

**Severity:** LOW (documentation/label mismatch; numbers are drawn from the correct live table, the copy is stale).

**Root cause:** The donation model migrated from `payments` to `donations`, but user-facing copy and the orphan table were left behind.

**Recommended solution:** Update the UI copy to match the `donations`/`CONFIRMED` semantics, and either implement the `payments` lifecycle or drop the table.

**Regression risk:** Very low (copy/cleanup).

---

## Summary Table

| ID | Title | Severity |
|---|---|---|
| BUG-01 | Donation/QRIS endpoints 404 | CRITICAL |
| BUG-05 | `audit_logs` table missing → audit 500 / silent log loss | CRITICAL |
| BUG-02 | `PublicVerify` crashes on success | HIGH |
| BUG-03 | No ADMIN/privileged bootstrap | HIGH |
| BUG-07 | Contract/backend access-control divergence | HIGH |
| BUG-12 | Audit-hash collision → false reconciliation | HIGH |
| BUG-04 | Orphan `App.tsx\`` + missing components | MEDIUM |
| BUG-08 | Ignition `modules-base` import invalid | MEDIUM |
| BUG-09 | Hardhat 2/3 mismatch + missing Counter | MEDIUM |
| BUG-10 | Uploads never served | MEDIUM |
| BUG-11 | AMIL can't record distributions | MEDIUM |
| BUG-14 | Campaign progress never updates | MEDIUM |
| BUG-15 | Unsafe CSV export | MEDIUM |
| BUG-06 | Frontend ABI signature drift (inert) | LOW |
| BUG-13 | Anomaly scan reports 0 found | LOW |
| BUG-16 | Reconciliation label vs query mismatch | LOW |
