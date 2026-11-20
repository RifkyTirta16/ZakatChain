import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Copy,
  Database,
  FileCheck2,
  HeartHandshake,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR, formatNumber, shortHash } from '../../utils/format';
import { Badge, Card, SectionHeader, Skeleton, StatCard, proofBadge } from '../../components/ui';
import {
  EthereumLogo,
  NetworkBadge,
  PoweredByEthereum,
  useNetworkInfo,
  usePublicTransparency,
} from '../../components/ethereum';

interface Campaign {
  id: number;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  status: string;
  deadline: string | null;
}

const FAQ_ITEMS = [
  {
    q: 'Apakah membayar zakat di ZakatChain harus menggunakan mata uang kripto (ETH)?',
    a: 'Tidak. Seluruh pembayaran zakat dilakukan menggunakan Rupiah (IDR) melalui kanal pembayaran yang tersedia. Teknologi Ethereum hanya digunakan di belakang layar untuk mencatat hash audit laporan penyaluran agar transparan dan tidak dapat diubah.',
  },
  {
    q: 'Apa yang sebenarnya dibuktikan oleh pencatatan on-chain di Ethereum?',
    a: 'Smart contract ZakatVerify mencatat hash kriptografi (sidik jari digital) dari setiap laporan penyaluran beserta stempel waktunya. Artinya, publik dapat memastikan data laporan tidak pernah dimanipulasi setelah tercatat — namun verifikasi fisik di lapangan tetap bergantung pada bukti unggahan amil dan pemeriksaan auditor.',
  },
  {
    q: 'Apakah identitas penerima zakat (mustahik) dibuka ke publik?',
    a: 'Tidak. ZakatChain melindungi privasi dan kehormatan mustahik sesuai adab syariah. Halaman transparansi publik dan verifikasi hanya menampilkan nominal, kategori program, wilayah umum, dan hash audit tanpa membuka nama penerima.',
  },
  {
    q: 'Bagaimana cara saya memverifikasi keabsahan sebuah laporan penyaluran?',
    a: 'Anda dapat menyalin ID laporan atau hash audit dari halaman Transparansi Publik, lalu memeriksanya secara mandiri melalui halaman Verifikasi Publik (/verify). Sistem akan mencocokkan hash di basis data dengan catatan di smart contract Ethereum.',
  },
];

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const transparencyQuery = usePublicTransparency();
  const network = useNetworkInfo();
  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: ['public-campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });

  const kpis = transparencyQuery.data?.kpis;
  const recentTxs = (transparencyQuery.data?.recentTransactions ?? []).slice(0, 5);
  const activeCampaigns = (campaignsQuery.data ?? [])
    .filter((c) => c.status === 'ACTIVE')
    .slice(0, 3);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  return (
    <div className="bg-cream">
      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-forest-dark text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, #047857 0%, transparent 45%), radial-gradient(circle at 85% 75%, #C9A45C 0%, transparent 40%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <PoweredByEthereum variant="dark" />
                <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light">
                  Islamic Fintech × Web3 Audit
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] text-white">
                Zakat Anda, Amanah Kami.{' '}
                <span className="text-gold-light">Transparansi untuk Semua.</span>
              </h1>

              <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
                Tunaikan zakat dengan mudah dalam Rupiah (IDR) dan pantau bagaimana setiap amanah
                dikelola, diaudit, serta dicatat hash-nya secara terbuka melalui teknologi Ethereum.
              </p>

              {/* 4. Main CTA */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center min-h-[48px] rounded-[10px] bg-gold px-6 py-3 text-sm sm:text-base font-bold text-forest-dark hover:bg-gold-light shadow-gold-glow transition-colors"
                >
                  Tunaikan Zakat
                  <ArrowRight size={17} className="ml-2" />
                </Link>
                <Link
                  to="/transparency"
                  className="inline-flex items-center justify-center min-h-[48px] rounded-[10px] border border-white/25 bg-white/10 px-6 py-3 text-sm sm:text-base font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  Lihat Transparansi
                </Link>
                <Link
                  to="/calculator"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-medium text-gold-light hover:text-white transition-colors"
                >
                  <Calculator size={16} /> Hitung Zakat Dahulu
                </Link>
              </div>
            </div>

            {/* Elegant Ethereum Visual Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-forest/80 backdrop-blur p-6 space-y-5 shadow-elevated">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <EthereumLogo size={18} monochrome />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                        Lapisan Integritas
                      </p>
                      <p className="text-sm font-bold text-white">Smart Contract ZakatVerify</p>
                    </div>
                  </div>
                  <NetworkBadge variant="dark" compact />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="text-[11px] text-white/60">Laporan Tercatat On-Chain</p>
                    <p className="mt-1 text-2xl font-bold text-white tabular-nums">
                      {transparencyQuery.isPending ? '…' : formatNumber(kpis?.verifiedReports ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
                    <p className="text-[11px] text-white/60">Kontrak Target</p>
                    <p className="mt-1 text-xs font-mono font-semibold text-gold-light truncate">
                      {shortHash(network.contractAddress, 8, 6)}
                    </p>
                    <p className="mt-1 text-[11px] text-white/60">
                      {network.blockNumber !== null ? `Blok #${formatNumber(network.blockNumber)}` : 'Mode Audit'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-emeraldBrand-dark/70 border border-white/10 p-3.5 text-xs text-white/80 leading-relaxed">
                  Pembayaran zakat tetap memakai <strong className="text-white">Rupiah (IDR)</strong>.
                  Ethereum menyimpan bukti hash laporan agar riwayat audit tidak dapat diubah sepihak.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Clear Product Value Proposition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <SectionHeader
          title="Mengapa ZakatChain?"
          subtitle="Menyatukan kepatuhan pengelolaan amanah syariah dengan pencatatan audit kriptografi modern."
          className="mb-8"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <Calculator size={20} />,
              title: 'Hitung & Bayar Praktis',
              desc: 'Kalkulator zakat penghasilan, maal, dan emas dengan pembayaran Rupiah (IDR) yang familier.',
            },
            {
              icon: <FileCheck2 size={20} />,
              title: 'Audit Berlapis Amil & Auditor',
              desc: 'Setiap laporan penyaluran dilengkapi bukti dokumen, pemindaian anomali, dan jejak log audit.',
            },
            {
              icon: <Database size={20} />,
              title: 'Hash Tercatat di Ethereum',
              desc: 'Sidik jari laporan (SHA-256) dicatat ke smart contract ZakatVerify sehingga tidak dapat dimanipulasi.',
            },
            {
              icon: <Lock size={20} />,
              title: 'Privasi Mustahik Terjaga',
              desc: 'Data pribadi penerima manfaat dijaga kerahasiaannya; publik memverifikasi nominal dan hash saja.',
            },
          ].map((item) => (
            <Card key={item.title} className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint text-primary flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-forest-dark">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. Live Transparency Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card space-y-6">
          <SectionHeader
            title="Statistik Transparansi Real-Time"
            subtitle="Ringkasan agregat langsung dari basis data ZakatChain dan pemeriksaan jaringan Ethereum."
            action={
              <Link
                to="/transparency"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest"
              >
                Buka Portal Transparansi <ArrowRight size={15} />
              </Link>
            }
          />
          {transparencyQuery.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton lines={3} />
              <Skeleton lines={3} />
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Donasi Terkonfirmasi"
                value={formatIDR(kpis?.totalDonations ?? 0)}
                sublabel="Total dana masuk terkonfirmasi"
                icon={<HeartHandshake size={20} />}
                tone="emerald"
              />
              <StatCard
                label="Tersalurkan & Disetujui"
                value={formatIDR(kpis?.totalDistributed ?? 0)}
                sublabel="Terverifikasi bukti & on-chain"
                icon={<CheckCircle2 size={20} />}
                tone="forest"
              />
              <StatCard
                label="Laporan Tercatat On-Chain"
                value={`${formatNumber(kpis?.verifiedReports ?? 0)} / ${formatNumber(kpis?.totalReports ?? 0)}`}
                sublabel="Hash tersimpan di smart contract"
                icon={<ShieldCheck size={20} />}
                tone="gold"
              />
              <StatCard
                label="Program Zakat Aktif"
                value={formatNumber(kpis?.activeCampaigns ?? activeCampaigns.length)}
                sublabel={`Jaringan: ${network.label}`}
                icon={<Sparkles size={20} />}
                tone="neutral"
              />
            </div>
          )}
        </div>
      </section>

      {/* 6. Zakat Programs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <SectionHeader
          title="Program Penyaluran Zakat"
          subtitle="Pilih program penyaluran aktif atau tunaikan zakat umum sesuai kebutuhan mustahik."
          action={
            <Link
              to="/campaigns"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest"
            >
              Semua Program <ArrowRight size={15} />
            </Link>
          }
          className="mb-6"
        />
        {campaignsQuery.isPending ? (
          <div className="grid gap-5 md:grid-cols-3">
            <Skeleton lines={6} />
            <Skeleton lines={6} />
            <Skeleton lines={6} />
          </div>
        ) : activeCampaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600 text-center py-6">
              Belum ada program aktif saat ini. Anda tetap dapat menunaikan zakat melalui halaman pembayaran umum.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {activeCampaigns.map((c) => {
              const target = Number(c.target_amount) || 0;
              const current = Number(c.current_amount) || 0;
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              return (
                <Card key={c.id} className="flex flex-col justify-between gap-4 hover:shadow-elevated transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="success">Aktif</Badge>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">{pct}% tercapai</span>
                    </div>
                    <h3 className="text-lg font-bold text-forest-dark line-clamp-2">{c.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {c.description || 'Penyaluran amanah zakat yang tercatat transparan.'}
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                        <span className="font-semibold text-forest-dark">{formatIDR(current)}</span>
                        <span>Target {formatIDR(target)}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] border border-primary/30 bg-mint text-sm font-semibold text-forest hover:bg-primary hover:text-white transition-colors"
                  >
                    Lihat & Salurkan
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. How ZakatChain Works */}
      <section className="bg-white border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Cara Kerja ZakatChain"
            subtitle="Alur sederhana bagi muzakki, pengawasan ketat di sisi amil dan auditor."
            className="mb-8"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Hitung Kewajiban',
                desc: 'Gunakan Kalkulator Zakat untuk memeriksa nisab penghasilan, tabungan, atau emas Anda.',
              },
              {
                step: '02',
                title: 'Tunaikan dalam IDR',
                desc: 'Pilih program dan selesaikan pembayaran Rupiah secara praktis tanpa perlu dompet kripto.',
              },
              {
                step: '03',
                title: 'Penyaluran & Bukti',
                desc: 'Amil menyalurkan dana sesuai pemetaan kemiskinan dan mengunggah dokumen bukti yang diperiksa auditor.',
              },
              {
                step: '04',
                title: 'Hash Tercatat di Ethereum',
                desc: 'Hash kriptografi laporan dicatat on-chain agar siapa pun dapat memverifikasi keutuhan datanya.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-slate-200/80 bg-cream p-5 space-y-2.5">
                <span className="inline-block font-display text-xs font-extrabold tracking-widest text-gold-dark bg-gold/15 px-2.5 py-1 rounded-md">
                  LANGKAH {s.step}
                </span>
                <h3 className="text-base font-bold text-forest-dark">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Ethereum Technology Introduction */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl bg-forest text-white p-6 sm:p-10 grid gap-8 lg:grid-cols-12 items-center shadow-elevated">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-gold-light">
              <EthereumLogo size={12} monochrome />
              <span>Arsitektur Teknologi Ethereum</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Integritas Data Berbasis Smart Contract Ethereum
            </h2>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed">
              ZakatChain memisahkan lapisan pembayaran Rupiah yang mudah digunakan dengan lapisan
              pembuktian hash di jaringan Ethereum. Smart contract <code className="font-mono text-gold-light">ZakatVerify.sol</code>{' '}
              memastikan setiap laporan penyaluran yang telah dicatat bersifat permanen (immutable)
              dan dapat diaudit secara independen.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2 text-sm">
              {[
                'Jaringan aktual terdeteksi otomatis (Hardhat / Sepolia / Mainnet)',
                'Smart contract hanya menyimpan bytes32 hash — bebas data pribadi',
                'Pencabutan laporan (revoke) tercatat permanen, tidak dapat dihapus diam-diam',
                'Verifikasi publik terbuka 24/7 tanpa memerlukan akun',
              ].map((point) => (
                <div key={point} className="flex items-start gap-2 text-white/85">
                  <CheckCircle2 size={16} className="text-gold-light shrink-0 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl bg-forest-dark/80 border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Status Jaringan Saat Ini
              </span>
              <NetworkBadge variant="dark" />
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between gap-2 py-2 border-b border-white/10">
                <span className="text-white/60">Chain ID</span>
                <span className="text-white">{network.chainId ?? '-'}</span>
              </div>
              <div className="flex justify-between gap-2 py-2 border-b border-white/10">
                <span className="text-white/60">Smart Contract</span>
                <span className="text-gold-light">{shortHash(network.contractAddress, 10, 8)}</span>
              </div>
              <div className="flex justify-between gap-2 py-2">
                <span className="text-white/60">Status Bytecode</span>
                <span className="text-white">{network.contract}</span>
              </div>
            </div>
            <Link
              to="/verify"
              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[10px] bg-white text-forest-dark text-sm font-bold hover:bg-mint transition-colors"
            >
              <Search size={15} /> Uji Verifikasi Hash Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Blockchain Transparency Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5">
        <SectionHeader
          title="Pratinjau Catatan Penyaluran Terbaru"
          subtitle="Data transaksi publik telah disamarkan dari identitas mustahik. Klik verifikasi untuk mengecek hash di Ethereum."
          action={
            <Link
              to="/transparency"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-forest"
            >
              Lihat Semua Catatan <ArrowRight size={15} />
            </Link>
          }
        />

        <Card className="overflow-hidden p-0 sm:p-0">
          {recentTxs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              Belum ada catatan penyaluran publik yang tersedia.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">ID & Waktu</th>
                    <th className="px-5 py-3.5 font-semibold">Kategori / Wilayah</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Nominal</th>
                    <th className="px-5 py-3.5 font-semibold">Hash Audit</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTxs.map((tx) => {
                    const badge = proofBadge(tx.blockchain_status || tx.proof_status || 'PENDING');
                    const hashValue = tx.audit_hash || tx.tx_hash || '';
                    return (
                      <tr key={tx.id} className="hover:bg-cream/60 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-forest-dark">#{tx.id}</span>
                          <p className="text-xs text-slate-500">{formatDateTime(tx.timestamp)}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-forest-dark">{tx.category || 'Umum'}</span>
                          <p className="text-xs text-slate-500">{tx.region || 'Nasional'}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-forest-dark tabular-nums whitespace-nowrap">
                          {formatIDR(tx.amount)}
                        </td>
                        <td className="px-5 py-3.5">
                          {hashValue ? (
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600">
                              <span>{shortHash(hashValue, 8, 6)}</span>
                              <button
                                type="button"
                                onClick={() => copyHash(hashValue)}
                                aria-label="Salin hash"
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-primary"
                              >
                                <Copy size={13} />
                              </button>
                              {copiedHash === hashValue && (
                                <span className="text-[11px] font-sans font-semibold text-primary">Tersalin</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <Link
                            to={`/verify?id=${tx.id}`}
                            className="text-xs font-semibold text-primary hover:text-forest underline underline-offset-4"
                          >
                            Verifikasi
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* 10. Security & Trust + 11. FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <Card variant="highlight" className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-dark">
                <ShieldCheck size={16} /> Komitmen Keamanan & Kejujuran
              </div>
              <h3 className="text-xl font-bold text-forest-dark">
                Transparansi Tanpa Mengorbankan Privasi
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>Otorisasi peran terpisah antara Muzakki, Amil, Auditor, dan Admin.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>Setiap persetujuan bukti, rekonsiliasi, dan tindakan penting dicatat di log audit.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Kejujuran teknologi: on-chain hanya membuktikan hash laporan tercatat, bukan jaminan
                    penerimaan fisik di lapangan.
                  </span>
                </li>
              </ul>
              <div className="pt-2">
                <Link
                  to="/calculator"
                  className="inline-flex items-center justify-center w-full min-h-[44px] rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-forest transition-colors"
                >
                  Mulai Hitung & Tunaikan Zakat
                </Link>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-forest-dark mb-4">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-forest-dark hover:bg-slate-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
