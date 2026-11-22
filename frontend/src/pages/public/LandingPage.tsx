import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  HeartHandshake,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { formatIDR, formatNumber } from '../../utils/format';
import { Badge, Card, ON_CHAIN_NOTE, SectionHeader, Skeleton } from '../../components/ui';
import { usePublicTransparency } from '../../components/ethereum';

interface Campaign {
  id: number;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  status: string;
  deadline: string | null;
}

const VALUE_PROPS = [
  {
    icon: <HeartHandshake size={19} />,
    title: 'Bayar Praktis dalam Rupiah',
    desc: 'Tunaikan zakat penghasilan, maal, maupun infaq melalui QRIS Rupiah (IDR) tanpa dompet atau aset kripto.',
  },
  {
    icon: <Lock size={19} />,
    title: 'Privasi Mustahik Terjaga',
    desc: 'Identitas penerima bantuan dilindungi dan tidak dibuka ke publik; transparansi disajikan secara agregat per wilayah.',
  },
  {
    icon: <FileCheck2 size={19} />,
    title: 'Audit Terbuka & Terpisah',
    desc: 'Amil menyalurkan, Auditor memeriksa berkas bukti, dan sistem mencatat sidik jari digital agar riwayat tidak diubah sepihak.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Hitung atau Pilih Program',
    desc: 'Gunakan kalkulator nisab otomatis atau pilih program penyaluran aktif.',
  },
  {
    step: '02',
    title: 'Bayar QRIS & Simpan BSZ',
    desc: 'Selesaikan pembayaran dalam Rupiah dan unduh Bukti Setor Zakat resmi.',
  },
  {
    step: '03',
    title: 'Pantau Penyaluran Terbuka',
    desc: 'Lihat sebaran wilayah serta status pemeriksaan laporan di Portal Transparansi.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Apakah membayar zakat di ZakatChain harus memakai mata uang kripto?',
    a: 'Tidak. Seluruh pembayaran zakat dilakukan dalam Rupiah (IDR) melalui QRIS. Pencatatan kriptografi bekerja otomatis di latar belakang tanpa memerlukan dompet kripto dari muzakki.',
  },
  {
    q: 'Apa yang sebenarnya dibuktikan oleh pencatatan di blockchain?',
    a: 'Pencatatan publik hanya membuktikan sidik jari digital laporan tercatat dengan stempel waktu dan tidak diubah setelah terbit. Kebenaran penyaluran fisik di lapangan tetap bergantung pada bukti berkas dan pemeriksaan auditor.',
  },
  {
    q: 'Apakah nama dan data penerima zakat (mustahik) dibuka ke publik?',
    a: 'Tidak. Hanya nominal, kategori bantuan, wilayah umum, dan status pemeriksaan laporan yang ditampilkan secara terbuka.',
  },
];

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const transparencyQuery = usePublicTransparency();
  const campaignsQuery = useQuery<Campaign[]>({
    queryKey: ['public-campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return Array.isArray(data) ? data : [];
    },
  });

  const kpis = transparencyQuery.data?.kpis;
  const activeCampaigns = (campaignsQuery.data ?? []).filter((c) => c.status === 'ACTIVE').slice(0, 3);
  const collected = kpis?.totalDonations ?? 0;
  const distributed = kpis?.totalDistributed ?? 0;
  const distributionPct = collected > 0 ? Math.min(100, Math.round((distributed / collected) * 100)) : 0;

  return (
    <div className="bg-cream">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-forest-dark bg-crypto-grid text-white border-b border-white/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 18%, #047857 0%, transparent 45%), radial-gradient(circle at 86% 78%, #C9A45C 0%, transparent 38%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light">
                <ShieldCheck size={13} /> Platform Zakat Transparan Berbasis Rupiah (IDR)
              </span>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.08] text-white">
                Zakat Anda, Amanah Kami.{' '}
                <span className="text-gold-light block sm:inline">Transparansi untuk Semua.</span>
              </h1>

              <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
                Tunaikan zakat secara praktis dalam Rupiah melalui QRIS, dapatkan Bukti Setor Zakat resmi, dan pantau penyaluran dana secara terbuka tanpa membuka data pribadi mustahik.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center min-h-[46px] rounded-[10px] bg-gradient-to-b from-gold-light to-gold px-6 py-2.5 text-sm sm:text-base font-bold text-forest-dark hover:brightness-105 shadow-gold-glow border border-gold/40 transition-all"
                >
                  Tunaikan Zakat <ArrowRight size={17} className="ml-2" />
                </Link>
                <Link
                  to="/calculator"
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-[10px] border border-white/20 bg-white/10 backdrop-blur px-5 py-2.5 text-sm sm:text-base font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  <Calculator size={16} /> Hitung Zakat
                </Link>
                <Link
                  to="/transparency"
                  className="inline-flex items-center gap-1 min-h-[44px] px-2 text-sm font-medium text-gold-light hover:text-white transition-colors"
                >
                  Portal Transparansi →
                </Link>
              </div>
            </div>

            {/* Ringkasan Amanah Card */}
            <div className="lg:col-span-5">
              <div className="glass-dark-card rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gold-light font-bold">
                      Ringkasan Amanah Terkini
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">Arus Dana Zakat Platform</p>
                  </div>
                  <Badge tone="gold" className="bg-gold/20 text-gold-light border-gold/40">
                    Real-Time
                  </Badge>
                </div>

                {transparencyQuery.isPending ? (
                  <Skeleton lines={4} />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3.5">
                        <p className="text-[11px] text-white/60">Donasi Terkonfirmasi</p>
                        <p className="mt-1 font-display text-lg sm:text-xl font-extrabold text-white tabular-nums">
                          {formatIDR(collected)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-white/10 p-3.5">
                        <p className="text-[11px] text-white/60">Sudah Disalurkan</p>
                        <p className="mt-1 font-display text-lg sm:text-xl font-extrabold text-gold-light tabular-nums">
                          {formatIDR(distributed)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-white/75 tabular-nums">
                        <span>Rasio Penyaluran Terverifikasi</span>
                        <span className="font-semibold text-white">{distributionPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${distributionPct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs text-white/75">
                      <span>
                        <strong className="text-white">{formatNumber(kpis?.verifiedReports ?? 0)}</strong> laporan terverifikasi ·{' '}
                        <strong className="text-white">{formatNumber(kpis?.activeCampaigns ?? activeCampaigns.length)}</strong> program aktif
                      </span>
                      <Link to="/verify" className="font-semibold text-gold-light hover:underline inline-flex items-center gap-1">
                        <Search size={12} /> Cek Laporan
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Value Propositions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {VALUE_PROPS.map((item) => (
            <Card key={item.title} className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint border border-primary/15 text-primary flex items-center justify-center">
                {item.icon}
              </div>
              <h2 className="font-display text-base font-bold text-forest-dark">{item.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Active Campaigns */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <SectionHeader
          title="Program Penyaluran Zakat"
          subtitle="Pilih program aktif atau tunaikan zakat umum sesuai kebutuhan mustahik."
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
            <Skeleton lines={5} />
            <Skeleton lines={5} />
            <Skeleton lines={5} />
          </div>
        ) : activeCampaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600 text-center py-6">
              Belum ada program aktif saat ini. Anda tetap dapat menunaikan zakat umum melalui halaman pembayaran.
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
                    Lihat &amp; Salurkan
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Simple 3-step guide + FAQ & Optional Tech Details */}
      <section className="bg-white border-y border-slate-200/80 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl border border-slate-200/80 bg-cream/70 p-5 space-y-2.5">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-forest-dark font-mono text-xs font-bold text-gold-light">
                  {s.step}
                </span>
                <h3 className="font-display text-base font-bold text-forest-dark">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-3">
              <h2 className="text-xl font-bold text-forest-dark">Pertanyaan yang Sering Diajukan</h2>
              <div className="space-y-2.5">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <Card key={item.q} className="p-0 sm:p-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-cream/60 transition-colors"
                      >
                        <span className="text-sm font-bold text-forest-dark">{item.q}</span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {item.a}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            <Card variant="highlight" className="lg:col-span-5 space-y-4">
              <h2 className="text-lg font-bold text-forest-dark">Kejujuran &amp; Audit Publik</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{ON_CHAIN_NOTE}</p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/transparency"
                  className="inline-flex items-center justify-center min-h-[42px] rounded-[10px] bg-primary px-4 text-xs sm:text-sm font-semibold text-white hover:bg-forest transition-colors"
                >
                  Buka Portal Transparansi
                </Link>
                <Link
                  to="/verify"
                  className="inline-flex items-center justify-center min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-4 text-xs sm:text-sm font-semibold text-forest-dark hover:bg-mint transition-colors"
                >
                  Verifikasi Laporan
                </Link>
              </div>
              <details className="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-forest-dark flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-primary" /> Lihat detail teknis kriptografi (untuk auditor/developer)
                </summary>
                <p className="mt-2 leading-relaxed border-t border-slate-100 pt-2">
                  Setiap laporan yang diverifikasi menghasilkan ringkasan kriptografi SHA-256 yang dicatat pada smart contract Ethereum (<code className="font-mono">ZakatVerify</code>) tanpa memuat data pribadi penerima manfaat.
                </p>
              </details>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
