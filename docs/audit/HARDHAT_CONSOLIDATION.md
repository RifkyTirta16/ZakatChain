# Rencana Konsolidasi Workspace Hardhat

Tanggal: 2026-11-18 · Status: RENCANA (belum dieksekusi) · Branch referensi: `fix/hardhat-tests`

## Ringkasan eksekutif

Tiga workspace Hardhat ditemukan di repo. Hanya `blockchain/` yang hidup: punya tes
berjalan (18/18), kontrak kanonik, dan konfigurasi terpelihara. `contracts/` berisi
kontrak alternatif berbeda nama + ABI lama, tanpa tes. `backend/contracts/` **kosong**
(hanya folder). Tidak ada kode backend/frontend yang mengimpor artifact dari workspace
mana pun — kedua sisi memakai ABI yang di-inline manual, dan ABI frontend sudah
**keluar sinkron** dengan kontrak (`reportId: string` vs `uint256`, tanpa `revokeReport`).

## 1. Tabel perbandingan tiga workspace

| Aspek | `blockchain/` (kanonik) | `contracts/` (legacy) | `backend/contracts/` |
|---|---|---|---|
| Kontrak | `ZakatVerify.sol` (Solidity ^0.8.24) | `ZakatAuditRegistry.sol` (Solidity ^0.8.19) | (tidak ada) |
| Kunci registrasi | `bytes32` hash + `uint256` reportId, owner-only | `string` auditHash, **tanpa kontrol akses** (addAuditRecord publik) | — |
| Revoke/invalidasi | `revokeReport` + flag `revoked` (sticky, tes 18/18) | `validateRecord(isValid: bool)` dua arah, bisa dinonaktifkan siapa pun | — |
| Event | `ReportRegistered(bytes32,uint256,uint256)`, `ReportRevoked(bytes32,string)` | `RecordAdded(string,uint256)`, `RecordValidated(string,bool)` | — |
| Enumerasi | tidak ada | `records[]` + `totalRecords()` (fitur unik) | — |
| Konfigurasi | `hardhat.config.cjs` + `tsconfig.json` + script tes diperbaiki (fix/hardhat-tests) | `type: module`, tanpa konfigurasi hardhat yang jelas, `typescript ^7.0.2` | tidak ada |
| Tes | 18/18 passing | tidak ada (`echo "Error: no test specified"`) | tidak ada |
| Dipakai oleh | backend `web3.ts` (ABI inline cocok) & frontend `web3.ts` (ABI inline **tidak** cocok) | **tidak ada** konsumen ditemukan | **tidak ada** konsumen ditemukan |

## 2. Fitur unik yang harus dipertahankan (dari ZakatAuditRegistry)

1. **Enumerasi daftar record** (`records[]`, `totalRecords()`) — berguna untuk audit
   "tampilkan semua laporan" tanpa indexer. Belum ada di ZakatVerify.
2. **Validasi dua arah (valid/invalid)** — semantiknya beda dari revoke; perlu keputusan
   apakah dibutuhkan. Saat ini tidak dipakai backend/frontend mana pun.
3. Yang TIDAK layak dipindahkan: `string` sebagai kunci (boros gas, tidak kompatibel
   dengan hashing `bytes32` backend), dan tanpa kontrol akses (melanggar model kepercayaan
   "owner-only" yang sudah dites).

## 3. Rencana bertahap (tiap langkah bisa dibatalkan; urutan aman)

> Prasyarat: keputusan di bagian 4. Semua deploy hanya di Hardhat lokal.

- **Langkah 0 — Bekukan state (tanpa perubahan).** Catat di DECISIONS.md bahwa
  `blockchain/` kanonik; tag/commit kondisi sekarang sebagai titik rollback.
- **Langkah 1 — Perbaiki ABI inline frontend.** Sinkronkan `frontend/src/web3.ts`
  (`reportId uint256`, tambah `revokeReport`, `verifyReport` sudah benar) — perbaikan
  bug nyata, berdiri sendiri, menghilangkan risiko sebelum apa pun dipindah.
- **Langkah 2 — Porting fitur enumerasi (opsional).** Tambah `getAllRecords()`/
  `totalRecords()` (view) ke `ZakatVerify.sol` + tes di `ZakatVerify.test.ts`.
  Batal aman: fitur baru, tidak mengubah fungsi yang ada.
- **Langkah 3 — Ganti ABI inline dengan artifact.** Backend/frontend membaca ABI dari
  `blockchain/artifacts/contracts/ZakatVerify.sol/ZakatVerify.json` (disalin saat build,
  bukan import lintas-folder) — satu sumber kebenaran. Batal aman: kembali ke ABI inline.
- **Langkah 4 — Arsipkan `contracts/`.** Pindahkan ke `docs/legacy/contracts/` (read-only,
  tanpa package.json aktif) ATAU hapus setelah konfirmasi tidak ada konsumen. Hapus
  `node_modules/contracts` untuk hemat ±1 GB.
- **Langkah 5 — Hapus folder kosong `backend/contracts/`.** Satu `rmdir`, bisa
  di-recreate kapan pun.
- **Langkah 6 — Bersihkan rujukan.** Perbarui AGENTS.md (peta file + bagian 7) dan
  blok "Tiga workspace Hardhat" di KNOWN_ISSUES.md menjadi "satu workspace".

## 4. Risiko dan keputusan yang dibutuhkan

**Keputusan:**
1. Apakah fitur enumerasi + validasi dua arah ZakatAuditRegistry akan dipertahankan
   (porting ke ZakatVerify) atau cukup diarsipkan apa adanya?
2. Metode arsip `contracts/`: pindah ke `docs/legacy/` atau hapus total?
   (Git history tetap menyimpan isinya.)
3. Apakah frontend berhak memanggil `revokeReport` langsung (butuh private key owner
   di browser = dilarang) atau revoke tetap backend-only? Saran: backend-only.

**Risiko:**
- R1 — ABI frontend sekarang salah (`reportId string`): pemanggilan `registerReport`
  dari frontend akan revert/mismatch setelah kontrak diperbarui. Perbaiki di Langkah 1
  SEBELUM deploy ulang apa pun.
- R2 — Address kontrak ter-hardcode sebagai fallback yang sama di backend & frontend
  (`0x5FbDB…80aa3`, alamat deployment Hardhat pertama): setelah redeploy, keduanya harus
  diperbarui via env (`ZAKAT_CONTRACT_ADDRESS` / `VITE_ZAKAT_CONTRACT_ADDRESS`).
- R3 — Menghapus workspace menambah risiko kehilangan file yang belum ter-git (cek
  `git status` sebelum Langkah 4-5).
- R4 — `node_modules` besar (±1,9 GB total): penghapusan hanya boleh via langkah
  berjenjang dengan persetujuan.

**Sumber terverifikasi:** ZakatVerify.sol (fix/hardhat-tests, 18/18 tes),
ZakatAuditRegistry.sol:1-46, `ls backend/contracts/` (kosong),
`grep ZakatAuditRegistry|ZakatVerify|artifacts|abi` di backend/ & frontend/src
(hanya `web3.ts` backend:4-71 dan `frontend/src/web3.ts`:11-32), kedua package.json.
