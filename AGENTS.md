# ZakatChain — Instruksi Agent

Platform Web2+Web3 untuk distribusi zakat transparan: bukti, audit, monitoring,
verifikasi publik, pemetaan kemiskinan.
PRINSIP INTI: blockchain hanya membuktikan HASH tercatat, BUKAN kebenaran distribusi
di dunia nyata. Jangan pernah menulis kode, teks UI, atau dokumen yang mengklaim sebaliknya.

## 0. Urutan baca (hemat konteks, jangan jelajah ulang repo)
1. agent-memory/ACTIVE_TASK.md      tugas yang sedang berjalan
2. agent-memory/PROJECT_STATE.md    kondisi terkini
3. agent-memory/KNOWN_ISSUES.md     jangan "menemukan ulang" masalah yang sudah dicatat
4. Tugas UI -> DESIGN.md. Tugas backend/chain -> ARCHITECTURE.md
Buka file lain HANYA bila relevan. Jangan cat seluruh file besar: pakai grep, head, sed -n.
Repo >500 MB: jangan index buta. Abaikan node_modules, .git, dist, build, artifacts,
cache, uploads kecuali tugas memintanya.

## 1. Alur kerja wajib (setiap tugas)
1. PAHAMI: ulangi tugas dalam 1-2 kalimat + kriteria selesai. Ambigu -> tanya 1 pertanyaan.
2. RENCANA: daftar file yang akan disentuh (maks. jelas, minimal). Tugas >3 file atau
   menyentuh DB/auth/pembayaran/chain -> tunggu persetujuan sebelum eksekusi.
3. CHECKPOINT: pastikan git bersih, buat commit/branch sebelum perubahan besar.
4. EKSEKUSI: perubahan kecil dan terfokus. Satu tugas = satu tujuan. Tidak ada refactor
   yang tidak diminta.
5. VERIFIKASI: jalankan build/lint/tes (lihat Definition of Done). Lihat hasil asli,
   jangan menebak.
6. LAPOR: apa yang diubah (path file), bukti verifikasi, risiko tersisa, langkah berikut.
7. SIMPAN MEMORI: update agent-memory (lihat bagian 8).

## 2. Anti-halusinasi (aturan keras)
- JANGAN mengarang kredensial, akun, endpoint, nama kolom, atau data. Cek kode/DB dulu.
  (Pernah terjadi: agent menulis akun admin@zakat.id yang tidak ada di seed.)
- Tandai setiap klaim: [TERVERIFIKASI: file:baris/perintah] atau [ASUMSI].
- Tidak tahu -> katakan tidak tahu, lalu cek. Jangan mengisi celah dengan tebakan.
- Jangan menyatakan "selesai/berhasil" tanpa menjalankan perintah verifikasinya.
- Tulis path file lengkap setiap menyebut file.

## 3. Peta file
Root:
- README.md                            panduan setup tim, env, blockchain lokal, & seeder

Backend (Express 5 + TS via tsx, port 5000, prefix /api, ESM "type: module"):
- backend/blockchain/index.ts          entry server
- backend/blockchain/routes/*.ts       endpoint
- backend/blockchain/controllers/*.ts  logika (anomaly, audit, auth, campaign, dashboard,
                                       donation, explorer, export, mapping, mustahik, payment,
                                       proof, public, reconciliation, transaction, user)
- backend/blockchain/middleware/       auth.ts (authenticate, authorize, authorizeSelfOr),
                                       rateLimit.ts, upload.ts (multer)
- backend/blockchain/models/db.ts      init SQLite + migrasi aditif (FK on, WAL on)
- backend/blockchain/utils/            crypto.ts, validation.ts (Zod), web3.ts, auditLogger.ts, doku.ts
- backend/blockchain/seed.ts           seed 5 transaksi, TIDAK membuat user
- backend/blockchain/seed_admin.ts     CLI provisioning akun ADMIN awal (aman untuk produksi)
- backend/blockchain/seed_demo.ts      CLI data demo fiktif non-PII + PNG bukti (non-production)
- backend/blockchain/seed_poverty.ts   impor data kemiskinan 38 provinsi + 114 kota/kabupaten ke SQLite
- backend/blockchain/sync_local_chain.ts memulihkan hash terkonfirmasi/dicabut ke node Hardhat lokal
- backend/blockchain/data/             dataset referensi statis (poverty_provinces_38.json, poverty_cities.json)
- backend/database.sqlite              DB aktif (+ -shm/-wal: jangan dihapus manual)
- backend/uploads/                     file bukti (terproteksi AMIL/AUDITOR/ADMIN via /uploads)
- backend/.env                         RAHASIA. Dilarang dibaca/dicetak nilainya.
  Lihat nama variabel saja: sed 's/=.*/=/' backend/.env

Frontend (React 19 + Vite 8 + Tailwind 3 + React Router 7 + TanStack Query + viem):
- frontend/src/main.tsx -> queryClient.ts -> MainApp.tsx (routing)
- frontend/src/pages/        public/ (LandingPage, ZakatCalculatorPage, PublicTransparencyPage, SandboxPayPage),
                             home/ (DonorHome, AmilHome, AuditorHome, AdminHome),
                             amil/ (MustahikPage), muzakki/ (MyDonationsPage), admin/ (NetworkMonitorPage, RolesPermissionsPage),
                             shared/ (ProfilePage), Dashboard, Campaigns, CampaignDetail, DonationPayment,
                             NewDistributionRecord, OnChainExplorer, EvidenceGraph, PovertyMapping,
                             PublicVerify, anomalies/, audit/, export/, proofs/, reconciliation/
- frontend/src/components/   Analytics, PaymentModal, auth/, dashboard/, ethereum/, layout/, mapping/, ui/
- frontend/src/utils/        api.ts (axios), format.ts, regions.ts, cityCoords.ts, zakat.ts
- frontend/src/assets/       zakatchain-logo.png (mark logo geometris ETH)
- frontend/tailwind.config.js  token desain (lihat docs/design/DESIGN_SYSTEM.md & DESIGN.md)

Blockchain: kanonik di `blockchain/` (ZakatVerify.sol, Hardhat 2.29, Solidity 0.8.24). Workspace lama (`contracts/` dan `backend/contracts/`) telah dikonsolidasikan dan dihapus.

## 4. Hak akses (diturunkan dari routes, verifikasi ulang bila route berubah)
Role: USER, ADMIN, AMIL, AUDITOR. Login memakai USERNAME. Register selalu membuat USER.
- Publik: GET /campaigns, GET /campaigns/:id, GET /explorer/verify/*, POST /auth/login, POST /auth/register, POST /auth/logout,
          GET /public/transparency (agregat + non-PII), POST /payments/webhook, POST /payments/doku/notify (HMACSHA256),
          GET /payments/sandbox/session/:sessionId & POST /payments/sandbox/scan-confirm/:sessionId (non-production, token HMAC)
- Login saja: GET /auth/me, PATCH /auth/password (ubah sandi akun sendiri), dashboard/stats, mapping (stats, recommendations, region/:r),
  payments (generate/session/create/status/verify dengan cek pemilik), POST /payments/sandbox/confirm/:sessionId (non-production)
- AMIL+AUDITOR+ADMIN: GET /transactions, GET /donations, GET /uploads/*, GET /mustahik, GET /mustahik/:id
- ADMIN+AMIL: POST /campaigns, PATCH /campaigns/:id, POST /mapping/import, POST /mustahik, PATCH /mustahik/:id
- ADMIN+AUDITOR: anomalies (GET, scan, resolve), audit logs, proofs/verify/:id,
  reconciliation/history, export/csv
- ADMIN: reconciliation/run, transactions/:id/reconcile, transactions/:id/revoke, GET /users, PATCH /users/:id/role
- AMIL+ADMIN: POST /transactions (upload bukti)
- Donasi per donor: authorizeSelfOr(ADMIN, AUDITOR) pada /donations/donor/:donor_id; GET /donations/:id/trace (pemilik/ADMIN/AUDITOR)
Endpoint baru WAJIB punya authenticate + authorize yang sesuai. Default: paling ketat.

## 5. Database (SQLite)
Tabel: users, transactions, transaction_allocations, mustahik, campaigns, donations,
payments, payment_events, anomalies, audit_logs, reconciliation_logs, poverty_stats.
- Skema asli: sqlite3 backend/database.sqlite ".schema"
- Migrasi harus ADITIF (ADD COLUMN / CREATE IF NOT EXISTS). Dilarang DROP, TRUNCATE,
  DELETE massal, atau reset DB. Data beneficiary bersifat privat.
- Sebelum migrasi: cp backend/database.sqlite backend/database.sqlite.bak-$(date +%F)
  (backup itu jangan di-commit).
- Query selalu parameterized (?), tidak ada string concatenation.

## 6. Keamanan & privasi (non-negosiable)
- Jangan cetak/commit: .env, private key, JWT_SECRET, password, hash bcrypt.
- Jangan deploy kontrak, kirim transaksi, atau menyentuh dana nyata tanpa izin eksplisit.
  Default jaringan: lokal (Hardhat). Mainnet/Sepolia = butuh persetujuan.
- Validasi semua input dengan Zod (utils/validation.ts). Jangan percaya data klien.
- Webhook pembayaran harus memverifikasi signature/secret sebelum mengubah status.
- Setiap aksi yang mengubah data penting (verifikasi bukti, rekonsiliasi, resolve anomali)
  ditulis ke audit_logs lewat utils/auditLogger.ts.
- Upload: batasi tipe & ukuran, nama acak. Jangan tambah endpoint yang membuka
  data penerima ke publik.
- Jangan log data sensitif ke console. Error ke klien: pesan generik, detail hanya di log.
- Sebelum menambah dependency: sebut alasan, cek ukuran dan maintainer, minta persetujuan.

## 7. Masalah yang sudah diketahui (jangan diperbaiki diam-diam, laporkan dulu)
- Workspace kontrak sudah terkonsolidasi ke `blockchain/` (workspace lama `contracts/` & `backend/contracts/` sudah dihapus per `DEC-007`).
- File test & orphan telah dibersihkan atas permintaan pengguna (verifikasi melalui `tsc`, `oxlint`, `vite build`, `hardhat compile`, dan uji manual/live server).
- paymentRoutes masih menjaga alias endpoint pembuat sesi (`generate`/`session`/`create`) dan legacy `/api/payment/generate` untuk kompatibilitas.
- Data kemiskinan `poverty_stats` kini mencakup 38 Provinsi BPS dan 114 Kota/Kabupaten kalibrasi referensi (dapat ditimpa dengan impor JSON BPS resmi tingkat kota lewat `POST /api/mapping/import`).
Sumber lengkap: agent-memory/KNOWN_ISSUES.md. Temuan baru dicatat di sana.

## 8. Protokol memori (di akhir setiap tugas)
- ACTIVE_TASK.md: status tugas, langkah berikut, blocker.
- SESSION_LOG.md: ringkasan 3-5 baris (apa, file, hasil verifikasi).
- DECISIONS.md: hanya bila ada keputusan arsitektur (alasan + alternatif).
- BUG_TRACKER.md / KNOWN_ISSUES.md: temuan baru.
- LESSONS_LEARNED.md: kesalahan agent + cara menghindarinya.
- Bagian "Peta file" di AGENTS.md ini: update bila file ditambah/dipindah/dihapus.
- ARCHITECTURE.md & DECISIONS.md ada di root DAN agent-memory/. Rujukan utama:
  agent-memory/. Jangan edit salinan root tanpa menyinkronkan.
Jangan menulis secret ke file memori.

## 9. Standar kode
- TypeScript strict; hindari `any` (kode lama masih ada, jangan menambah).
- Backend: controller tipis, validasi di awal, error handling try/catch, status HTTP benar
  (400 validasi, 401 belum login, 403 tidak berhak, 404, 409 konflik, 500 generik).
- Frontend: komponen fungsional, data fetching via TanStack Query (bukan useEffect+fetch),
  satu axios instance di utils/api.ts, tidak ada URL/hex warna hardcode.
- Format uang & tanggal hanya lewat utils/format.ts. Status bukti hanya lewat components/ui/badgeStatus.ts.
- Nama file: komponen PascalCase, util camelCase. Impor ESM dengan ekstensi .js di backend.
- Komentar menjelaskan KENAPA, bukan APA. Hapus kode mati yang kamu buat sendiri.
- Teks UI Bahasa Indonesia; kode, nama variabel, commit message Bahasa Inggris.

## 10. Definition of Done
Backend: cd backend && npx tsc --noEmit; server start tanpa error; endpoint dicoba
  (curl) untuk kasus berhasil, input salah, tanpa token, role salah.
Frontend: cd frontend && npx tsc -b && npm run build && npm run lint bersih; halaman punya state
  loading/kosong/error; responsif; sesuai DESIGN.md.
Umum: tidak ada secret di diff (git diff --staged), peta file & memori terbarui,
  laporan menyebut file + bukti verifikasi + risiko tersisa.
Jika tes/build sudah gagal SEBELUM perubahanmu, laporkan itu terpisah, jangan sembunyikan.

## 11. Git
- Branch per tugas: feat/..., fix/..., chore/.... Jangan commit langsung ke main.
- Commit kecil, pesan: type(scope): ringkas (mis. fix(auth): reject empty username).
- Jangan git push --force, reset --hard, clean -fd, atau hapus branch tanpa izin.
- Jangan commit: .env, database.sqlite*, uploads/, node_modules/, log Hardhat.

## 12. Kapan WAJIB bertanya dulu
Menyentuh auth/role, skema DB, logika pembayaran/rekonsiliasi, kontrak/chain,
menghapus atau memindah file, menambah dependency, atau tugas ambigu.
Selain itu: kerjakan, jangan banyak tanya.

## 13. Format laporan akhir
Ringkasan (1-2 kalimat) -> File diubah (path + 1 baris tiap file) -> Verifikasi (perintah +
hasil) -> Risiko/asumsi -> Saran langkah berikut.

## 14. Clean code & kebersihan repo
Prinsip: kode dibaca jauh lebih sering daripada ditulis. Sederhana > pintar.
- Satu fungsi = satu tugas, idealnya <40 baris. Satu file = satu tanggung jawab,
  file >300 baris dipecah. Nesting maksimal 3 level (pakai early return).
- Nama harus menjelaskan diri sendiri (getUnreconciledTransactions, bukan getData).
  Tidak ada singkatan samar, magic number, atau string literal berulang: jadikan konstanta.
- DRY secukupnya: duplikasi 3x -> ekstrak. Jangan abstraksi dini.
- Controller tipis: validasi -> panggil service/query -> kirim respons.
  Logika bisnis dipisah ke services/ (target), bukan di controller atau komponen UI.
- Frontend: komponen presentasional dipisah dari logika data (custom hook di hooks/).
  Tidak ada komponen >200 baris. Tidak ada style/warna yang diulang: pakai components/ui/.
- Hapus kode mati, import tak terpakai, console.log, dan komentar kode lama.
- Hindari `any`. Definisikan tipe untuk respons API dan baris database (types/).
- Setiap bug yang diperbaiki ditambah tes regresi bila memungkinkan.
- Refactor hanya pada file yang memang sedang dikerjakan, dalam commit terpisah
  (refactor(scope): ...), tanpa mengubah perilaku. Refactor besar -> minta persetujuan.
- Linter wajib bersih sebelum selesai (frontend: npm run lint).

### Kebersihan repo
- Jangan pernah menaruh node_modules, artifacts, cache, log, database, uploads, atau .env
  di Git. Cek .gitignore sebelum menambah file baru.
- Jangan membuat file cadangan (*.bak, *.save, salinan "_old", "_copy") di repo.
  Gunakan Git. Dokumen duplikat dilarang: satu topik = satu file.
- Jangan membuat folder atau workspace baru tanpa persetujuan.
- Laporkan bila ukuran repo (tanpa node_modules/.git) melebihi 100 MB.

## 15. Ukuran repo
Ukuran normal repo tanpa node_modules ≈ 15 MB. node_modules (±1,9 GB, 4 folder)
bukan bagian kode: jangan dibaca, jangan di-index, jangan dihapus tanpa izin.
Jangan mencoba "mengecilkan" repo dengan menghapus file sumber.

## 16. Sintaks JSX
- Komentar di dalam JSX HARUS berbentuk {/* teks */}. Penutup "*/}" wajib.
- Setelah membuat atau mengubah file .tsx, langsung jalankan: cd frontend && npx tsc -b 2>&1 | head -20
- Jika error yang sama muncul 2 kali, BERHENTI. Tampilkan baris penyebabnya dan tanya saya. Jangan mengulang perbaikan yang sama.

## 17. Aturan dari sesi sebelumnya (WAJIB)
- Satu tugas per sesi. Kerjakan HANYA yang diminta. Jangan menyentuh file di luar rencana.
- Tailwind: tulis class UTUH. Dilarang text-${x}, shadow-${x}, bg-${x} (tidak terdeteksi build).
- Komentar JSX hanya berbentuk {/* teks */}. Setelah mengubah .tsx langsung jalankan tsc -b.
- tailwind.config.js: hanya GABUNGKAN ke theme.extend. Tidak ada theme.dark (bukan kunci Tailwind).
- Pemetaan status UI terpusat di frontend/src/components/ui/badgeStatus.ts.
- JANGAN membuat Design.preview.tsx atau route /_design.
- JANGAN menimpa opencode.json.
- Verifikasi frontend: cd frontend && npx tsc -b 2>&1 | head -20 && npm run build 2>&1 | grep -v "^\s*at " | tail -15
- 7 warning lint lama (Campaigns.tsx dkk) bukan tugasmu kecuali diminta.
- Error yang sama muncul 2 kali: BERHENTI, tempel error apa adanya, tanya saya.
- Setelah selesai: git status --short dan laporkan semua file yang berubah.
