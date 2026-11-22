# ZakatChain — Decision Log

> Append-only. Every non-obvious architectural or process decision gets an entry.
> Format: ID / date / status / context / decision / consequences.

---

## DEC-001 — 2026-11-08 — ACCEPTED — Single source of truth for contracts

**Context:** Two Hardhat workspaces exist (`blockchain/`, `contracts/`) and two copies of
`ZakatVerify.sol` (`blockchain/contracts/`, `backend/contracts/`). The backend runtime ABI in
`utils/web3.ts` matches `blockchain/contracts/ZakatVerify.sol`.

**Decision:** `blockchain/` is the canonical contract workspace. `contracts/` (ZakatAuditRegistry)
and `backend/contracts/` are legacy reference copies. No new contract work outside `blockchain/`.
Copies may be deleted only after M2 integration confirms nothing imports them.

**Consequences:** Blockchain-eng works only in `blockchain/`. Backend ABI stays hand-inlined in
`web3.ts` until a DEC approves codegen.

---

## DEC-002 — 2026-11-08 — PROPOSED — Resolve payments/donations table duplication

**Context:** Schema defines a `payments` table (payment_session_id UNIQUE) that the live payment
flow never touches; it writes `donations` + `payment_events` instead.

**Decision (pending agent data):** Likely drop `payments` from the schema at M1 unless the
campaign seed scripts reference it. Evidence required before deleting anything.

**Consequences:** Blocks task P1-3.

---

## DEC-003 — 2026-11-08 — ACCEPTED — Audit hash pipeline is frozen

**Context:** `generateAuditHash` = SHA-256 over `JSON.stringify(record)` (order-sensitive),
then `ethers.id(hex)` for the on-chain bytes32 key. Changing either breaks verification of every
previously registered report.

**Decision:** Pipeline is immutable. Any future schema addition to `transactionData` must be
appended as a NEW hash version field, never folded into the existing JSON payload.

**Consequences:** Backend-eng must not "clean up" the JSON shape. Reconciliation/explorer
logic depends on exact reproduction.

---

## DEC-004 — 2026-11-08 — PROPOSED — Unify frontend chain config with backend chain

**Context:** wagmi targets mainnet+sepolia; backend signs against localhost Hardhat. No bridge
between them in the UI today.

**Decision (pending):** Frontend should expose the Hardhat network as a dev chain via env config,
not hardcode mainnet first. Requires frontend-eng to prototype before approving.

**Consequences:** Blocks P3-3. No public-chain UX promises until decided.

---

## DEC-005 — 2026-11-08 — ACCEPTED — Auth model boundary

**Context:** `POST /payments/generate` is public and accepts a client-supplied `donor_id`;
`GET /donations` is any-authenticated. Roles USER/DONOR overlap ambiguously.

**Decision:** Donations are attributed to the authenticated principal; anonymous donations
require an explicit design task, not the current implicit null-donor path. The DONOR role is
retained for future donor-portal features; USER remains the default self-registration role.

**Consequences:** P0-5 changes the API contract; frontend PaymentModal must follow (coordinated task).

---

## DEC-006 — 2026-11-12 — ACCEPTED — Payment-session inputs and donor attribution

**Context:** The general donation form sends an amount and program without a campaign ID. The
backend previously required `campaign_id` and accepted `donor_id` from the request body, which
contradicted the frontend contract and DEC-005's identity boundary.

**Decision:** `campaign_id` is optional for session creation. Any donation row associated with a
campaign derives `donor_id` from the authenticated principal; client-supplied donor identity is
ignored. A campaign-less session is not considered a completed donation until payment persistence
and trusted webhook reconciliation create/update the corresponding donation record.

**Consequences:** Existing campaign payment payloads remain supported. General-session accounting
and trusted-provider integration remain open work; no sandbox response is treated as payment proof.

---

## DEC-007 — 2026-11-22 — ACCEPTED — Legacy contract workspaces consolidated into blockchain/

**Context:** Verification of the codebase and integration tests confirmed zero consumers imported
`contracts/` (`ZakatAuditRegistry.sol`, empty `database.sqlite`, stale ignition module) or
empty `backend/contracts/`. The canonical Hardhat workspace `blockchain/` (`ZakatVerify.sol`,
18/18 passing) already handles all deployment, ABI alignment, and on-chain audit tests.

**Decision:** Removed deprecated `contracts/` and empty `backend/contracts/`, designating
`blockchain/` as the sole contract workspace per the user-approved consolidation plan.

**Consequences:** Fewer duplicate manifests/dependencies in the repo; `docs/audit/HARDHAT_CONSOLIDATION.md`
is fulfilled and `DEC-001` legacy guard is retired.
