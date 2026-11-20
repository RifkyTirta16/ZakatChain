# Active Task / Recovery Checkpoint

**Updated:** 2026-11-20 · **Status:** Seluruh 11 item pada `docs/design/REDESIGN_TRACKER.md` telah selesai diredesain (Visual v2), diverifikasi 100% bersih (0 lint warning, 0 error tsc, build sukses), dan masing-masing telah di-commit ke Git (`feat/visual-v2`).

## Completed (REDESIGN_TRACKER.md 1-11)
- Item 1 (`pages/Campaigns.tsx`): Katalog kampanye Visual v2, Card rounded-2xl shadow-card, progress bar, nominal formatIDR, sisa hari daysLeft, DonationDrawer terintegrasi. (Commit `76a4b41`)
- Item 2 (`pages/CampaignDetail.tsx`): Layout 2 kolom Visual v2, ON_CHAIN_NOTE, riwayat donasi ber-badge, sticky progress & preset nominal, QRIS generator. (Commit `0787718`)
- Item 3 (`pages/DonationPayment.tsx`): 3-step wizard (Nominal -> QRIS -> Selesai), preset nominal buttons, copy feedback, auto-polling. (Commit `5ffbe54`)
- Item 4 (`components/PaymentModal.tsx`): Modal rounded-3xl, escape key listener, ringkasan nominal, status badges, backdrop dismiss. (Commit `efc396d`)
- Item 5 (`pages/NewDistributionRecord.tsx`): Form satu kolom, file upload live preview image & PDF indicator, pre-submission summary, inline validation. (Commit `b8d7bad`)
- Item 6 (`pages/PublicVerify.tsx`): Input hash/ID besar, query param auto-search (?hash=/?id=), kartu hasil verifikasi, detail kriptografis, ON_CHAIN_NOTE. (Commit `e3f7e14`)
- Item 7 (`pages/OnChainExplorer.tsx`): Explorer bukti on-chain, status filter dropdown, tabel shortHash dengan tombol salin ("Tersalin"), detail verifikasi expand/collapse, ON_CHAIN_NOTE. (Commit `c77db3a`)
- Item 8 (`pages/EvidenceGraph.tsx`): Graf SVG dengan dot grid, pewarnaan node token (teal, green, gold, coral), panel detail node kanan, ON_CHAIN_NOTE. (Commit `065bd9b`)
- Item 9 (`pages/PovertyMapping.tsx`): Peta Leaflet penuh, skala warna token (#EF6C4A, #FFD23F, #2BA8A2), panel statistik & gap wilayah, modal impor kemiskinan. (Commit `173477a`)
- Item 10 (`components/auth/LoginPage.tsx`): Kartu login centered, username input, banner error token, tombol submit emas tunggal. (Commit `935d006`)
- Item 11 (`components/Analytics.tsx`): Warna token resmi (#2BA8A2, #FFD23F, #EF6C4A, #5DADE2), Recharts BarChart & Donut (PieChart), kartu ringkasan, sumbu terformat, legend, tooltip formatIDR. (Commit `fffcd2b`)

## Sebelumnya (ringkas)
- Redesain `pages/Campaigns.tsx` (Item 1 `REDESIGN_TRACKER.md`): katalog kampanye, kartu Visual v2, integrasi `DonationDrawer`, modal Buat Kampanye. Commit 76a4b41.
- Konfigurasi chain env-driven (default Hardhat 31337); kontrak ZakatVerify.sol disejajarkan dgn invarian tes (18/18); Hardhat TS test discovery diperbaiki (type:commonjs + ts-node/register/transpile-only + override TASK_TEST_GET_TEST_FILES); role POST /api/transactions = AMIL+ADMIN + tes; SQL parameterized transactionController + regresi; audit kontrak di KNOWN_ISSUES; rencana konsolidasi docs/audit/HARDHAT_CONSOLIDATION.md (belum dieksekusi).
- Banyak perubahan lintas tugas BELUM di-commit (lihat git status): backend, blockchain, frontend, docs, agent-memory. Branch aktif: chore/chain-config.

## Remaining / next action
1. Commit per tugas dalam commit terpisah (butuh persetujuan user).
2. Sambungkan pages/home ke data backend nyata (TanStack Query) + sambungkan placeholder auditor (anomalies, proofs, reconciliation, audit, export) ke endpoint yang sudah ada.
3. Rencana konsolidasi workspace Hardhat (docs/audit/HARDHAT_CONSOLIDATION.md) belum dieksekusi.
4. Operator: buat backend/.env dgn JWT_SECRET unik; CORS allowlist + rate limit; kebijakan publik /uploads; provisioning admin pertama.
