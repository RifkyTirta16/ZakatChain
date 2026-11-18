# ZakatChain Security Review

**Date:** 2026-11-12 · **Scope:** Static source review plus read-only SQLite integrity checks. No external scan, public deployment, credential inspection, or exploit testing was performed.

## Evidence-backed findings

### High priority

1. **Public proof-file access (privacy risk).** `backend/blockchain/index.ts` mounts the uploads directory at `/uploads` using `express.static` without authentication or record-level authorization. Dotfiles and directory listings are disabled, but that does not make proof documents private. Evidence may include beneficiary names, locations, or documents. Do not claim a data breach occurred; access policy and file contents were not tested.
2. **Permissionless report registration.** The canonical `blockchain/contracts/ZakatVerify.sol` allows any caller to register a nonzero, previously unused hash. Revocation is owner-only. This is the implemented policy, not a demonstrated exploit on a deployed contract. Confirm intended trust model and deployed contract before release.
3. **Unrestricted CORS.** Backend startup calls `cors()` without an origin allowlist. This should be constrained per deployment environment.
4. **No rate limiter.** No application-level rate-limiting middleware is mounted. Login, payment-session creation, webhook, and anomaly scanning need endpoint-appropriate controls.

### Medium priority

5. **Browser bearer token in localStorage.** Frontend persists `zakat_token` and attaches it to API calls. Any same-origin XSS could access it; this review did not identify or test a specific XSS.
6. **Deployment identity is unverified.** `.env.example` contains placeholders/default local settings. Actual `.env` files were not read. No claim is made about the deployed chain, address, owner, or signer. Never use development keys on a public network.
7. **Contract copies differ.** Canonical and backend copies have different `registerReport` authorization/validation. Build artifacts in several workspaces are not proof of what is deployed.
8. **Payment provider is a sandbox.** A generated QR payload and a database transaction are not evidence of payment. Keep status pending until a trusted, authenticated provider webhook confirms it. General non-campaign sessions still lack a linked donation record.

## Positive controls observed

- Registration does not accept a client-selected role; newly registered users become `USER`.
- Auth uses JWT verification and bcrypt password hashes; weak passwords are rejected by validation.
- Payment webhook checks HMAC-SHA256 with constant-time comparison and applies idempotency within a DB transaction.
- Upload names are generated server-side; content signatures are inspected and the size is capped.
- SQL calls observed use bound parameters; database foreign keys are enabled in `initDb()`.
- CSV fields are quoted and formula prefixes are escaped.
- Error responses avoid returning stack traces to API clients.

## Verification limits

`backend/database.sqlite` passed `PRAGMA integrity_check` (`ok`) and produced no `PRAGMA foreign_key_check` rows. No user data was queried. No `.env` contents, private keys, public RPC, live contract, or payment provider were accessed. This is not a formal penetration test or compliance assessment.

## Remediation order

1. Decide and implement private proof access/redaction before exposing beneficiary evidence.
2. Restrict CORS and add rate limits with endpoint-specific budgets.
3. Confirm contract registration authorization, chain ID, deployed bytecode/address, owner, and signer in a local controlled deployment; never infer these from defaults.
4. Complete payment persistence/reconciliation so only verified provider callbacks affect donation totals.
5. Add actual Hardhat test execution and CI gates; current default reports zero contract tests.
