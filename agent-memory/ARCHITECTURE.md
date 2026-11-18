# Architecture Notes (Verified)

- Frontend entry: `frontend/src/main.tsx` → Wagmi + TanStack Query providers → `frontend/src/MainApp.tsx` routes.
- Backend entry: `backend/blockchain/index.ts` (Express 5); route/controller modules under `backend/blockchain/`.
- Database: SQLite via `backend/blockchain/models/db.ts`; default path resolves to `backend/database.sqlite`; additive migrations; FK enforcement and WAL enabled.
- Blockchain canonical workspace per root DEC-001: `blockchain/`; runtime ABI/wallet utilities are in `backend/blockchain/utils/web3.ts`.
- `contracts/` and `backend/contracts/` contain legacy/divergent source copies; do not extend or delete pending a deliberate consolidation decision.
- Frontend API base and wagmi chain list are hard-coded; frontend targets Mainnet/Sepolia while backend defaults to a local RPC. No verified end-to-end chain configuration.
- Uploads are stored under `backend/uploads` and publicly served from `/uploads` today; privacy policy is unresolved.
