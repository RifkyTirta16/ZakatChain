# Active Task / Recovery Checkpoint

**Updated:** 2026-11-21 · **Status:** Integrasi resmi **DOKU Sandbox Checkout QRIS** (`POST /checkout/v1/payment`, `GET /orders/v1/status/:invoice`, webhook `POST /api/payments/doku/notify` terverifikasi `HMACSHA256`) selesai dan terverifikasi live di branch `feat/doku-qris-sandbox`.

## Completed
- **DOKU Sandbox Checkout QRIS (`backend/blockchain/utils/doku.ts`, `paymentController.ts`, `paymentRoutes.ts`, `QrCodeBox.tsx`):**
  - Menyimpan kredensial DOKU Sandbox (`DOKU_BASE_URL`, `DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`, `DOKU_API_KEY`) aman hanya di `backend/.env` (gitignored) serta mendokumentasikan nama variabel di `backend/.env.example`.
  - Implementasi HMAC-SHA256 Digest + Signature + pemaksaan IPv4 (`family: 4` agar bebas timeout IPv6 NAT64) untuk `POST /checkout/v1/payment` (`payment_method_types: ["QRIS"]`) dan sinkronisasi otomatis `GET /orders/v1/status/:invoiceNumber` di `GET /api/payments/status/:sessionId`, ditambah handler webhook resmi `POST /api/payments/doku/notify` (`applyProviderSettlement` idempoten).
  - Fallback otomatis ke simulator HMAC lokal bila env DOKU kosong / offline; UI `QrCodeBox` mendeteksi URL DOKU Sandbox dengan lencana `DOKU SANDBOX QRIS READY`, tautan langsung `Buka Halaman QRIS DOKU Sandbox`, & toggle fallback `IP LAN`.
- **Pemetaan Kemiskinan 38 Provinsi Sebelumnya:** Selesai di commit `e6e176a`; masih menunggu konfirmasi terpisah terkait rencana opsional detail **Kota/Kabupaten** (5 file).
- **Verifikasi:** Backend `tsc --noEmit` & **77/77 pass** (`paymentWebhook.test.ts` menguji DOKU digest, validasi signature/Client-Id, & idempotensi webhook); Frontend `tsc -b` + `oxlint` (`0/0` pada 84 file) + `vite build` (`1.56s`); live `POST /api/payments/session` & Chromium `/donate` (`provider: DOKU-Checkout-Sandbox`, link `https://staging.doku.com/checkout-link-v2/...`, `QRCodeSVG` terender, `0` error console/HTTP).

## Remaining / Next Action
- Siap dicoba bayar lewat QR / tombol `Buka Halaman QRIS DOKU Sandbox`, atau dikonfirmasi bila ingin melanjutkan pemetaan level Kota/Kabupaten (dan merotasi key sandbox di dashboard DOKU sesudah demo selesai).
