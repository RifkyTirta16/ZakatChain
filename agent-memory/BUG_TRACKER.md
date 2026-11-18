# Bug Tracker (Current Evidence)

- **OPEN / P0:** `/uploads` files are publicly served; privacy/access policy unresolved.
- **OPEN / P0:** no rate limiting; CORS allows all origins.
- **OPEN / P0 decision:** canonical report registration is permissionless; deployed chain/owner/signer unknown.
- **OPEN / P1:** general payment session does not create a donations row; sandbox cannot prove payment.
- **OPEN / P1:** Hardhat default command discovers zero contract tests; explicit TS test parse fails.
- **OPEN / P1:** no API admin-role bootstrap.
- **OPEN / P1 operator setup:** live API returned 503 `Authentication is not configured`; prior presence check found no `.env` files. Backend resolves env by its module-relative path and warns/continues without `JWT_SECRET`; health remains up but protected APIs fail closed (503). Operator must set a unique local secret and restart to enable auth.
- **OPEN / P1:** frontend uses hard-coded localhost API and Mainnet/Sepolia while backend defaults to local RPC.
- **OPEN / P2:** orphan `frontend/src/App.tsx\`` and divergent contract copies remain.
- **FIXED / 2026-11-12:** missing campaign ID prevented general payment session validation; campaign-less session now allowed.
- **FIXED / 2026-11-12:** client-provided `donor_id` no longer controls donation ownership.
- **FIXED / 2026-11-12:** backend integration test cached a deleted temp SQLite database across tests; test-only reset isolates each server.
- **FIXED / 2026-11-12:** three backend strict TypeScript diagnostics; recheck clean.
