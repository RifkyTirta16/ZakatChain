# Active Task / Recovery Checkpoint

**Updated:** 2026-11-23 · **Status:** Perbaikan sinkronisasi `nonce` node lokal Hardhat, penghapusan `blockchain/tsconfig.json` kosong, dan nol warning Solidity selesai (`fix/blockchain-sync-and-config` -> `main`).

## Completed
- **Paket 1–5 (`8fed84d`, `ecba671`, `a69dae0`, `faad715`, `b38ea0a`, `d692a1d`)**: hardening backend & signer lokal, DB hygiene, UI/UX Publik/Muzakki, konsolidasi kontrak (`DEC-007`), pemetaan 114 Kota/Kabupaten, serta konsistensi KPI & log audit rekonsiliasi.
- **Poin 1 & Paket 6 (`feat/lifecycle-cors-ci-cleanup`, `12c100b`, `f2492e0`)**: CORS loopback dev, `PATCH /api/campaigns/:id`, `PATCH /api/auth/password`, `autoComplete="username"` pada `/profile`, shell workspace pada `/transparency` saat login, pipeline `.github/workflows/ci.yml`, dan pembersihan `wagmi`/dump audit.
- **QA Lintas-Role & Perbaikan Cache/UI (`fix/qris-cache-and-ui-polish`, `098c0fc`)**: penyeragaman `invalidateDonationQueries`, kondisi banner Zakat Umum, dan padding `<select>` di `MyDonationsPage.tsx`.
- **Pembersihan Repo & File Test (`chore/cleanup-unused-and-tests`, `2cfd5ca`, `adcc0c8`)**: penghapusan file test, dead code/orphan (setelah merge `Campaign` ke `useDashboardData.ts`), template/backup lama, dan penyesuaian CI/package scripts dengan tetap mempertahankan `backend/blockchain/`.
- **Perbaikan Sinkronisasi & Kontrak Blockchain (`fix/blockchain-sync-and-config`)**:
  - `backend/blockchain/sync_local_chain.ts`: menonaktifkan cache RPC 250ms (`cacheTimeout: -1`) dan mengambil nonce `'pending'` eksplisit pada setiap `registerReport` / `revokeReport` untuk mencegah `NONCE_EXPIRED` saat memulihkan beberapa transaksi berurutan pada restart `hardhat node`.
  - Menghapus `blockchain/tsconfig.json` yang gagal `TS18003` karena seluruh file `.ts` di `blockchain/` sudah dihapus (tinggal `.cjs` & `.sol`).
  - `blockchain/contracts/ZakatVerify.sol`: mengganti nama return `bool exists` -> `bool reportExists` di `verifyReport` untuk menghilangkan compiler shadowing warning tanpa mengubah fungsi/selector/tuple ABI.

## Remaining / Next Action
- **Produksi:** ganti kunci dev (`BLOCKCHAIN_PRIVATE_KEY`, `JWT_SECRET`, DOKU Sandbox), deploy `ZakatVerify.sol` ke jaringan tujuan, dan impor JSON BPS kab/kota resmi melalui `/mapping`.
- **Opsional lanjutan:** pemisahan tabel `payments` vs `donations` (`DEC-002`) atau penambahan kembali tes regresi saat dibutuhkan.
