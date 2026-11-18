# Lessons Learned

- Re-read current implementation before trusting baseline audit claims; several 2026-11-08 findings were already fixed.
- Full backend test failures initially came from integration DB connection reuse across temporary file paths, fixtures that violated enabled FKs, and an assertion that contradicted middleware order; isolate DB lifecycle and seed valid data.
- Ethers providers created per request should be destroyed after failed RPC probes so retry timers do not keep test processes alive.
- A successful Hardhat command that reports `0 passing` is not contract test evidence; require actual discovered tests.
- Fetch `.text()` strips the leading UTF-8 BOM during decoding; assert the decoded header rather than the raw byte prefix.
