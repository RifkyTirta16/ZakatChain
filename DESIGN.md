# Panduan Sistem Desain ZakatChain

**Identitas:** Islamic Institutional Finance × Modern Ethereum Web3  
**Referensi Visual:** Ondo Finance (otoritas finansial bersih & kontras institusional), Safe{Wallet} (Bento grid modular & presisi keamanan), Aave Glass (*specular top-edge highlight* pada permukaan gelap), ENS & Linear (*hairline borders* & tipografi teknis monospaced).

## 1. Token Warna Resmi (`frontend/tailwind.config.js`)
- `primary` (Emerald): `#047857` · hover `forest`: `#064E3B` · gelap `forest-dark`: `#022C22`
- `gold` (Gold Accent): `#C9A45C` · `gold-light`: `#DFC184` · `gold-dark`: `#A6833E`
- `cream` (Soft Cream Canvas): `#F8F7F2` · kartu: `#FFFFFF` · `mint` Surface: `#ECFDF5`
- `slateText`: `#334155` · `sky`: `#0284C7` · `danger`: `#DC2626`

## 2. Tipografi (`frontend/index.html` & Tailwind)
- **Display / Headings:** `Plus Jakarta Sans` (`font-display`, tracking rapat `-0.02em`, weight `700`/`800`).
- **Interface & Body:** `Inter` (`font-sans`).
- **Data Kriptografi & Finansial:** `JetBrains Mono` (`font-mono`) untuk hash SHA-256, tx hash, nomor blok, dan `tabular-nums` untuk seluruh nominal IDR.
- **Konten Arab:** `Noto Naskh Arabic` (`font-arabic`).

## 3. Permukaan, Hairline Borders & Kedalaman (`frontend/src/index.css`)
- **`.hairline-elevated`:** border tipis `1px solid rgba(15, 23, 42, 0.085)` dan bayangan mikro bersih.
- **`.glass-dark-card`:** kaca gelap transparan di atas `#022C22` dengan *top-edge specular highlight* (`inset 0 1px 0 rgba(255,255,255,0.18)`).
- **`.bg-crypto-grid` / `.bg-dot-matrix`:** tekstur arsitektural halus tanpa animasi berlebihan atau estetika neon cyberpunk.

## 4. Arsitektur Workspace Per Role (Pemisahan Tugas / Segregation of Duties)
Setiap peran memakai satu sistem komponen UI (`frontend/src/components/ui/`) namun memiliki menu dan halaman beranda yang terpisah jelas:
- **Public (`PublicShell`):** Portal landing, Program, Kalkulator, Transparansi Publik, & Verifikasi Hash.
- **Muzakki (`USER` — `MuzakkiShell`):** Kalkulator, Tunaikan Zakat (QRIS + Sandbox), Riwayat & Bukti Setor Zakat (BSZ), Jejak Alokasi Multi-Wilayah, serta akses Portal Transparansi & Verifikasi.
- **Amil (`AMIL` — `AmilShell`):** Catat Distribusi (termasuk multi-wilayah), Master Data Mustahik, Kelola Program Zakat, Pemetaan & Impor Data Kemiskinan, Donasi Masuk, Analitik, dan Explorer (read-only).
- **Auditor (`AUDITOR` — `AuditorShell`):** Antrean Verifikasi Bukti (dengan pratinjau berkas `/uploads` terautentikasi JWT), Deteksi/Resolusi Anomali, Log Audit Aktivitas, Ekspor CSV, Rekonsiliasi (read-only), Audit Mustahik (read-only), dan Explorer.
- **Admin (`ADMIN` — `AdminShell`):** Manajemen Peran & Hak Akses, Monitor Jaringan & Smart Contract (`ZakatVerify`), Rekonsiliasi Dana (`run`), Catat & Cabut (*Revoke*) On-Chain, serta pengawasan penuh lintas modul operasional & audit.

## 5. Kejujuran Produk Web3
Seluruh pembayaran zakat diproses dalam **Rupiah (IDR)**, bukan kripto ETH. Pencatatan on-chain Ethereum hanya membuktikan keberadaan *audit hash* laporan di smart contract `ZakatVerify.sol`, bukan bukti penerimaan fisik di lapangan.
