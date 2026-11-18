# Known Issues / Verification Limits

- No Git repo at workspace root, no diff/history or recoverable commit available.
- Blockchain tests remain unverified: default Hardhat reports zero passing; explicit TypeScript test invocation fails parsing.
- Frontend lint: 7 warnings; production bundle warning (>500 kB chunk).
- Public proof serving, permissive CORS, missing rate limits, permissionless registration policy, and missing admin provisioning require action.
- Actual `.env`, private keys, active RPC, deployed contract address, deployed owner/signer, real payment provider, and beneficiary records were not inspected.
- `.env` presence was checked without reading contents: root, backend, and frontend `.env` files were absent at that check. Without `JWT_SECRET`, backend warns and remains running; health succeeds while protected APIs return 503. Configure a unique secret to enable auth.
- SQLite integrity/FK checks do not prove business correctness, privacy, backup readiness, or successful restoration.
