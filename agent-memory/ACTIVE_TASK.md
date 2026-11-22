# Active Task / Recovery Checkpoint

**Updated:** 2026-11-22 · **Status:** Seluruh item lanjutan (Konsolidasi kontrak lama, Paket 4 level Kota/Kabupaten, suite tes unit frontend, & persiapan merge lokal ke `main`) selesai.

## Completed
- **Paket 1–3 (`8fed84d`, `ecba671`)**: hardening backend & signer lokal, DB hygiene & keseimbangan kas (`+Rp 9.350.000 BALANCED`), dan penyederhanaan UI/UX Publik + Muzakki.
- **Konsolidasi Workspace Kontrak (`a69dae0`)**: menghapus `contracts/` dan direktori kosong `backend/contracts/` setelah konfirmasi nol import; `blockchain/` menjadi satu-satunya workspace Hardhat kanonik (`18/18` passing); `DEC-007` dicatat di `DECISIONS.md` & `agent-memory/DECISIONS.md`.
- **Paket 4 — Pemetaan Kemiskinan Level Kota/Kabupaten (`faad715`)**: menambah dataset terkalibrasi `poverty_cities.json` (114 Kota/Kabupaten pada seluruh 38 provinsi), memperluas `seed_poverty.ts`, menambah filter `?level=`/`?province=` & pencocokan distribusi presisi per kota (mencegah double-counting provinsi vs kota) pada `mappingController.ts`, peta koordinat `cityCoords.ts`, dan toggle `Provinsi (38)` / `Kota/Kabupaten` + kartu drilldown di `PovertyMapping.tsx` & `ProvinceDetailCard.tsx`.
- **Suite Tes Unit Frontend (`b38ea0a`)**: ekstraksi rumus kalkulator zakat ke `src/utils/zakat.ts`, konfigurasi `tsconfig.test.json` + `.gitignore` `.test-dist/`, serta `frontend/tests/*.test.ts` (**14/14** passing tanpa dependency npm tambahan).

## Remaining / Next Action
- Produksi (jika suatu saat dideploy): ganti `BLOCKCHAIN_PRIVATE_KEY` Hardhat lokal, `JWT_SECRET`, serta kredensial DOKU Sandbox dengan kunci produksi; impor dataset BPS Kab/Kota resmi bila tersedia untuk mengganti angka kalibrasi referensi pada `poverty_cities.json`.
