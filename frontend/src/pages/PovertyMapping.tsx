import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { Layer, LeafletEvent, PathOptions, StyleFunction } from 'leaflet';
import L from 'leaflet';
import { Globe, Search, Map as MapIcon, RefreshCw, Database, X, TrendingUp } from 'lucide-react';
import apiClient from '../utils/api';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { formatIDR, formatNumber, formatPercent, provinceMatches, matchesProvinceField } from '../utils/format';
import 'leaflet/dist/leaflet.css';
import indonesiaGeoJsonRaw from '../assets/geo/indonesia_provinces.json';

const indonesiaGeoJson = indonesiaGeoJsonRaw as unknown as GeoJsonObject;

interface RegionStat {
  region: string;
  province: string;
  region_code: string;
  poverty_rate: number;
  poor_population: number;
  total_distributed: number;
  total_reports: number;
  target_amount: number;
  gap: number;
  reach_percentage: number;
  priority_score: string;
  status: 'CRITICAL' | 'WARNING' | 'STABLE';
}

interface TxLite {
  region: string | null;
  amount: number;
}

const MapBoundsHandler = ({ data }: { data: GeoJsonObject }) => {
  const map = useMap();
  useEffect(() => {
    const geojsonLayer = L.geoJSON(data);
    const bounds = geojsonLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [data, map]);
  return null;
};

// Token Warna Desain ZakatChain untuk Peta
const povertyColor = (rate: number) =>
  rate > 20 ? '#EF6C4A' : rate > 15 ? '#FF8A6A' : rate > 10 ? '#FFD23F' : rate > 5 ? '#2BA8A2' : '#3CC4BD';

const priorityColor = (score: number) =>
  score > 30 ? '#EF6C4A' : score > 15 ? '#FF8A6A' : score > 8 ? '#FFD23F' : '#2BA8A2';

const PovertyMapping = () => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [indicatorMode, setIndicatorMode] = useState<'poverty' | 'priority'>('poverty');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  const statsQuery = useQuery({
    queryKey: ['mapping-stats'],
    queryFn: async (): Promise<RegionStat[]> => {
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

  const txQuery = useQuery({
    queryKey: ['mapping-transactions'],
    queryFn: async (): Promise<TxLite[]> => {
      const { data } = await apiClient.get('/transactions');
      return (data as { region: string | null; amount: number }[]).map((t) => ({
        region: t.region,
        amount: Number(t.amount) || 0,
      }));
    },
  });

  const isDemoData = useMemo(() => {
    const stats = statsQuery.data || [];
    const reco = recoQuery.data || [];
    return stats.length > 0 && reco.length === 0;
  }, [statsQuery.data, recoQuery.data]);

  const enrichedStats = useMemo(() => {
    const stats = statsQuery.data || [];
    const txs = txQuery.data || [];
    return stats.map((s) => {
      const matched = txs.filter(
        (t) =>
          matchesProvinceField(t.region, s.region) ||
          matchesProvinceField(t.region, s.province) ||
          provinceMatches(t.region, s.region)
      );
      const actualDistributed = matched.reduce((sum, t) => sum + t.amount, 0);
      const actualReports = matched.length;
      const targetAmount = (s.poor_population || 100000) * 50000;
      const reach = targetAmount > 0 ? actualDistributed / targetAmount : 0;
      const priority = s.poverty_rate * 0.6 + (1 - Math.min(reach, 1)) * 100 * 0.4;
      const status: RegionStat['status'] = priority > 12 ? 'CRITICAL' : priority > 6 ? 'WARNING' : 'STABLE';
      return {
        ...s,
        total_distributed: actualDistributed,
        total_reports: actualReports,
        target_amount: targetAmount,
        gap: Math.max(targetAmount - actualDistributed, 0),
        reach_percentage: reach * 100,
        priority_score: priority.toFixed(2),
        status,
      };
    });
  }, [statsQuery.data, txQuery.data]);

  const filteredStats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return enrichedStats
      .filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (!term) return true;
        return s.region.toLowerCase().includes(term) || (s.province || '').toLowerCase().includes(term);
      })
      .sort((a, b) => parseFloat(b.priority_score) - parseFloat(a.priority_score));
  }, [enrichedStats, searchTerm, statusFilter]);

  const selectedRegion = useMemo(
    () => enrichedStats.find((s) => s.region_code === selectedCode) || null,
    [enrichedStats, selectedCode]
  );

  const geoStyle = useMemo<StyleFunction>(() => {
    return (feature?: Feature | null) => {
      const code = feature?.properties?.code as string | undefined;
      const data = enrichedStats.find((s) => s.region_code === code);
      const fillColor = !data
        ? '#CBD5E1'
        : indicatorMode === 'poverty'
          ? povertyColor(data.poverty_rate)
          : priorityColor(parseFloat(data.priority_score));
      return {
        fillColor,
        weight: 2,
        opacity: 0.9,
        color: '#1E8C86',
        fillOpacity: 0.65,
      } as PathOptions;
    };
  }, [enrichedStats, indicatorMode]);

  const onEachFeature = useMemo(() => {
    return (feature: unknown, layer: Layer) => {
      const geoFeature = feature as { properties?: { code?: string; name?: string } } | null;
      const code = geoFeature?.properties?.code;
      const name = geoFeature?.properties?.name || code || 'Wilayah';
      const data = enrichedStats.find((s) => s.region_code === code);

      layer.on({
        mouseover: (e: LeafletEvent) => {
          const l = e.target as L.Path;
          l.setStyle({ fillOpacity: 0.85, weight: 3, color: '#FFD23F' });
        },
        mouseout: (e: LeafletEvent) => {
          const l = e.target as L.Path;
          const fillColor = !data
            ? '#CBD5E1'
            : indicatorMode === 'poverty'
              ? povertyColor(data.poverty_rate)
              : priorityColor(parseFloat(data.priority_score));
          l.setStyle({ fillColor, fillOpacity: 0.65, weight: 2, color: '#1E8C86', opacity: 0.9 });
        },
        click: () => {
          if (data) setSelectedCode(data.region_code);
        },
      });
      if (!data) {
        layer.bindTooltip(`${name} — tanpa data kemiskinan`, { sticky: true });
      } else {
        layer.bindTooltip(
          `${name}: ${indicatorMode === 'poverty' ? `${data.poverty_rate}% kemiskinan` : `skor ${data.priority_score}`}`,
          { sticky: true }
        );
      }
    };
  }, [enrichedStats, indicatorMode]);

  const isLoading = statsQuery.isLoading || recoQuery.isLoading || txQuery.isLoading;
  const error = statsQuery.error || recoQuery.error || txQuery.error;

  const retry = () => {
    void statsQuery.refetch();
    void recoQuery.refetch();
    void txQuery.refetch();
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
      setImportError('Format JSON tidak valid. Tempelkan array JSON, mis. [{"region_code":"32",...}].');
      return;
    }
    setImportBusy(true);
    try {
      await apiClient.post('/mapping/import', { data: parsed });
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
      <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            message={
              (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              'Gagal memuat data pemetaan kemiskinan.'
            }
            retry={retry}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Pemetaan */}
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary">
                <Globe size={22} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary-dark">
                Pemetaan Kemiskinan
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-primary-dark/70">
              Analisis spasial kebutuhan zakat berbasis tingkat kemiskinan dan capaian distribusi regional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pencarian Wilayah */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-dark/40" size={14} />
              <input
                type="text"
                placeholder="Cari wilayah…"
                className="bg-white border border-slate-200/80 pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 w-48 sm:w-56"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Status */}
            <select
              className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl text-xs sm:text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="CRITICAL">Kritis (Critical)</option>
              <option value="WARNING">Perhatian (Warning)</option>
              <option value="STABLE">Tercukupi (Stable)</option>
            </select>

            {/* Mode Indikator */}
            <select
              className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl text-xs sm:text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
              value={indicatorMode}
              onChange={(e) => setIndicatorMode(e.target.value as 'poverty' | 'priority')}
            >
              <option value="poverty">Warna: Tingkat Kemiskinan</option>
              <option value="priority">Warna: Skor Prioritas</option>
            </select>

            <button
              type="button"
              onClick={retry}
              disabled={statsQuery.isFetching}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white text-primary-dark hover:bg-primary-bg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={statsQuery.isFetching ? 'animate-spin' : ''} /> Segarkan
            </button>

            {canImport && (
              <Button
                variant="secondary"
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
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-gold/40 bg-gold/10 text-primary-dark text-xs leading-relaxed">
            <Database size={16} className="text-primary-dark shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">Data Demonstrasi:</span> Tabel{' '}
              <span className="font-mono">poverty_stats</span> di basis data masih kosong sehingga angka tingkat kemiskinan dan populasi miskin berasal dari nilai bawaan server. Admin atau Amil dapat mengimpor data resmi melalui tombol impor.
            </p>
          </div>
        )}

        {/* Layout Peta & Panel Statistik */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Peta Penuh (lg:col-span-8) */}
          <div className="lg:col-span-8">
            <Card className="rounded-3xl p-0 overflow-hidden relative h-[560px] bg-white border border-slate-200/70 shadow-card z-0">
              <MapContainer
                center={[-2.5, 118]}
                zoom={5}
                style={{ height: '100%', width: '100%', background: '#E2E8F0' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />
                <GeoJSON
                  data={indonesiaGeoJson}
                  style={geoStyle}
                  onEachFeature={onEachFeature}
                  key={indicatorMode}
                />
                <MapBoundsHandler data={indonesiaGeoJson} />
              </MapContainer>

              {/* Legenda Token di Kiri Bawah Peta */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 p-3.5 rounded-2xl shadow-card text-xs">
                <p className="text-[10px] uppercase tracking-wider text-primary-dark/70 font-bold mb-2">
                  {indicatorMode === 'poverty' ? 'Tingkat Kemiskinan' : 'Skor Prioritas'}
                </p>
                <div className="space-y-1.5 font-medium text-[11px] text-primary-dark">
                  {indicatorMode === 'poverty' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF6C4A' }} />
                        <span>Kritis (&gt; 20%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFD23F' }} />
                        <span>Sedang (10–20%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2BA8A2' }} />
                        <span>Rendah (&lt; 10%)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF6C4A' }} />
                        <span>Prioritas Tinggi (&gt; 30)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF8A6A' }} />
                        <span>Prioritas Sedang (15–30)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#2BA8A2' }} />
                        <span>Prioritas Terpenuhi (&lt; 15)</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 pt-0.5 border-t border-slate-100">
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <span>Tanpa data</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Panel Statistik Wilayah di Samping (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            {selectedRegion ? (
              <Card className="rounded-3xl p-6 bg-white border border-primary/30 shadow-card space-y-4">
                <div className="flex justify-between items-start gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center text-primary shrink-0">
                      <MapIcon size={16} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-primary-dark leading-tight">
                        {selectedRegion.region}
                      </h2>
                      <p className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold mt-0.5">
                        {selectedRegion.province || 'Wilayah'} · Kode {selectedRegion.region_code}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(null)}
                    aria-label="Tutup detail"
                    className="p-1 rounded-lg text-primary-dark/60 hover:text-primary-dark hover:bg-primary-bg"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Angka Kunci */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-primary-bg/30 rounded-xl border border-primary-bg">
                    <span className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold block mb-0.5">
                      Tingkat Kemiskinan
                    </span>
                    <span className="text-base font-extrabold text-primary-dark tabular-nums">
                      {formatPercent(selectedRegion.poverty_rate)}
                    </span>
                  </div>

                  <div className="p-3 bg-cream/70 rounded-xl border border-cream">
                    <span className="text-[10px] uppercase tracking-wider text-primary-dark/60 font-semibold block mb-0.5">
                      Jangkauan Zakat
                    </span>
                    <span className="text-base font-extrabold text-primary-dark tabular-nums">
                      {formatPercent(selectedRegion.reach_percentage, 1)}
                    </span>
                  </div>
                </div>

                {/* Progress Celah Pendanaan */}
                <div className="p-3.5 bg-primary-bg/20 rounded-xl border border-primary-bg space-y-1.5 text-xs">
                  <div className="flex justify-between text-[11px] font-semibold text-primary-dark">
                    <span>Celah Pendanaan:</span>
                    <span className="font-extrabold">{formatIDR(selectedRegion.gap)}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        selectedRegion.reach_percentage < 30 ? 'bg-coral' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(selectedRegion.reach_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Detail Angka */}
                <div className="space-y-2 text-xs divide-y divide-slate-100 pt-1">
                  <div className="flex justify-between py-1.5">
                    <span className="text-primary-dark/60">Populasi Miskin</span>
                    <span className="font-extrabold text-primary-dark">
                      {formatNumber(selectedRegion.poor_population)} jiwa
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-primary-dark/60">Tersalurkan Tercatat</span>
                    <span className="font-extrabold text-primary-dark">
                      {formatIDR(selectedRegion.total_distributed)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 items-center">
                    <span className="text-primary-dark/60">Status Kebutuhan</span>
                    <Badge
                      tone={
                        selectedRegion.status === 'CRITICAL'
                          ? 'coral'
                          : selectedRegion.status === 'WARNING'
                            ? 'gold'
                            : 'success'
                      }
                    >
                      {selectedRegion.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="rounded-3xl p-8 bg-white border border-slate-200/70 shadow-card text-center space-y-3">
                <div className="w-12 h-12 bg-primary-bg/50 rounded-2xl flex items-center justify-center text-primary-dark/50 mx-auto">
                  <MapIcon size={24} />
                </div>
                <h3 className="text-sm font-extrabold text-primary-dark">Pilih Wilayah pada Peta</h3>
                <p className="text-xs text-primary-dark/60 leading-relaxed">
                  Arahkan kursor atau klik poligon provinsi di peta untuk menampilkan rincian kemiskinan dan kebutuhan zakat regional.
                </p>
              </Card>
            )}

            {/* Panel Daftar Prioritas */}
            <Card className="rounded-3xl p-5 bg-white border border-slate-200/70 shadow-card space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-primary-dark font-extrabold flex items-center gap-1.5">
                <TrendingUp size={15} className="text-primary" /> Daftar Prioritas Distribusi
              </h3>

              {filteredStats.length === 0 ? (
                <EmptyState title="Tidak ada wilayah yang cocok" description="Coba sesuaikan kata kunci pencarian Anda." />
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {filteredStats.map((reg) => (
                    <button
                      key={reg.region_code}
                      type="button"
                      onClick={() => setSelectedCode(reg.region_code)}
                      className={`w-full flex justify-between items-center p-2.5 rounded-xl border text-left transition-colors text-xs ${
                        selectedCode === reg.region_code
                          ? 'bg-primary-bg border-primary'
                          : 'bg-primary-bg/20 border-primary-bg hover:bg-primary-bg/40'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-primary-dark">{reg.region}</span>
                        <span className="text-[10px] text-primary-dark/60">
                          {formatIDR(reg.total_distributed)} tercatat
                        </span>
                      </div>
                      <Badge
                        tone={
                          reg.status === 'CRITICAL' ? 'coral' : reg.status === 'WARNING' ? 'gold' : 'success'
                        }
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
                <h2 className="text-xl font-extrabold text-primary-dark">
                  Impor Data Kemiskinan
                </h2>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1 rounded-lg text-primary-dark/60 hover:text-primary-dark hover:bg-primary-bg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-primary-dark/70 leading-relaxed">
                Tempelkan array JSON hasil data resmi (mis. publikasi BPS). Setiap objek memuat{' '}
                <span className="font-mono font-bold">region_code, region_name, poverty_rate</span>.
              </p>

              <textarea
                className="w-full h-44 bg-cream border border-primary-bg rounded-2xl p-3 text-xs font-mono text-primary-dark outline-none focus:ring-2 focus:ring-primary/20"
                placeholder='[{"region_code":"32","region_name":"Jawa Barat","province_name":"Jawa Barat","poverty_rate":7.8,"poor_population":3500000}]'
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />

              {importError && (
                <p className="text-xs text-coral-dark font-medium bg-coral/10 p-2.5 rounded-xl border border-coral/30">
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
    </div>
  );
};

export default PovertyMapping;
