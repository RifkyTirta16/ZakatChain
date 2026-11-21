# Active Task / Recovery Checkpoint

**Updated:** 2026-11-21 · **Status:** Pemetaan kemiskinan lengkap **38 provinsi Indonesia** beserta indikator sosial ekonomi resmi terintegrasi dan terverifikasi di branch `feat/poverty-38-provinces`.

## Completed
- **Database & Impor 38 Provinsi (`db.ts`, `validation.ts`, `mappingController.ts`, `seed_poverty.ts`, `data/poverty_provinces_38.json`):**
  - Migrasi aditif menambah kolom `level` dan `indicators_json` pada `poverty_stats` (setelah backup `database.sqlite.bak-2026-11-21`).
  - `PovertyImportSchema` & `importPovertyData` kini mendukung format datar maupun format bersarang (`poverty.poor_population_thousand * 1000`, `poverty_line_rp_per_capita_month`, P1/P2, pendidikan, partisipasi sekolah, ketenagakerjaan termasuk `agriculture: null`, porsi pangan, air/sanitasi) serta array JSON langsung; `FALLBACK_POVERTY_STATS` dan pencocokan wilayah transaksi diperbaiki.
  - Seluruh **38 provinsi** (`11` Aceh s/d `96` Papua Barat Daya) telah di-seed ke `backend/database.sqlite` (`npm run seed:poverty`), menghilangkan status demonstrasi.
- **Peta Interaktif & Rincian 38 Provinsi (`regions.ts`, `DistributionMap.tsx`, `ProvinceDetailCard.tsx`, `PovertyMapping.tsx`):**
  - Koordinat dan daftar kota seluruh **38 provinsi** disatukan di `utils/regions.ts` dan dipakai ulang di `DistributionMap.tsx` & `PovertyMapping.tsx`.
  - Perbaikan logika prioritas (`normPoverty*0.55 + normDepth*0.20 + unreached*0.25`, `>=55 CRITICAL / >=40 WARNING / <40 STABLE` menghasilkan **9 CRITICAL, 16 WARNING, 13 STABLE**), agregasi `LEFT JOIN transaction_allocations` tanpa menghitung transaksi `REJECTED`/`REVOKED`, serta menghilangkan kalkulasi ulang ganda di client.
  - Perbaikan UI `/mapping`: header satu baris + **4 KPI ringkasan nasional** (`38 provinsi`, `23.854.570 jiwa`, `9 provinsi kritis`, `30.03%`), 3 mode warna (`Kemiskinan`, `Prioritas`, `Kedalaman P1`) beserta legenda tersinkronisasi, kontrol zoom `+/-` + `Reset Peta Indonesia`, z-order lingkaran bermargin putih agar Jakarta/Banten/DIY tetap mudah diklik, chip cepat Top-3, grid `MiniTile` (memperbaiki teks pendidikan yang sempat berhimpitan), serta tombol `Catat Penyaluran ke Wilayah Ini` untuk `AMIL`/`ADMIN`.
- **Verifikasi:** Backend `tsc --noEmit` & **76/76 pass** (`apiIntegration.test.ts` ditambah tes kalibrasi 3-status, `transaction_allocations`, & eksklusi `REVOKED`/`REJECTED`); Frontend `tsc -b` + `oxlint` (`0/0` pada 84 file) + `vite build` (`1.40s`); uji live API & Chromium `/mapping` (`h1H: 36px`, `hasZoom: true`, filter `9/16/13/38` cocok 100%, `0` error console/HTTP).

## Remaining / Next Action
- Siap di-review atau di-merge (`feat/poverty-38-provinces` -> `feat/elegant-web3-ui-and-role-sync` / `main`) sesuai keputusan pengguna.
