# Active Task / Recovery Checkpoint

**Updated:** 2026-11-23 · **Status:** Repo dipublikasikan ke GitHub (`https://github.com/RifkyTirta16/ZakatChain`, 25 branch), lengkap dengan `README.md` setup tim dan seeder demo fiktif aman (`npm run seed:demo`).

## Completed
- **Team Onboarding & Demo Seed (`docs/team-setup-and-demo-seed`)**: menambahkan `README.md` panduan setup lengkap untuk tim serta `backend/blockchain/seed_demo.ts` (`npm run seed:demo`, data demo fiktif non-PII, bukti PNG valid, opsional `--with-users` via `DEMO_PASSWORD`, tanpa menyentuh DB produksi) dan meng-push semua branch ke `origin` GitHub (`RifkyTirta16/ZakatChain`).
- **Paket 1–5 (`8fed84d`..`d692a1d`), Paket 6 (`12c100b`, `f2492e0`), QA Lintas-Role (`098c0fc`), Cleanup (`2cfd5ca`), & Blockchain Fix (`c158152`)**: selesai dan tergabung di `main`.
- **Security Hardening Produksi (`feat/security-hardening`)**:
  - **Dependensi (`0 vulnerabilities` `--omit=dev`)**: `npm audit fix` di `backend/` (`multer`, `body-parser`) & `frontend/` (`follow-redirects`, `seroval`), serta memindahkan `nodemon` ke `devDependencies` `backend/package.json`.
  - **Autentikasi & Sesi (`db.ts`, `auth.ts`, `authController.ts`, `userController.ts`, `MainApp.tsx`, `api.ts`)**: migrasi JWT dari `localStorage` ke cookie `HttpOnly; SameSite=Lax` (`zakat_session`) tanpa mengembalikan raw JWT ke JSON; sinkronisasi via `GET /api/auth/me` + `POST /api/auth/logout`; kolom `token_version` mencabut sesi lama seketika saat ganti kata sandi atau perubahan role; lockout akun 15 menit setelah 5 gagal login + `audit_logs` (`LOGIN_FAILED`, `LOGIN_LOCKED`); kompleksitas sandi (`validation.ts`).
  - **CSRF, Header, Upload & DoS (`index.ts`, `ProofsPage.tsx`, `*Controller.ts`)**: CSP, `Permissions-Policy`, HSTS produksi, validasi `Origin`/`Referer` anti-CSRF untuk mutasi cookie, penempatan `/uploads` setelah DB middleware dengan `Content-Disposition: attachment` + `CSP: sandbox`, handling malformed JSON (`400`), serta bounded pagination (`LIMIT`/`OFFSET`) pada list/export/history.
  - **Pembayaran & Kontrak (`paymentController.ts`, `ZakatVerify.sol`)**: cek kepemilikan `donor_id` di `getPaymentStatus`, validasi window `Request-Timestamp` (±15 menit) & kecocokan `order.amount` pada webhook DOKU, key sandbox CSPRNG non-prod, dan `transferOwnership` pada `ZakatVerify.sol`.

## Remaining / Next Action
- **Produksi (Infrastruktur Server):** ganti seluruh kunci dev di `backend/.env` (`JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, kredensial **DOKU Production**, `BLOCKCHAIN_PRIVATE_KEY` wallet baru), pasang reverse proxy TLS/HTTPS + HSTS, set `NODE_ENV=production`, `CORS_ORIGIN`, `PUBLIC_FRONTEND_URL`, dan `TRUST_PROXY` sesuai hop proxy, serta jadwalkan backup WAL SQLite + `uploads/`.
- **Opsional lanjutan:** pemisahan tabel `payments` vs `donations` (`DEC-002`).
