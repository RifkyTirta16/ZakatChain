# Information Architecture & User Journey Maps — ZakatChain

## 1. Site Map & Route Architecture

### Public Zone (`PublicShell` — No Login Required)
- `/` — **Landing Page**: Hero, Value Proposition, Live Transparency Stats, Active Programs, How It Works, Ethereum Technology Section, Recent Verified Ledger Preview, Trust & Security, FAQ, Footer.
- `/programs` (alias `/campaigns`) — **Program Zakat**: Katalog program aktif/selesai + detail `/campaigns/:id`.
- `/calculator` — **Kalkulator Zakat**: Zakat Penghasilan, Maal, Emas dengan parameter nisab terdokumentasi & dapat disesuaikan + CTA Tunaikan Zakat.
- `/transparency` — **Transparansi Publik**: Ringkasan statistik platform (non-PII), grafik kategori penyaluran, daftar transaksi terverifikasi terbaru dengan tautan verifikasi Ethereum.
- `/verify` — **Verifikasi Publik**: Pencarian ID laporan / SHA-256 audit hash / `0x` tx hash, status jaringan Ethereum aktual, dan hasil pemeriksaan kontrak `ZakatVerify`.
- `/login` — **Masuk**: Login berbasis username & password (menuju dashboard sesuai role).
- `/register` — **Daftar Muzakki**: Pembuatan akun Muzakki (`USER`) via `POST /api/auth/register`.

### Authenticated Application Shell (`ShellFrame` — Sidebar Adaptif per Role)
- `/dashboard` (dan `/` saat sudah login? **Keputusan UX:** Pengunjung login yang membuka `/` tetap bisa mengakses Landing Page atau langsung punya tombol "Ke Dashboard Saya", sementara login sukses langsung mengarahkan ke `/dashboard`! Dengan begitu semua link publik `/` tetap bekerja konsisten bagi user login maupun anonim.)
- **Muzakki (`USER`) Navigation:**
  - `/dashboard` — Ringkasan Muzakki
  - `/calculator` — Kalkulator Zakat
  - `/donate` — Tunaikan Zakat
  - `/programs` (`/campaigns`) — Program Zakat
  - `/my-donations` — Riwayat & Bukti Donasi
  - `/verify` — Verifikasi Blockchain
  - `/profile` — Profil & Pengaturan Sesi
- **Amil (`AMIL`) Navigation:**
  - `/dashboard` — Ringkasan Operasional Amil
  - `/campaigns` — Program Penyaluran (termasuk Buat Program)
  - `/new-record` — Catat Distribusi & Unggah Bukti
  - `/explorer` — Transaksi & Blockchain Explorer
  - `/mapping` — Pemetaan Kemiskinan & Kebutuhan Wilayah (termasuk Impor Data)
  - `/verify` — Verifikasi Publik
  - `/profile` — Profil & Pengaturan Sesi
- **Auditor (`AUDITOR`) Navigation:**
  - `/dashboard` — Antrean Review Auditor
  - `/anomalies` — Anomali Distribusi (Pindai & Tindak Lanjut)
  - `/proofs` — Verifikasi Bukti Penyaluran (Setujui / Tolak)
  - `/reconciliation` — Riwayat Rekonsiliasi (Read-only untuk Auditor)
  - `/audit` — Log Audit
  - `/explorer` — Blockchain Explorer
  - `/graph` — Evidence Graph
  - `/export` — Ekspor Laporan CSV
  - `/mapping` — Pemetaan Kemiskinan (Read-only)
  - `/profile` — Profil & Pengaturan Sesi
- **Administrator (`ADMIN`) Navigation (Dikelompokkan Logis):**
  - *Monitoring & Sistem:* `/dashboard` (System Overview), `/network` (Smart Contract & Jaringan Ethereum), `/roles` (Peran & Hak Akses), `/audit` (Log Audit)
  - *Keuangan & Pengawasan:* `/reconciliation` (Rekonsiliasi Dana + Eksekusi), `/anomalies` (Anomali), `/proofs` (Verifikasi Bukti), `/export` (Ekspor CSV)
  - *Operasional Zakat:* `/campaigns`, `/new-record`, `/mapping`, `/explorer`, `/graph`, `/donate`, `/calculator`, `/verify`, `/profile`

## 2. User Journey Maps (A–G)

### Journey A: Public Visitor -> Zakat Payer
1. **Entry:** Lands on `/` (`LandingPage`).
2. **Info Seen:** Value proposition, live aggregate stats, programs, Ethereum trust explanation.
3. **Actions:** Uses `/calculator` (optional) -> clicks `"Tunaikan Zakat"` -> selects program (`/campaigns/:id`) or general payment (`/donate`).
4. **Auth Gate:** If unauthenticated on `/donate`, guided smoothly to `/login` or `/register` with redirect back to `/donate?amount=...`.
5. **Errors Handled:** Invalid amounts, inactive campaigns, or rate limit (`429`) shown clearly with retry actions.

### Journey B: Muzakki Registration -> Successful Payment
1. **Entry:** `/register` -> fills username (`>=3` chars, `[A-Za-z0-9._-]`) + password (`>=10` chars).
2. **Response:** `POST /api/auth/register` creates `USER` -> auto-redirect/login -> lands on `/dashboard` (or redirected payment target).
3. **Payment:** `/donate` -> Step 1: Select Zakat Type/Program & Amount -> Step 2: Review -> Step 3: QRIS Sandbox Session (`POST /api/payments/session`) -> Step 4: Status Polling (`PENDING` -> `PAID`/`EXPIRED`/`FAILED`) -> Receipt view in `/my-donations`.

### Journey C: Muzakki Payment -> Blockchain Verification
1. **Context Distinction:** Payment session happens in IDR via QRIS Sandbox (`payments`/`donations` tables); distribution records are later hashed and anchored on Ethereum (`transactions` + `ZakatVerify.sol`).
2. **Flow:** From `/transparency` or `/my-donations` or `/dashboard`, user clicks any verified distribution record or enters an ID/hash in `/verify`.
3. **Response:** `GET /api/explorer/verify/*` returns DB record (non-PII) + Ethereum smart contract `verifyReport(bytes32)` status + actual network label (`Localhost / Hardhat`, `Sepolia Testnet`, or `Ethereum Mainnet`).

### Journey D: Amil Reviewing & Validating / Recording Transactions
1. **Entry:** `/dashboard` (`AmilHome`) shows pending proofs, items needing correction, and recent distribution records.
2. **Action:** Navigates to `/explorer` to inspect statuses or `/new-record` to submit distribution with proof file.

### Journey E: Amil Managing Zakat Distribution
1. **Entry:** `/new-record` (`NewDistributionRecord`).
2. **Inputs:** Amount (IDR), Optional Donor Name, Recipient Name (private), Category, Province & City, Proof File (`JPG`/`PNG`/`PDF`, max 5 MB).
3. **System Response:** Saves SQLite row + SHA-256 file hash + audit hash first (`PENDING_BLOCKCHAIN`), then attempts on-chain `registerReport`. Displays clear stage status (`Tersimpan di DB` -> `Tercatat On-Chain` or `Menunggu Node Blockchain`).

### Journey F: Amil Exploring Poverty Mapping & Needs
1. **Entry:** `/mapping` (`PovertyMapping`).
2. **Actions:** Filter provinces by priority/poverty rate, click map region to compare gap vs target, optionally import BPS/regional JSON (`POST /api/mapping/import` for `AMIL`/`ADMIN`).

### Journey G: Administrator Monitoring the Platform
1. **Entry:** `/dashboard` (`AdminHome`) shows total donations, distributed funds, net balance, open anomalies, pending proofs, and live Ethereum network status.
2. **Deep Dives:** `/network` inspects RPC reachability, actual `chainId`, contract address, and bytecode status; `/reconciliation` executes fund balance snapshots; `/audit` inspects every sensitive action; `/roles` documents RBAC boundaries.
