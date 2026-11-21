# Active Task / Recovery Checkpoint

**Updated:** 2026-11-21 · **Status:** Pemetaan kemiskinan lengkap **38 provinsi Indonesia** beserta indikator sosial ekonomi resmi terintegrasi dan terverifikasi di branch `feat/poverty-38-provinces`.

## Completed
- **Database & Impor 38 Provinsi (`db.ts`, `validation.ts`, `mappingController.ts`, `seed_poverty.ts`, `data/poverty_provinces_38.json`):**
  - Migrasi aditif menambah kolom `level` dan `indicators_json` pada `poverty_stats` (setelah backup `database.sqlite.bak-2026-11-21`).
  - `PovertyImportSchema` & `importPovertyData` kini mendukung format datar maupun format bersarang (`poverty.poor_population_thousand * 1000`, `poverty_line_rp_per_capita_month`, P1/P2, pendidikan, partisipasi sekolah, ketenagakerjaan termasuk `agriculture: null`, porsi pangan, air/sanitasi) serta array JSON langsung; `FALLBACK_POVERTY_STATS` dan pencocokan wilayah transaksi diperbaiki.
  - Seluruh **38 provinsi** (`11` Aceh s/d `96` Papua Barat Daya) telah di-seed ke `backend/database.sqlite` (`npm run seed:poverty`), menghilangkan status demonstrasi.
- **Peta Interaktif & Rincian 38 Provinsi (`regions.ts`, `DistributionMap.tsx`, `ProvinceDetailCard.tsx`, `PovertyMapping.tsx`):**
  - Koordinat dan daftar kota seluruh **38 provinsi** disatukan di `utils/regions.ts` dan dipakai ulang di `DistributionMap.tsx` & `PovertyMapping.tsx`.
  - Peta `PovertyMapping` merender **38 pin `CircleMarker` interaktif** di seluruh Nusantara lengkap dengan panel `ProvinceDetailCard` (Garis Kemiskinan, P1/P2, Pendidikan, Partisipasi Sekolah, Ketenagakerjaan + penanganan `N/A`, Porsi Pangan, Air Layak & Sanitasi).
- **Verifikasi:** Backend `tsc --noEmit` & `75/75` pass (`validation.test.ts` diperluas); Frontend `tsc -b` + `oxlint` (`0/0` pada 84 file) + `vite build` bersih; live API `38` provinsi & uji headless Chromium `/mapping` (`38` CircleMarker aktif, banner demo hilang, rincian Papua Pegunungan `95` & DKI Jakarta `31` `null`-safe, `0` error console/HTTP).

## Remaining / Next Action
- Siap di-review atau di-merge (`feat/poverty-38-provinces` -> `feat/elegant-web3-ui-and-role-sync` / `main`) sesuai keputusan pengguna.
