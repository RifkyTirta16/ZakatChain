# Architecture Notes (Verified)

- Frontend entry: `frontend/src/main.tsx` → Wagmi + TanStack Query providers → `frontend/src/MainApp.tsx` routes.
- Backend entry: `backend/blockchain/index.ts` (Express 5); route/controller modules under `backend/blockchain/`.
- Database: SQLite via `backend/blockchain/models/db.ts`; default path resolves to `backend/database.sqlite`; additive migrations; FK enforcement and WAL enabled.
- Blockchain canonical workspace per root DEC-001: `blockchain/`; runtime ABI/wallet utilities are in `backend/blockchain/utils/web3.ts`.
- `contracts/` and `backend/contracts/` contain legacy/divergent source copies; do not extend or delete pending a deliberate consolidation decision.
- Frontend chain/API config is env-driven since 2026-11-18 (branch `chore/chain-config`): `VITE_API_URL` (api.ts), `VITE_RPC_URL` + `VITE_CHAIN_ID` (web3.ts + wagmiConfig.ts), default = local Hardhat (31337, http://127.0.0.1:8545). Mainnet/Sepolia only activate when VITE_CHAIN_ID explicitly lists them. Reference template: `frontend/.env.example`. Backend chain defaults already env-driven (`BLOCKCHAIN_RPC_URL`, `ZAKAT_CONTRACT_ADDRESS` in `backend/.env.example`). End-to-end verification against a live local node is still pending.
- Uploads are stored under `backend/uploads` and publicly served from `/uploads` today; privacy policy is unresolved.
