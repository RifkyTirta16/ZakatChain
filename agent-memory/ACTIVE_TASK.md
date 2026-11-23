# Active Task / Recovery Checkpoint

**Updated:** 2026-11-23 · **Status:** Siklus kampanye, ganti sandi mandiri, fleksibilitas CORS dev, CI GitHub Actions, pembersihan `wagmi`, & sinkronisasi dokumen selesai (`feat/lifecycle-cors-ci-cleanup` -> `main`).

## Completed
- **Paket 1–5 (`8fed84d`, `ecba671`, `a69dae0`, `faad715`, `b38ea0a`, `d692a1d`)**: hardening backend & signer lokal, DB hygiene, UI/UX Publik/Muzakki, konsolidasi kontrak (`DEC-007`), pemetaan 114 Kota/Kabupaten, suite tes unit frontend (`14/14`), serta konsistensi KPI & log audit rekonsiliasi.
- **Poin 1 & Paket 6 (`feat/lifecycle-cors-ci-cleanup`)**:
  - **CORS Dev Loopback (`backend/blockchain/index.ts`)**: mengizinkan port `localhost` / `127.0.0.1` apa pun pada mode non-produksi bila `CORS_ORIGIN` tidak diset eksplisit (origin luar tetap `403`).
  - **Siklus Kampanye (`PATCH /api/campaigns/:id` & `CampaignDetail.tsx`)**: AMIL/ADMIN dapat memperbarui status (`ACTIVE`/`COMPLETED`/`CLOSED`), target, maupun tenggat program beserta `audit_logs`; program non-`ACTIVE` menyembunyikan form donasi.
  - **Ubah Kata Sandi (`PATCH /api/auth/password` & `ProfilePage.tsx`)**: setiap user login dapat mengganti sandi sendiri (`bcrypt`, minimal 10 karakter, tercatat di `audit_logs` tanpa menyimpan sandi).
  - **RBAC UI & Kebersihan (`RolesPermissionsPage.tsx`, `DonationDrawer.tsx`, `EvidenceGraph.tsx`)**: matriks RBAC kini menyertakan `/api/mustahik`, `/campaigns/:id`, dan `/auth/password`; seluruh cast `any` di frontend dihapus; dependensi `wagmi` dicabut (`main.tsx`, `queryClient.ts`, `vite.config.ts`).
  - **CI & Kebersihan Repo (`.github/workflows/ci.yml`, `docs/audit/integration-scan.txt`, `agent-memory/*`, `ARCHITECTURE.md`)**: tambah pipeline GitHub Actions 3-job (`blockchain`, `backend`, `frontend`), hapus dump audit 13,3 MB, dan sinkronkan `BUG_TRACKER.md`/`TASK_BACKLOG.md`/`ARCHITECTURE.md`.

## Remaining / Next Action
- **Produksi:** ganti kunci dev (`BLOCKCHAIN_PRIVATE_KEY`, `JWT_SECRET`, DOKU Sandbox), deploy `ZakatVerify.sol` ke jaringan tujuan, dan impor JSON BPS kab/kota resmi melalui `/mapping`.
- **Opsional lanjutan:** pemisahan tabel `payments` vs `donations` (`DEC-002`) serta uji E2E Playwright di CI.
