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
- 2026-11-18 fix/hardhat-tests attempt (branch fix/hardhat-tests): (1) tsconfig.json ts-node override (module commonjs) -> still `0 passing (0ms)`. (2) package.json `"type":"commonjs"` -> still `0 passing (1ms)`. Diagnostic: explicit file arg `npx hardhat test test/ZakatVerify.test.ts` -> `SyntaxError: Unexpected token ':'` (compileSourceTextModule, ESM path). Both changes reverted; discovery remains UNRESOLVED, 2-attempt budget spent per task rules.
- 2026-11-18 fix/hardhat-tests RESOLVED: `cd blockchain && npm test` -> 10 passing / 8 failing (suite runs end-to-end on Hardhat local network, no external RPC). Discovery fix: explicit TASK_TEST_GET_TEST_FILES override + type:commonjs + ts-node via NODE_OPTIONS in the test script. The 8 failures match the contract-audit stale-test findings (ZakatVerify.test.ts vs ZakatVerify.sol: revoke semantics, revert messages, sticky-revoke P0). No contract or test-content changes made.
- 2026-11-18 Contract/test alignment DONE: ZakatVerify.sol updated to tested invariants (sticky revoke, zero-hash guard, consistent messages, timestamp preserved). `cd blockchain && npm test` -> 18 passing / 0 failing. Compile clean (only pre-existing shadowing warning at sol:42).
