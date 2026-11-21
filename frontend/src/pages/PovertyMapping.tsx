import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleMarker, MapContainer, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import {
  AlertTriangle,
  Database,
  Globe,
  Map as MapIcon,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../utils/api';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, StatCard } from '../components/ui';
import { formatIDR, formatNumber, formatPercent } from '../utils/format';
import { getProvinceCoords } from '../utils/regions';
import {
  ProvinceDetailCard,
  type RegionStatDetail,
} from '../components/mapping/ProvinceDetailCard';
import 'leaflet/dist/leaflet.css';

type IndicatorMode = 'poverty' | 'priority' | 'depth';

const INDONESIA_BOUNDS: LatLngBoundsExpression = [
  [-11.0, 94.5],
  [6.2, 141.3],
];

const MapBoundsHandler = ({ resetSignal }: { resetSignal: number }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(INDONESIA_BOUNDS, { padding: [24, 24] });
  }, [map, resetSignal]);
  return null;
};

const povertyColor = (rate: number) =>
  rate > 20 ? '#DC2626' : rate > 15 ? '#D97706' : rate > 10 ? '#C9A45C' : rate > 5 ? '#047857' : '#059669';

const priorityColor = (score: number) =>
  score >= 55 ? '#DC2626' : score >= 40 ? '#D97706' : '#047857';

const depthColor = (p1: number) =>
  p1 >= 4.0 ? '#DC2626' : p1 >= 2.0 ? '#D97706' : p1 >= 1.2 ? '#C9A45C' : '#047857';

const markerRadius = (poorPopulation: number | null | undefined, selected: boolean): number => {
  const base = !poorPopulation || poorPopulation <= 0
    ? 7
    : Math.min(15, Math.max(7, Math.round(Math.sqrt(poorPopulation / 18000)) + 4));
  return selected ? base + 3 : base;
};

const PovertyMapping = () => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [indicatorMode, setIndicatorMode] = useState<IndicatorMode>('poverty');
  const [mapResetTick, setMapResetTick] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  const statsQuery = useQuery({
    queryKey: ['mapping-stats'],
    queryFn: async (): Promise<RegionStatDetail[]> => {
      const { data } = await apiClient.get('/mapping/stats');
      return data;
    },
  });

  const recoQuery = useQuery({
    queryKey: ['mapping-recommendations'],
    queryFn: async (): Promise<{ region_code: string }[]> => {
      const { data } = await apiClient.get('/mapping/recommendations');
      return data;
    },
  });

  const isDemoData = useMemo(() => {
    const stats = statsQuery.data || [];
    const reco = recoQuery.data || [];
    return stats.length > 0 && reco.length === 0;
  }, [statsQuery.data, recoQuery.data]);

  const allStats = useMemo(() => statsQuery.data || [], [statsQuery.data]);

  const summary = useMemo(() => {
    const totalPoor = allStats.reduce((sum, s) => sum + (Number(s.poor_population) || 0), 0);
    const criticalCount = allStats.filter((s) => s.status === 'CRITICAL').length;
    const totalDistributed = allStats.reduce((sum, s) => sum + (Number(s.total_distributed) || 0), 0);
    const highest = [...allStats].sort((a, b) => b.poverty_rate - a.poverty_rate)[0] ?? null;
    return { totalPoor, criticalCount, totalDistributed, highest };
  }, [allStats]);

  const filteredStats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allStats
      .filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (!term) return true;
        return (
          s.region.toLowerCase().includes(term) ||
          (s.province || '').toLowerCase().includes(term) ||
          s.region_code.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => parseFloat(b.priority_score) - parseFloat(a.priority_score));
  }, [allStats, searchTerm, statusFilter]);

  // Paint larger markers underneath smaller ones and keep selected marker on top so crowded provinces (DKI/Banten/DIY) stay clickable.
  const mapOrderedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      if (a.region_code === selectedCode) return 1;
      if (b.region_code === selectedCode) return -1;
      return (b.poor_population ?? 0) - (a.poor_population ?? 0);
    });
  }, [filteredStats, selectedCode]);

  const topThreeRegions = useMemo(
    () => [...allStats].sort((a, b) => parseFloat(b.priority_score) - parseFloat(a.priority_score)).slice(0, 3),
    [allStats]
  );

  const selectedRegion = useMemo(
    () => allStats.find((s) => s.region_code === selectedCode) || null,
    [allStats, selectedCode]
  );

  const isLoading = statsQuery.isLoading || recoQuery.isLoading;
  const error = statsQuery.error || recoQuery.error;

  const retry = () => {
    void statsQuery.refetch();
    void recoQuery.refetch();
  };

  const currentRole = (() => {
    try {
      const raw = localStorage.getItem('zakat_user');
      return raw ? (JSON.parse(raw) as { role?: string }).role : undefined;
    } catch {
      return undefined;
    }
  })();
  const canImport = currentRole === 'ADMIN' || currentRole === 'AMIL';

  const handleImport = async () => {
    setImportError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(importData);
    } catch {
      setImportError('Format JSON tidak valid. Tempelkan array JSON provinsi atau objek {"data": [...]}.');
      return;
    }
    const payload = Array.isArray(parsed) ? { data: parsed } : parsed;
    setImportBusy(true);
    try {
      await apiClient.post('/mapping/import', payload);
      setIsImportModalOpen(false);
      setImportData('');
      retry();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; details?: unknown } } };
      const detail = e.response?.data?.details;
      const detailText = Array.isArray(detail)
        ? detail.map((d: { message?: string }) => d.message).filter(Boolean).join('; ')
        : typeof detail === 'string'
          ? detail
          : '';
      setImportError(`${e.response?.data?.error || 'Impor gagal.'} ${detailText}`.trim());
    } finally {
      setImportBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton lines={2} className="w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card className="rounded-3xl p-6 h-[560px]">
              <Skeleton lines={12} className="w-full h-full rounded-2xl" />
            </Card>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Card className="rounded-3xl p-6">
              <Skeleton lines={8} className="w-full rounded-xl" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4">
        <ErrorState
          message={
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Gagal memuat data pemetaan kemiskinan.'
          }
          retry={retry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Judul & Aksi */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-mint border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-dark tracking-tight">
              Pemetaan Kemiskinan &amp; Wilayah
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Analisis spasial kebutuhan zakat berbasis tingkat kemiskinan, indeks kedalaman (P1), dan capaian distribusi multi-wilayah.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={retry}
            disabled={statsQuery.isFetching}
          >
            <RefreshCw size={14} className={statsQuery.isFetching ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </Button>
          {canImport && (
            <Button
              size="sm"
              onClick={() => {
                setImportError('');
                setIsImportModalOpen(true);
              }}
            >
              Impor Data Kemiskinan
            </Button>
          )}
        </div>
      </header>

      {isDemoData && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-gold/40 bg-gold/10 text-forest-dark text-xs leading-relaxed">
          <Database size={16} className="text-forest-dark shrink-0 mt-0.5" />
          <p>
            <span className="font-bold">Data Demonstrasi:</span> Tabel{' '}
            <span className="font-mono">poverty_stats</span> di basis data masih kosong sehingga angka tingkat kemiskinan dan populasi miskin berasal dari nilai bawaan server.
          </p>
        </div>
      )}

      {/* Ringkasan Nasional */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Cakupan Wilayah"
          value={`${allStats.length} provinsi`}
          sublabel="Seluruh provinsi terdaftar"
          icon={<Globe size={18} />}
          tone="emerald"
        />
        <StatCard
          label="Populasi Miskin"
          value={`${formatNumber(summary.totalPoor)} jiwa`}
          sublabel="Akumulasi penduduk miskin"
          icon={<Users size={18} />}
          tone="forest"
        />
        <StatCard
          label="Prioritas Kritis"
          value={`${summary.criticalCount} provinsi`}
          sublabel="Skor prioritas >= 55"
          icon={<AlertTriangle size={18} />}
          tone="danger"
        />
        <StatCard
          label="Kemiskinan Tertinggi"
          value={summary.highest ? formatPercent(summary.highest.poverty_rate, 2) : '-'}
          sublabel={summary.highest ? `${summary.highest.region} (${formatIDR(summary.totalDistributed)} salur)` : 'Belum ada data'}
          icon={<TrendingUp size={18} />}
          tone="gold"
        />
      </section>

      {/* Toolbar Filter & Mode Warna */}
      <Card className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Cari provinsi atau kode BPS…"
              className="w-full bg-cream/60 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter Status Prioritas"
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status ({allStats.length})</option>
            <option value="CRITICAL">Kritis (Skor &ge; 55)</option>
            <option value="WARNING">Perhatian (Skor 40–54)</option>
            <option value="STABLE">Tercukupi (Skor &lt; 40)</option>
          </select>

          <select
            aria-label="Mode Pewarnaan Peta"
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs sm:text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
            value={indicatorMode}
            onChange={(e) => setIndicatorMode(e.target.value as IndicatorMode)}
          >
            <option value="poverty">Warna: Tingkat Kemiskinan (%)</option>
            <option value="priority">Warna: Skor Prioritas Zakat</option>
            <option value="depth">Warna: Indeks Kedalaman (P1)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setMapResetTick((v) => v + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-forest-dark hover:bg-mint/50 transition-colors self-start md:self-auto"
        >
          <RotateCcw size={13} /> Reset Peta Indonesia
        </button>
      </Card>

      {/* Layout Peta & Panel Statistik */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Peta Penuh (lg:col-span-8) */}
        <div className="lg:col-span-8">
          <Card className="rounded-3xl p-0 overflow-hidden relative h-[560px] bg-white border border-slate-200/80 shadow-card z-0">
            <MapContainer
              center={[-2.5, 118]}
              zoom={5}
              style={{ height: '100%', width: '100%', background: '#E8EFF5' }}
              zoomControl={false}
            >
              <ZoomControl position="topright" />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              {mapOrderedStats.map((reg) => {
                const coords = getProvinceCoords(reg.region_code, reg.region);
                if (!coords) return null;
                const isSelected = selectedCode === reg.region_code;
                const p1 = Number(reg.indicators?.poverty_depth_index_p1 ?? 0);
                const fillColor =
                  indicatorMode === 'poverty'
                    ? povertyColor(reg.poverty_rate)
                    : indicatorMode === 'priority'
                      ? priorityColor(parseFloat(reg.priority_score))
                      : depthColor(p1);
                return (
                  <CircleMarker
                    key={reg.region_code}
                    center={coords}
                    radius={markerRadius(reg.poor_population, isSelected)}
                    pathOptions={{
                      color: isSelected ? '#C9A45C' : '#FFFFFF',
                      weight: isSelected ? 3.5 : 1.75,
                      fillColor,
                      fillOpacity: isSelected ? 0.96 : 0.84,
                    }}
                    eventHandlers={{
                      click: () => setSelectedCode(reg.region_code),
                    }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs font-sans space-y-0.5">
                        <p className="font-bold text-forest-dark">
                          {reg.region} ({reg.region_code})
                        </p>
                        <p>
                          Kemiskinan: <strong>{reg.poverty_rate}%</strong> · Skor {reg.priority_score} ({reg.status})
                        </p>
                        {reg.indicators?.poverty_depth_index_p1 != null && (
                          <p className="text-slate-600">
                            Kedalaman P1: <strong>{reg.indicators.poverty_depth_index_p1}</strong>
                          </p>
                        )}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
              <MapBoundsHandler resetSignal={mapResetTick} />
            </MapContainer>

            {/* Legenda Peta Tersinkronisasi */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 p-3.5 rounded-2xl shadow-card text-xs">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                {indicatorMode === 'poverty'
                  ? 'Tingkat Kemiskinan'
                  : indicatorMode === 'priority'
                    ? 'Skor Prioritas Zakat'
                    : 'Kedalaman Kemiskinan (P1)'}
              </p>
              <div className="space-y-1.5 font-medium text-[11px] text-forest-dark">
                {indicatorMode === 'poverty' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                      <span>Kritis (&gt; 20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D97706' }} />
                      <span>Tinggi (15–20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C9A45C' }} />
                      <span>Menengah (10–15%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#047857' }} />
                      <span>Rendah (&lt; 10%)</span>
                    </div>
                  </>
                ) : indicatorMode === 'priority' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                      <span>Kritis (Skor &ge; 55)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D97706' }} />
                      <span>Perhatian (Skor 40–54)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#047857' }} />
                      <span>Tercukupi (Skor &lt; 40)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                      <span>Ekstrem (P1 &ge; 4.0)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D97706' }} />
                      <span>Tinggi (2.0–3.9)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C9A45C' }} />
                      <span>Sedang (1.2–1.9)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#047857' }} />
                      <span>Rendah (&lt; 1.2)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Panel Statistik Wilayah di Samping (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          {selectedRegion ? (
            <ProvinceDetailCard
              region={selectedRegion}
              canDistribute={canImport}
              onClose={() => setSelectedCode(null)}
            />
          ) : (
            <Card className="rounded-3xl p-6 bg-white border border-slate-200/80 shadow-card text-center space-y-3">
              <div className="w-11 h-11 bg-mint rounded-2xl flex items-center justify-center text-primary mx-auto">
                <MapIcon size={22} />
              </div>
              <h3 className="text-sm font-extrabold text-forest-dark">Pilih Wilayah pada Peta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Klik titik provinsi di peta atau pilih dari daftar prioritas untuk memeriksa garis kemiskinan, kedalaman (P1/P2), pendidikan, dan ketenagakerjaan.
              </p>
              {topThreeRegions.length > 0 && (
                <div className="pt-2 flex flex-wrap justify-center gap-1.5">
                  {topThreeRegions.map((top) => (
                    <button
                      key={top.region_code}
                      type="button"
                      onClick={() => setSelectedCode(top.region_code)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-mint text-forest-dark border border-primary/20 hover:bg-primary hover:text-white transition-colors"
                    >
                      {top.region} ({top.poverty_rate}%)
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Panel Daftar Prioritas */}
          <Card className="rounded-3xl p-5 bg-white border border-slate-200/80 shadow-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs uppercase tracking-wider text-forest-dark font-extrabold flex items-center gap-1.5">
                <TrendingUp size={15} className="text-primary" /> Daftar Prioritas Distribusi
              </h3>
              <span className="text-[11px] font-mono font-semibold text-slate-500">
                {filteredStats.length} wilayah
              </span>
            </div>

            {filteredStats.length === 0 ? (
              <EmptyState title="Tidak ada wilayah yang cocok" description="Coba sesuaikan kata kunci pencarian atau filter status Anda." />
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredStats.map((reg) => (
                  <button
                    key={reg.region_code}
                    type="button"
                    onClick={() => setSelectedCode(reg.region_code)}
                    className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-left transition-colors text-xs ${
                      selectedCode === reg.region_code
                        ? 'bg-mint border-primary'
                        : 'bg-slate-50/70 border-slate-200/70 hover:bg-mint/50'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-forest-dark truncate">{reg.region}</span>
                      <span className="text-[10px] text-slate-500">
                        {reg.poverty_rate}% miskin · {reg.total_reports} laporan ({formatIDR(reg.total_distributed)})
                      </span>
                    </div>
                    <Badge
                      tone={reg.status === 'CRITICAL' ? 'coral' : reg.status === 'WARNING' ? 'gold' : 'success'}
                    >
                      Skor {reg.priority_score}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Impor Data (ADMIN / AMIL) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-forest-dark">Impor Data Kemiskinan</h2>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-forest-dark hover:bg-mint"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tempelkan array JSON data resmi (mendukung format datar maupun struktur bersarang BPS). Setiap objek memuat{' '}
              <span className="font-mono font-bold">region_code, region_name, poverty_rate</span>.
            </p>

            <textarea
              className="w-full h-44 bg-cream border border-slate-200 rounded-2xl p-3 text-xs font-mono text-forest-dark outline-none focus:ring-2 focus:ring-primary/20"
              placeholder='[{"region_code":"32","region_name":"Jawa Barat","province_name":"Jawa Barat","poverty_rate":7.02,"poverty":{"poor_population_thousand":3654.74,"poverty_line_rp_per_capita_month":547752}}]'
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
            />

            {importError && (
              <p className="text-xs text-danger font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
                {importError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                Batal
              </Button>
              <Button
                loading={importBusy}
                disabled={importBusy || !importData.trim()}
                onClick={() => void handleImport()}
              >
                Impor Data
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PovertyMapping;
