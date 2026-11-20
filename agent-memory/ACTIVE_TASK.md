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
- **Navbar Portal Publik & Logo Geometris ETH Baru (`PublicShell.tsx`, `ShellFrame.tsx`, `zakatchain-logo.png`):** Mengatasi tumpang tindih (`ketumpuk`) di navbar `2xl` (`1536px+`) antara pill `PoweredByEthereum` + `NetworkBadge` dan link `Beranda` dengan merapikan layout 3-zona `shrink-0 whitespace-nowrap` yang simetris (`1024px`–`1920px`), serta membuat emblem logo datar Swiss minimalis baru (`256x256` RGBA transparan) memadukan segel Rub el Hizb emerald dan faset berlian Ethereum bernuansa emas.
- **Verifikasi:** Backend `tsc` + `75/75`, Blockchain `18/18`, Frontend `tsc -b` + `oxlint` (`0/0` pada 83 file) + `vite build` (`1.41s`, tanpa chunk warning >500 kB), serta matriks headless Chromium untuk `1920/1536/1440/1280/1024/768/390px` (logged-in & logged-out navbar gap simetris, `0` wrap, logo loaded `256px`) dan 4 role (`0` error console/page/network).

## Remaining / Next Action
- Siap di-merge ke `main` apabila pengguna menyetujui (`feat/elegant-web3-ui-and-role-sync`).
