# Project State

**As of:** 2026-11-12 · **Phase:** Phase 1 audit; foundational backend stabilized, security and blockchain QA remain.

- Workspace exists at `/home/jarvis/ZakatChain`; no `.git` metadata found. Do not initialize Git without user approval.
- Current architecture and audit findings are documented in `docs/audit/GEMINI_FULL_AUDIT.md` and `docs/security/SECURITY_REVIEW.md`.
- Backend: Express/TypeScript + SQLite + ethers; full backend suite passed 67/67; TypeScript check clean.
- Frontend: React/Vite build passed; lint completed with 7 warnings; bundle has >500 kB chunk warning.
- Blockchain: Hardhat compile succeeded but default test reports 0 passing; explicit TS test load fails. Contract behavior remains unverified by execution.
- Active default DB: `backend/database.sqlite`; `PRAGMA integrity_check` = `ok`, FK check returned no rows. No record contents inspected.
- Current source fixes in this session: optional campaign for payment session, authenticated donor attribution, provider cleanup, isolated integration DB lifecycle/fixtures, strict TS errors.
- Security/release blockers: public proof serving, unrestricted CORS, no rate limiting, permissionless canonical registration policy needs product decision, no verified chain deployment identity, sandbox payment only, general session has no donation row, no admin provisioning.
- Authentication configuration: reproduced HTTP 503 `Authentication is not configured`; previous safe presence check found no root, `backend/.env`, or `frontend/.env`. Backend loads `backend/.env` from a module-relative path. It now warns but starts without a nonempty `JWT_SECRET`; health works while protected APIs return 503. A unique local secret still must be configured by the operator to enable authentication.
- Historical audit documents dated 2026-11-08 are not automatically current; use source/runtime first.
