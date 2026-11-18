# Development Rules

- Treat repository source and runtime as truth; label historical or unverified reports.
- Preserve user data. Never reset/delete operational DBs, deploy publicly, send real-money transactions, push Git, initialize Git, or delete important files without approval.
- Do not inspect `.env` or print credentials. Never store secrets or personal beneficiary data in project memory.
- Test changes at relevant layers; never claim zero-test discovery as a pass.
- Preserve audit hash compatibility and existing API contracts unless all consumers are updated.
- Treat a blockchain anchor as integrity evidence only; it does not prove real-world distribution.
- Work only under `/home/jarvis/ZakatChain`; report exact commands/results and leave a recovery checkpoint.
