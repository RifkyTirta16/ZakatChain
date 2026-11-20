# Active Task / Recovery Checkpoint

**Updated:** 2026-11-21 · **Status:** Upgrade visual Web3 institusional & sinkronisasi/pemisahan ketat fitur 4 role (`USER`, `AMIL`, `AUDITOR`, `ADMIN`) selesai di branch `feat/elegant-web3-ui-and-role-sync`.

## Completed
- **Upgrade Visual Web3 × Islamic Institutional Fintech (`DESIGN.md`):** Pembaruan token dan gaya arsitektural terinspirasi **Ondo Finance**, **Safe{Wallet}**, **Aave Glass**, **ENS**, & **Ethereum.org** (`JetBrains Mono`, `.bg-crypto-grid`, `.bg-dot-matrix`, `.glass-dark-card`, `.hairline-elevated`), pembaruan `Card` (`variant="glass"`), `Button`, `SectionHeader`, `StatCard` (perbaikan anti-wrap angka IDR 100% lebar kartu), `PoweredByEthereum` (`whitespace-nowrap`), `PublicShell`, `ShellFrame` (titik aksen role + sidebar `.bg-crypto-grid`), `LandingPage` (hero grid, terminal integritas, Bento Grid 12-kolom dengan kartu gelap `Ethereum SHA-256 Registry`, pipeline 4 tahap), & `PublicVerify`.
- **Sinkronisasi & Pemisahan Role (`USER` / `AMIL` / `AUDITOR` / `ADMIN`):**
  - `navConfig.ts`: menu Muzakki (`/calculator`, `/donate`, `/my-donations`) dikunci khusus `USER`; menu `Portal Transparansi` (`/transparency`) ditambahkan untuk `USER`; staf `ADMIN`/`AMIL`/`AUDITOR` memiliki menu sesuai kewenangan masing-masing.
  - `DistributionMap.tsx`: memperbaiki tautan peta agar `USER` menuju `/transparency` (bukan `/mapping` yang 403) sedangkan staf menuju `/mapping`.
  - `Campaigns.tsx`: tombol drawer donasi khusus tamu/`USER`; staf diarahkan ke `Lihat Rincian & Penyaluran →`.
  - `WelcomeCard.tsx`, `AmilHome.tsx`, `AuditorHome.tsx`, & `AdminHome.tsx`: memperkaya shortcut & panel spesifik role (`Riwayat & BSZ`, `Donasi Masuk Terbaru` + `Data Mustahik`, `Log Audit Terbaru` + `Rekonsiliasi (Pantau)`, rincian jumlah akun per role + `Catat / Revoke On-Chain`).
- **Pratinjau Bukti Terproteksi JWT (`ProofsPage.tsx` & `vite.config.ts`):** Tambah proxy `/uploads`, tab status (`Menunggu`/`Disetujui`/`Ditolak`/`Semua`), alasan penolakan, serta modal pratinjau `Lihat Bukti` via `apiClient.get(uploadUrl, { responseType: 'blob' })`.
- **Verifikasi:** Backend `tsc` + `75/75`, Blockchain `18/18`, Frontend `tsc -b` + `oxlint` (`0/0` pada 83 file) + `vite build` (`1.30s`, tanpa chunk warning >500 kB), serta matriks headless Chromium `1280x800` untuk landing page & seluruh 4 role (`0` error console/page/network, modal `/uploads/` HTTP `200`, `ADMIN` `/donate` terblokir `403`).

## Remaining / Next Action
- Siap di-merge ke `main` apabila pengguna menyetujui (`feat/elegant-web3-ui-and-role-sync`).
