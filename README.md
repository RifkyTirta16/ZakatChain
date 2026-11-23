# ZakatChain

Platform **Web2 + Web3** untuk transparansi distribusi zakat: pencatatan bukti distribusi, deteksi anomali, audit trail, rekonsiliasi saldo, pemetaan kemiskinan Indonesia (38 provinsi + 114 kota/kabupaten), serta verifikasi hash publik on-chain berbasis Ethereum.

> **Prinsip Inti:** Pencatatan on-chain pada smart contract `ZakatVerify` hanya membuktikan bahwa **hash audit laporan tercatat pada blockchain**, bukan membuktikan kebenaran distribusi fisik di dunia nyata.

---

## Struktur Workspace

- `blockchain/` — Smart contract `ZakatVerify.sol` (`Hardhat 2.29`, `Solidity 0.8.24`) dan script deploy lokal.
- `backend/` — API server (`Express 5`, `TypeScript` via `tsx`, `SQLite` WAL mode, `ethers v6`, `Zod`, `multer`, cookie session `HttpOnly`).
- `frontend/` — Antarmuka web (`React 19`, `Vite 8`, `Tailwind CSS 3`, `React Router 7`, `TanStack Query`, `viem`, `Leaflet`, `Recharts`).
- `docs/` — Dokumentasi desain, audit keamanan, dan catatan sistem.

---

## Prasyarat

- **Node.js** >= 20 dan **npm**
- **SQLite 3** (`sqlite3`, opsional untuk inspeksi atau backup manual)
- **Git**

---

## Panduan Setup Tim (Lokal)

### 1. Clone Repo & Install Dependensi

```bash
git clone https://github.com/RifkyTirta16/ZakatChain.git
cd ZakatChain

cd blockchain && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Siapkan File Environment (`.env`)

Salin masing-masing template `.env.example` menjadi `.env` (file `.env` sengaja diabaikan Git agar secret tidak bocor):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Isi variabel wajib di `backend/.env`:
- `JWT_SECRET` — string acak minimal 32 karakter (buat cepat dengan `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- `PAYMENT_WEBHOOK_SECRET` — secret acak bebas untuk dev lokal / sandbox webhook.
- `BLOCKCHAIN_PRIVATE_KEY` — saat menjalankan node Hardhat lokal (`npm run node:local`), gunakan private key akun `#0` yang dicetak di terminal Hardhat **hanya untuk pengembangan lokal**.
- `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_API_KEY` *(opsional)* — bila ingin menguji Checkout QRIS DOKU Sandbox; tanpa ini, mode QRIS Sandbox lokal tetap berjalan.

Di `frontend/.env`, nilai default sudah cocok untuk pengembangan lokal (`VITE_API_URL=http://localhost:5000/api`, `VITE_RPC_URL=http://127.0.0.1:8545`, `VITE_CHAIN_ID=31337`).

### 3. Jalankan Blockchain Lokal & Deploy Kontrak

Buka **Terminal 1**:
```bash
cd blockchain
npm run node:local
```

Buka **Terminal 2** (deploy `ZakatVerify.sol` ke node lokal):
```bash
cd blockchain
npm run compile
npm run deploy:local
```
Pastikan `ZAKAT_CONTRACT_ADDRESS` di `backend/.env` dan `VITE_ZAKAT_CONTRACT_ADDRESS` di `frontend/.env` sesuai dengan alamat kontrak hasil deploy (default Hardhat akun #0 deploy pertama: `0x5FbDB2315678afecb367f032d93F642f64180aa3`).

### 4. Inisialisasi Database, Data Demo & Akun Admin

Masih di **Terminal 2**:
```bash
cd backend

# 1. Buat akun ADMIN awal (isi username & sandi kuat: min 10 karakter, huruf besar+kecil+angka)
ADMIN_USERNAME=admin ADMIN_PASSWORD='GantiSandiKuat123' npm run create:admin

# 2. Opsi A: Hanya impor 38 provinsi + 114 kota data kemiskinan BPS
npm run seed:poverty

# 2. Opsi B: Impor data kemiskinan + program zakat, mustahik, donasi, & laporan demo fiktif
# Tambah '-- --with-users' & DEMO_PASSWORD jika ingin langsung membuat akun demo_muzakki / demo_amil / demo_auditor
DEMO_PASSWORD='GantiSandiDemo123' npm run seed:demo -- --with-users
```

> **Catatan Jika Node Hardhat Lokal Direstart:** State node Hardhat lokal bersifat sementara di memori. Setelah menjalankan ulang `npm run node:local` + `npm run deploy:local`, pulihkan hash laporan `CONFIRMED`/`REVOKED` dari SQLite dengan perintah:
> ```bash
> cd backend && npm run sync:local-chain
> ```

*(Jika tim Anda menerima snapshot arsip privat berisi `database.sqlite` + `uploads/`, letakkan kedua berkas tersebut ke folder `backend/` lalu jalankan `npm run sync:local-chain` setelah Hardhat lokal menyala.)*

### 5. Jalankan Backend & Frontend

- **Terminal 2 (Backend — port `5000`):**
  ```bash
  cd backend
  npm run dev
  ```
- **Terminal 3 (Frontend — port `5173`):**
  ```bash
  cd frontend
  npm run dev
  ```

Buka **`http://localhost:5173`** di browser.

---

## Pemeriksaan Kualitas Kode & Build

```bash
# Backend typecheck
cd backend && npx tsc --noEmit

# Frontend typecheck, linter, dan production build
cd frontend && npx tsc -b && npm run lint && npm run build

# Smart contract compile
cd blockchain && npm run compile
```

---

## Hak Akses & Keamanan Ringkas

- **Role**: `USER` (Muzakki/publik terdaftar), `AMIL`, `AUDITOR`, dan `ADMIN`. Login menggunakan `username` dengan sesi berbasis cookie **`HttpOnly` (`zakat_session`)**.
- **Perlindungan Keamanan**: Hash kata sandi `bcrypt`, pencabutan sesi via `token_version` saat ganti sandi/perubahan role, account lockout setelah 5 percobaan gagal login (15 menit), proteksi CSRF Origin/Referer, validasi input `Zod`, magic-byte upload & sandbox header pada `/uploads/*`, serta validasi timestamp dan nominal pada webhook DOKU.
- **Deploy Produksi**: Wajib menggunakan HTTPS reverse proxy, `NODE_ENV=production`, `TRUST_PROXY`, `CORS_ORIGIN` & `PUBLIC_FRONTEND_URL` eksplisit, rotasi `JWT_SECRET` & `PAYMENT_WEBHOOK_SECRET`, dompet signer baru non-Hardhat, dan backup berkala `backend/database.sqlite` + `backend/uploads/`.
