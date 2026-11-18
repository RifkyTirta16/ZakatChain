# Prioritized Task Backlog

## P0 — Security / trust boundaries
1. Design authenticated proof retrieval or redacted public evidence; current static `/uploads` is public.
2. Restrict CORS by environment and add endpoint-appropriate rate limiting.
3. Confirm whether anyone may register an anchor. Verify real RPC chain ID, contract address/bytecode, owner, and backend signer in a controlled local deployment.

## P1 — Core integrity / operations
4. Make Hardhat run the existing ZakatVerify tests and enforce nonzero test discovery.
5. Persist general (non-campaign) donations and reconcile only trusted provider webhook outcomes; maintain campaign totals transactionally.
6. Add a safe first ADMIN bootstrap path and document role provisioning.
7. Move frontend API/chain settings to environment-backed configuration and align them with backend deployment.

## P2 — Release confidence
8. Add CI, frontend tests, cross-layer E2E tests, and database backup/restore verification.
9. Resolve 7 frontend lint warnings and split the >500 kB production chunk.
10. Consolidate duplicate contract/build workspaces only after references and deployment artifacts are verified.
