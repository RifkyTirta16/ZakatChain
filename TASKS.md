# ZakatChain — Task Board

> Tasks are dispatched by the Principal Architect. Agents claim ONE task at a time.
> File ownership is exclusive: two agents must never edit the same file concurrently.

## P0 — Critical bugs & security

| ID | Task | Files owned | Agent | Status |
|---|---|---|---|---|
| P0-1 | Create `audit_logs` table in `models/db.ts` and verify audit API | `backend/blockchain/models/db.ts`, tests | backend-eng | DONE — schema and HTTP tests pass (2026-11-12) |
| P0-2 | Escape CSV quotes/newlines/formula prefixes and add malicious-cell regression test | `backend/blockchain/controllers/exportController.ts`, tests | backend-eng | DONE — covered by backend tests (2026-11-12) |
| P0-3 | Serve `/uploads` with hardened options and generated safe names | `backend/blockchain/index.ts`, upload middleware | backend-eng | IMPLEMENTED — public-access privacy risk tracked in P0-7 |
| P0-4 | Add scoped rate limiting to auth/payment and document settings | `backend/blockchain/index.ts`, `backend/.env.example`, `backend/package.json` | backend-eng | TODO |
| P0-5 | Authenticate payment sessions and derive donor attribution from `req.user.id` | `backend/blockchain/routes/paymentRoutes.ts`, `backend/blockchain/controllers/paymentController.ts` | backend-eng | DONE — integration test rejects forged donor attribution (2026-11-12) |
| P0-6 | Run backend/frontend/blockchain suites and type/build checks; require actual contract-test discovery | all workspaces | QA/any | PARTIAL — backend 67/67 and frontend build pass; Hardhat reports 0 tests and explicit TS test load fails |
| P0-7 | Resolve public proof-file privacy: authenticated retrieval or approved redaction policy before exposing beneficiary evidence | `backend/blockchain/index.ts`, proof API, security docs | architect/backend-eng | TODO — policy decision required before implementation |
| P0-8 | Restrict CORS origins by environment and add regression coverage | `backend/blockchain/index.ts`, env example, tests | backend-eng | TODO |

## P1 — Existing feature stabilization

| ID | Task | Files owned | Agent | Status |
|---|---|---|---|---|
| P1-1 | Campaign creation: reject `deadline` in the past, require `target_amount` > 0 (already) + cap length of title/description; return 201 with created resource id (currently returns no id) | `backend/blockchain/controllers/campaignController.ts` | backend-eng | TODO |
| P1-2 | Donation/campaign amount consistency: when webhook CONFIRMED arrives, increment `campaigns.current_amount` in the same BEGIN IMMEDIATE transaction | `backend/blockchain/controllers/paymentController.ts` | backend-eng | TODO |
| P1-3 | Remove dead `payments` table usage confusion: either migrate payment flow to it or drop the table from schema; document choice in DECISIONS.md | `backend/blockchain/models/db.ts` | backend-eng | BLOCKED on DEC-002 |
| P1-4 | Frontend: replace hardcoded `API_BASE` with `import.meta.env.VITE_API_BASE` (default http://localhost:5000/api); add `.env.example` | `frontend/src/utils/api.ts`, `frontend/.env.example` | frontend-eng | TODO |
| P1-5 | Frontend: fix stray file `src/App.tsx\`` (trailing backtick filename), wire or delete it; confirm no dangling imports | `frontend/src/` | frontend-eng | TODO |
| P1-6 | Make Hardhat discover and execute `ZakatVerify.test.ts`, then retain coverage for authorization, duplicate registration, revocation, and events | `blockchain/test/ZakatVerify.test.ts`, Hardhat config/scripts | blockchain-eng | BLOCKED — current command runs 0 tests; explicit TS test parse fails |

## P2 — Feature completion

| ID | Task | Files owned | Agent | Status |
|---|---|---|---|---|
| P2-1 | Anomaly scan performance: batch RPC checks (Promise.all with concurrency cap), avoid N queries per row for duplicate detection (single GROUP BY/HAVING query) | `backend/blockchain/controllers/anomalyController.ts` | backend-eng | TODO |
| P2-2 | Frontend anomaly UI: list open anomalies + resolve action for ADMIN/AUDITOR | `frontend/src/pages/` (new page) | frontend-eng | TODO |
| P2-3 | Audit trail UI for ADMIN/AUDITOR (reads `/api/audit`) | `frontend/src/pages/` (new page) | frontend-eng | TODO |
| P2-4 | Evidence Graph: verify data contract with `/api/donations` output; type the response | `frontend/src/pages/EvidenceGraph.tsx` | frontend-eng | TODO |
| P2-5 | Public verify page: surface `revoked` state distinctly (currently likely binary verified/not) | `frontend/src/pages/PublicVerify.tsx` | frontend-eng | TODO |
| P2-6 | Role-aware navigation: hide ADMIN-only actions from USER/DONOR in `MainApp.tsx` nav | `frontend/src/MainApp.tsx` | frontend-eng | TODO |

## P3 — New integrations (proposal stage only — require DECISIONS.md approval)

| ID | Task | Notes |
|---|---|---|
| P3-1 | Real payment provider integration (replace QRIS sandbox) | Needs provider choice + credentials. Do not start. |
| P3-2 | Deploy ZakatVerify to Sepolia (script exists: `SEPOLIA_RPC_URL`) | Needs funded wallet. Do not start. |
| P3-3 | wagmi chain config ← backend chain (localhost:8544) alignment | Architectural change; needs DEC-004. |

## P4 — UI/UX optimization

Backlog only. Populate after M2. Do not pull P4 work while P0/P1 remain.

## Dependency Graph

```
P0-6 (run tests) ──┬── gates everything: no fixes before knowing what's red
P0-1..P0-5        ─┘  (backend-eng sequential: P0-1 → P0-3 → P0-4 → P0-2 → P0-5)
P1-1, P1-2  ← P0-5 (payment flow touched by both)
P1-3        ← DEC-002 decision
P1-4, P1-5, P1-6 independent
P2-* ← M1 complete (P0 all done)
```

## File Ownership Lock (current)

- `db.ts`, `paymentController.ts`, `exportController.ts`, `index.ts`, `paymentRoutes.ts`: **backend-eng**
- `frontend/src/*`: **frontend-eng**
- `blockchain/test/*`, `contracts/*`: **blockchain-eng**
- `*.md` governance docs: **architect only**

Conflict = task rejected. Agents must re-claim via the architect.
