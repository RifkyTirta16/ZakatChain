# UI/UX Audit — ZakatChain (Baseline Before Redesign)

**Audit Date:** 2026-11-20 · **Branch:** `feat/ui-ux-transformation` · **Auditor:** Autonomous UI/UX & Engineering Agent

## 1. Repository Structure & Tech Stack
- **Monorepo Root (`/home/jarvis/ZakatChain`)**: Git repository (`feat/ui-ux-transformation` branched from `fix/login-and-role-check`).
- **Frontend (`frontend/`)**: React `19.2.8`, Vite `8.3.0`, TypeScript `~6.0.2`, Tailwind CSS `3.4.1`, React Router `7.18.4`, TanStack Query `5.104.2`, `axios` `1.20.0`, `recharts` `3.10.1`, `leaflet` `1.9.4` + `react-leaflet` `5.0.0`, `lucide-react` `1.57.0`, `wagmi` `3.7.7`, `viem` `2.57.6`, `oxlint` `1.81.0`.
- **Backend (`backend/`)**: Express `5.3.0` + TypeScript (`tsx`), SQLite (`sqlite3`/`sqlite`), `zod` `4.6.7`, `jsonwebtoken`, `bcrypt`, `multer`, `ethers` `6.13.0`. Entry: `backend/blockchain/index.ts`.
- **Smart Contract (`blockchain/`)**: Canonical Hardhat `2.29.1` workspace with `ZakatVerify.sol` (Solidity `0.8.24`). Note: `contracts/` and `backend/contracts/` are legacy copies (must not be altered).

## 2. Critical UX & Product Problems Found in Current Frontend
1. **No Public Website (`frontend/src/MainApp.tsx:62-67`)**:
   - Anonymous visitors hitting `/`, `/campaigns`, or `/verify` are immediately forced into `<LoginPage />`.
   - Public visitors cannot explore Zakat programs, calculate zakat, view transparency stats, or verify an audit hash without signing in first.
   - No registration UI exists despite `POST /api/auth/register` being implemented in `backend/blockchain/routes/authRoutes.ts:6`.
2. **Broken / Dead Role Homes (`frontend/src/MainApp.tsx:68,78`)**:
   - `MainApp.tsx` hardcodes `const Home = DonorHome;` for every role.
   - `AdminHome.tsx`, `AmilHome.tsx`, and `AuditorHome.tsx` exist in `frontend/src/pages/home/` but are dead code (never imported).
3. **Role Access Mismatches Between UI & Backend**:
   - `DonorHome.tsx:51,76-82` displays "Perlu tindakan" cards linking `AMIL` users to `/proofs`, `/anomalies`, and `/reconciliation` — all of which trigger a `403` screen in `RequireRole` and `403` from backend.
   - `ReconciliationPage.tsx:95-107` renders the `"Jalankan Rekonsiliasi"` form (`POST /api/reconciliation/run`) to `AUDITOR`, even though backend `reconciliationRoutes.ts:7` restricts it to `['ADMIN']`.
   - `navConfig.ts:43,48-49` hides `/mapping`, `/explorer`, and `/graph` from roles that backend routes actually allow.
4. **Missing Ethereum Product Identity & Live Network Visibility**:
   - `wagmi` and `viem` (`frontend/src/web3.ts`, `wagmiConfig.ts`) are installed and wrapped around the app in `main.tsx`, yet **zero** active pages import them (only the orphaned file `frontend/src/App.tsx\`` uses them).
   - No Ethereum diamond mark, no "Powered by Ethereum" attribution, no active network badge (`Localhost / Hardhat` vs `Sepolia Testnet` vs `Ethereum Mainnet`) in navigation or dashboards.
   - `PublicVerify.tsx` and `OnChainExplorer.tsx` do not display network name or block number properly, and `PublicVerify.tsx:159,216` read `audit_hash` / `blockchain_status` even though `explorerController.ts:87-88` returns `auditHash` / `status` (producing blank/fallback values!).
5. **Visual System Inconsistency**:
   - Current theme (`DESIGN.md`, `tailwind.config.js`) uses a retro-playful bright teal (`#2BA8A2`) and bright yellow (`#FFD23F`) palette with `bg-[#F6F8F8]` hardcoded across pages, mixed with `bg-cream` (`#FFF8E7`) and legacy `wattvision` dark tokens in `components/wattvision/UIComponents.tsx`.
   - Does not match the requested **Islamic Fintech × Modern Web3 × Premium Minimalism** identity (Emerald `#047857`, Deep Forest `#064E3B`, Dark Forest `#022C22`, Soft Cream `#F8F7F2`, Gold Accent `#C9A45C`, Mint Surface `#ECFDF5`, Slate `#334155`).
6. **Transaction & Error Handling Gaps**:
   - `ExportPage.tsx:25-27` and `ReconciliationPage.tsx:35-41` silently swallow API errors without feedback.
   - `PaymentModal.tsx:31,39` sends `Authorization: Bearer null` when unauthenticated/missing token.
   - No Zakat Calculator exists anywhere in the app.
   - No dedicated Muzakki donation history / receipt view (`GET /api/donations/donor/:id` was only partially summarized in `DonorHome.tsx`).
   - Unclear transaction lifecycle messaging for non-technical users (no progressive disclosure of blockchain hash confirmation vs IDR payment).

## 3. Preserved Backend & Contract Constraints
- `ZakatVerify.sol` stores **report hashes only** (`registerReport`, `revokeReport`, `verifyReport`) — never real-world funds or distribution truth.
- Mustahik PII (`recipient_name`, `proof_url`) must NEVER be exposed on public endpoints.
- Roles in backend & DB: `USER` (Muzakki), `AMIL`, `AUDITOR`, `ADMIN`.
- Existing backend APIs, DB schema, and smart contract ABI remain intact; only one strictly read-only, non-PII public endpoint (`GET /api/public/transparency`) and safe network metadata enrichment (`chainId`, `networkName`, `contractAddress`) will be added to support real data on the redesigned public website.
