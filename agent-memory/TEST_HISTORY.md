# Test History

## 2026-11-12 — audit baseline

- `backend/npm test`: PASS, 67/67 after fixes.
- `backend/npx tsc --noEmit -p tsconfig.json`: PASS, no diagnostics after fixes.
- `frontend/npm run build`: PASS; bundle-size warning >500 kB.
- `frontend/npm run lint`: completes with 7 warnings.
- `blockchain/npm test`: compiles, 0 passing; not a valid test pass.
- `blockchain/npx hardhat test test/ZakatVerify.test.ts`: FAIL, `SyntaxError: Unexpected token ':'`.
- `sqlite3 backend/database.sqlite 'PRAGMA integrity_check;'`: `ok`.
- `sqlite3 ... 'PRAGMA foreign_key_check;'`: no rows.
- Auth follow-up: server started on alternate port without JWT secret; `/health` returned 200 and `/api/transactions` returned 503. `npm test` passed 67/67 and backend TypeScript check completed cleanly.
