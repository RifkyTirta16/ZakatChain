# Complete Feature Inventory — ZakatChain

Every feature audited in the repository with backend/contract dependencies, UX issues, new IA placement, and priority.

## 1. Public Features
| Feature | Status | Old Route / File | Role | Backend Dependency | Contract Dependency | Current UX Problem | New Location & Flow | Priority |
|---|---|---|---|---|---|---|---|---|
| Landing Page | Missing (blocked by LoginPage) | `/` (`MainApp.tsx`) | Public | `GET /api/public/transparency` (new), `GET /api/campaigns` | Indirect via RPC probe | Entire app forces login on `/` | `/` (`LandingPage.tsx`): 12-section Islamic Fintech × Ethereum showcase | P0 |
| Zakat Calculator | Missing | None | Public / Muzakki | None (configurable documented nisab parameters) | None | Users have no way to compute zakat before paying | `/calculator` (`ZakatCalculatorPage.tsx`): Profesi, Maal, Emas + 1-click Pay CTA | P0 |
| Zakat Programs Catalog | Implemented (auth-gated in UI) | `/campaigns` (`Campaigns.tsx`) | Public / All | `GET /api/campaigns` (public), `POST /api/campaigns` (AMIL/ADMIN) | None | Blocked behind login in `MainApp.tsx` | `/programs` & `/campaigns` (public catalog + role-gated Create CTA) | P0 |
| Program Detail & Quick Pay | Implemented (auth-gated in UI) | `/campaigns/:id` (`CampaignDetail.tsx`) | Public / Logged-in | `GET /api/campaigns/:id`, `POST /api/payment/generate` | None | Mixed payment flow; 401 message only after submit | `/campaigns/:id`: Progress, donor history, guided IDR payment / login prompt | P1 |
| Public Transparency Portal | Partial (`PublicVerify` only) | None | Public | `GET /api/public/transparency` (new), `GET /api/campaigns` | Indirect (`networkStatus`) | No overview of platform totals & recent verified hashes for public | `/transparency` (`PublicTransparencyPage.tsx`): Aggregate KPIs, non-PII verified ledger, charts | P0 |
| Public Hash Verification | Implemented (auth-gated in UI, field mismatch) | `/verify` (`PublicVerify.tsx`) | Public | `GET /api/explorer/verify/:id`, `GET /api/explorer/verify/hash/:hash` | `verifyReport(bytes32)` | Blocked behind login; reads `audit_hash`/`blockchain_status` instead of `auditHash`/`status` | `/verify`: Public search by ID/hash, shows Ethereum network, hash match, copy, honest disclaimer | P0 |

## 2. Authentication Features
| Feature | Status | Old Route / File | Role | Backend Dependency | Contract Dependency | Current UX Problem | New Location & Flow | Priority |
|---|---|---|---|---|---|---|---|---|
| Login (Username + Password) | Implemented | `/` (`LoginPage.tsx`) | Public | `POST /api/auth/login` | None | Takes over `/` for all visitors; no username trim; no register link | `/login` (`LoginPage.tsx`): Clean Emerald/Gold card, trim username, clear 401/429 messages | P0 |
| Muzakki Registration | Backend-only | None | Public | `POST /api/auth/register` (creates `USER`) | None | Completely absent from frontend | `/register` (`RegisterPage.tsx`): Username/password validation matching `RegisterSchema` | P0 |
| Session & Profile Info | Header badge only | `ShellFrame.tsx`, `PublicShell.tsx` | All Logged-in | `localStorage` JWT + user | None | No dedicated profile/session view or role explanation | `/profile` (`ProfilePage.tsx`): Account info, active role permissions, active Ethereum config | P1 |

## 3. Muzakki (`USER`) Features
| Feature | Status | Old Route / File | Role | Backend Dependency | Contract Dependency | Current UX Problem | New Location & Flow | Priority |
|---|---|---|---|---|---|---|---|---|
| Muzakki Overview | Implemented | `/` (`DonorHome.tsx`) | `USER` | `GET /api/dashboard/stats`, `/donations/donor/:id`, `/campaigns`, `/transactions` | None | Cluttered mixed widgets; no clear personal receipt link | `/dashboard` (`DonorHome.tsx`): Personal total, quick pay CTA, active programs, recent donations | P0 |
| Pay Zakat (General / Program) | Implemented | `/donate` (`DonationPayment.tsx`), `DonationDrawer.tsx`, `PaymentModal.tsx` | Logged-in | `POST /api/payments/session`, `/create`, `GET /api/payments/status/:id`, `/verify/:id` | None (Sandbox QRIS) | Duplicate flows; general payment lacks `campaign_id` note; `PaymentModal` sends `Bearer null` | `/donate` (`DonationPayment.tsx`) + `DonationDrawer.tsx`: Unified 4-step tracker with clear status states | P0 |
| Donation History & Receipts | Partial (`ActivityList`) | `/` widget only | `USER` | `GET /api/donations/donor/:id` | None | No filterable table or printable/shareable receipt detail | `/my-donations` (`MyDonationsPage.tsx`): Full history, status badges, receipt breakdown | P1 |

## 4. Amil (`AMIL`) & Mustahik/Mapping Features
| Feature | Status | Old Route / File | Role | Backend Dependency | Contract Dependency | Current UX Problem | New Location & Flow | Priority |
|---|---|---|---|---|---|---|---|---|
| Amil Operational Overview | Dead code | `AmilHome.tsx` (unused) | `AMIL` | `GET /api/transactions`, `GET /api/campaigns` | None | Never rendered; `DonorHome` shows 403 auditor links to AMIL | `/dashboard` (`AmilHome.tsx`): Queue summary, pending proofs, rejected items, quick distribution CTA | P0 |
| Record Distribution + Proof Upload | Implemented | `/new-record` (`NewDistributionRecord.tsx`) | `AMIL`, `ADMIN` | `POST /api/transactions` (multipart `proof_file`) | `registerReport(bytes32, uint256)` via backend wallet | Long single form; no clear stage tracker for DB save vs Ethereum registration | `/new-record`: Guided form with file preview, validation, and post-submit tx stage status | P1 |
| Distribution Records & Explorer | Implemented | `/explorer`, `/dashboard` | `AMIL`, `AUDITOR`, `ADMIN` | `GET /api/transactions`, `GET /api/explorer/verify/*` | `verifyReport(bytes32)` | Restricted in `navConfig` to AUDITOR/ADMIN only | `/explorer`: Filterable table, Ethereum network detail drawer, hash copy | P1 |
| Poverty Mapping & Mustahik Need | Implemented | `/mapping` (`PovertyMapping.tsx`) | All login (read), `AMIL`/`ADMIN` (import) | `GET /api/mapping/stats`, `/recommendations`, `POST /api/mapping/import` | None | Hidden from AUDITOR in nav; heavy 645-line component | `/mapping`: Responsive Leaflet map, priority gap table, JSON import modal (AMIL/ADMIN only) | P1 |

## 5. Auditor (`AUDITOR`) & Reporting Features
| Feature | Status | Old Route / File | Role | Backend Dependency | Contract Dependency | Current UX Problem | New Location & Flow | Priority |
|---|---|---|---|---|---|---|---|---|
| Auditor Review Queue Overview | Dead code | `AuditorHome.tsx` (unused) | `AUDITOR` | `GET /api/anomalies`, `GET /api/transactions` | None | Never rendered | `/dashboard` (`AuditorHome.tsx`): Open anomalies, pending proofs, on-chain sync count | P0 |
| Anomaly Detection & Resolution | Implemented | `/anomalies` (`AnomaliesPage.tsx`) | `AUDITOR`, `ADMIN` | `GET /api/anomalies`, `POST /api/anomalies/scan`, `PATCH /api/anomalies/:id/resolve` | `verifyReport` inside scan | Minimal feedback on scan/resolve errors | `/anomalies`: Clean table/cards, scan trigger with feedback, inline resolution form | P1 |
| Proof Verification | Implemented | `/proofs` (`ProofsPage.tsx`) | `AUDITOR`, `ADMIN` | `GET /api/transactions`, `PATCH /api/proofs/verify/:id` | None | Rejection error handling basic | `/proofs`: Pending proof queue, approve/reject with mandatory reason | P1 |
| Evidence Graph | Implemented | `/graph` (`EvidenceGraph.tsx`) | `AUDITOR`, `ADMIN` | `GET /api/campaigns`, `/donations`, `/transactions` | None | Colors still old teal/coral | `/graph`: Emerald/Gold/Slate SVG evidence graph + node inspector | P2 |
| Audit Logs | Implemented | `/audit` (`AuditPage.tsx`) | `AUDITOR`, `ADMIN` | `GET /api/audit` | None | Basic table without mobile card view | `/audit`: Responsive audit log table + action filter | P1 |
| CSV Report Export | Implemented | `/export` (`ExportPage.tsx`) | `AUDITOR`, `ADMIN` | `GET /api/export/csv` | None | Silent `catch {}` hides 404/network errors | `/export`: Clean export summary + visible error handling | P1 |

## 6. Administrator (`ADMIN`) & Blockchain Monitoring Features
| Feature | Status | Old Route / File | Role | Backend Dependency | Contract Dependency | Current UX Problem | New Location & Flow | Priority |
|---|---|---|---|---|---|---|---|---|
| Admin System Overview | Dead code | `AdminHome.tsx` (unused) | `ADMIN` | `GET /api/dashboard/stats`, `GET /api/reconciliation/history` | RPC + bytecode probe | Never rendered; network chain ID not shown | `/dashboard` (`AdminHome.tsx`): Platform KPIs, live Ethereum network card, pending queues, Analytics | P0 |
| Fund Reconciliation | Implemented | `/reconciliation` (`ReconciliationPage.tsx`) | Read: `AUDITOR`/`ADMIN`; Run: `ADMIN` | `GET /api/reconciliation/history`, `POST /api/reconciliation/run` | None | Shows Run form to `AUDITOR` (causes 403); swallows errors | `/reconciliation`: Role-gated Run form (`ADMIN` only) + error alert + history | P0 |
| Smart Contract & Network Monitor | Missing UI | None (partial in `DonorHome`) | `ADMIN` (and public summary) | `GET /api/dashboard/stats` (`networkStatus`) | `publicClient` (`viem`) + `ZAKAT_CONTRACT_ADDRESS` | Contract address, chain ID, and block number hidden from UI | `/network` (`NetworkMonitorPage.tsx`): Real chain ID, network label, contract address, RPC latency/status | P0 |
| Roles & Permissions Reference | Missing UI | None | `ADMIN` | Derived from RBAC routes (`middleware/auth.ts`) | None | No visibility of role matrix or CLI provisioning workflow | `/roles` (`RolesPermissionsPage.tsx`): Honest read-only RBAC matrix + CLI provisioning instructions (no fake CRUD) | P1 |
| Platform Analytics | Implemented | `Analytics.tsx` / `Dashboard.tsx` | `AMIL`, `AUDITOR`, `ADMIN` | `GET /api/dashboard/stats`, `GET /api/transactions` | None | Old color palette; duplicated between `Dashboard.tsx` and `Analytics.tsx` | `/analytics` & embedded cleanly in Admin/Amil views | P1 |
