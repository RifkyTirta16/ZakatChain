# Active Task / Recovery Checkpoint

**Updated:** 2026-11-20 · **Status:** Paket fitur lengkap (QRIS Scan-to-Pay SVG, Revoke On-Chain, Alokasi & Pelacakan Multi-Daerah, Master Data Mustahik, & Bukti Setor Zakat BSZ) selesai di branch `feat/qris-revoke-mustahik-trace`.

## Completed
- **QRIS Sandbox Scan-to-Pay (`qrcode.react@4.2.0`):** `QrCodeBox` merender QRCodeSVG asli di seluruh 4 layar bayar + toggle `IP WiFi LAN` + Vite `/api` proxy; `SandboxPayPage` (`/sandbox/pay/:sessionId`) bertoken HMAC memungkinkan scan HP mengonfirmasi pembayaran secara live sehingga layar utama otomatis berpindah ke `PAID`.
- **Revoke On-Chain & Multi-Daerah:** `PATCH /api/transactions/:id/revoke` (`ADMIN`-only -> `ZakatVerify.revokeReport` + `audit_logs`) & UI `OnChainExplorer` + `PublicVerify`; tabel `transaction_allocations` & form multi-wilayah di `NewDistributionRecord`; endpoint `GET /api/donations/:id/trace` & visualisasi porsi daerah (`Jejak Wilayah`) di `MyDonationsPage`.
- **Master Mustahik & BSZ:** tabel `mustahik` + endpoint terproteksi `/api/mustahik` + `MustahikPage` (`/mustahik`) + pemilih mustahik di `NewDistributionRecord`; cetak/PDF **Bukti Setor Zakat (BSZ)** di `MyDonationsPage` dengan `@media print`.
- **Verifikasi:** Backend `75/75`, Blockchain `18/18`, Frontend `tsc -b` + `oxlint` (`0/0` pada 83 file) + `vite build` bersih tanpa peringatan chunk, dan uji live browser QRIS scan-to-pay + polling + Jejak Wilayah + BSZ lulus.

## Remaining / Next Action
- Siap untuk review pengguna atau di-merge ke `main`.
