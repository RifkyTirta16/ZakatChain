import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { Layer, LeafletEvent, PathOptions, StyleFunction } from 'leaflet';
import L from 'leaflet';
import { Globe, Info, TrendingDown, AlertCircle, Search, Map as MapIcon, RefreshCw, Database } from 'lucide-react';
import apiClient from '../utils/api';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../components/wattvision/UIComponents';
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

const povertyColor = (rate: number) =>
  rate > 20 ? '#FF453A' : rate > 15 ? '#FF9F0A' : rate > 10 ? '#FFD60A' : rate > 5 ? '#32D74B' : '#00E5FF';

const priorityColor = (score: number) =>
  score > 30 ? '#FF453A' : score > 15 ? '#FF9F0A' : score > 8 ? '#FFD60A' : '#32D74B';

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
      return (data as { region: string | null; amount: number }[]).map((t) => ({ region: t.region, amount: Number(t.amount) || 0 }));
    },
  });

  const isDemoData = useMemo(() => {
    const stats = statsQuery.data || [];
    const reco = recoQuery.data || [];
    return stats.length > 0 && reco.length === 0;
  }, [statsQuery.data, recoQuery.data]);

  /**
   * Statistik wilayah dari backend digabung dengan agregasi transaksi nyata.
   * Backend mencocokkan `transactions.region` secara eksak dengan nama provinsi,
   * tetapi data transaksi memakai format "Provinsi, Kota" — karena itu pencocokan
   * dilakukan di frontend dengan normalisasi prefiks provinsi.
   */
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
        ? '#2C2C2E'
        : indicatorMode === 'poverty'
          ? povertyColor(data.poverty_rate)
          : priorityColor(parseFloat(data.priority_score));
      return {
        fillColor,
        weight: 2,
        opacity: 1,
        color: '#00E5FF',
        fillOpacity: 0.55,
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
          l.setStyle({ fillOpacity: 0.85, weight: 3, color: '#FFFFFF' });
        },
        mouseout: (e: LeafletEvent) => {
          const l = e.target as L.Path;
          const fillColor = !data
            ? '#2C2C2E'
            : indicatorMode === 'poverty'
              ? povertyColor(data.poverty_rate)
              : priorityColor(parseFloat(data.priority_score));
          l.setStyle({ fillColor, fillOpacity: 0.55, weight: 2, color: '#00E5FF', opacity: 1 });
        },
        click: () => {
          if (data) setSelectedCode(data.region_code);
        },
      });
      if (!data) {
        layer.bindTooltip(`${name} — tanpa data kemiskinan`, { sticky: true });
      } else {
        layer.bindTooltip(`${name}: ${indicatorMode === 'poverty' ? `${data.poverty_rate}% kemiskinan` : `skor ${data.priority_score}`}`, { sticky: true });
      }
    };
  }, [enrichedStats, indicatorMode]);

  const isLoading = statsQuery.isLoading || recoQuery.isLoading || txQuery.isLoading;
  const error = statsQuery.error || recoQuery.error || txQuery.error;

  const retry = () => {
    statsQuery.refetch();
    recoQuery.refetch();
    txQuery.refetch();
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
      const { data } = await apiClient.post('/mapping/import', { data: parsed });
      setIsImportModalOpen(false);
      setImportData('');
      alert(data?.message || 'Impor berhasil.');
      retry();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; details?: unknown } } };
      const detail = e.response?.data?.details;
      const detailText = Array.isArray(detail)
        ? detail.map((d: { message?: string }) => d.message).filter(Boolean).join('; ')
        : typeof detail === 'string' ? detail : '';
      setImportError(`${e.response?.data?.error || 'Impor gagal.'} ${detailText}`.trim());
    } finally {
      setImportBusy(false);
    }
  };

  if (isLoading) return <LoadingState label="Memuat pemetaan wilayah…" />;
  if (error) {
    return (
      <ErrorState
        message={(error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal memuat data pemetaan.'}
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase italic leading-none flex items-center gap-3">
            <Globe className="text-wattvision-primary" size={24} />
            Pemetaan <span className="text-wattvision-primary">Kemiskinan</span>
          </h1>
          <p className="text-wattvision-textSecondary text-xs uppercase tracking-widest font-medium mt-2">
            Sumber: GET /api/mapping/stats · GET /api/mapping/recommendations · GET /api/transactions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wattvision-textSecondary" size={14} />
            <input
              type="text"
              placeholder="Cari wilayah…"
              className="bg-wattvision-surface border border-wattvision-border pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary transition-colors w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="bg-wattvision-surface border border-wattvision-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="STABLE">Stable</option>
          </select>
          <select
            className="bg-wattvision-surface border border-wattvision-border px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-wattvision-primary"
            value={indicatorMode}
            onChange={(e) => setIndicatorMode(e.target.value as 'poverty' | 'priority')}
          >
            <option value="poverty">Warna: Tingkat Kemiskinan</option>
            <option value="priority">Warna: Skor Prioritas</option>
          </select>
          <button
            onClick={retry}
            disabled={statsQuery.isFetching}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-lg border border-wattvision-border text-wattvision-textSecondary hover:border-wattvision-primary hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={statsQuery.isFetching ? 'animate-spin' : ''} /> Segarkan
          </button>
          {canImport && (
            <button
              onClick={() => { setImportError(''); setIsImportModalOpen(true); }}
              className="bg-wattvision-primary text-black text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              Impor Data Kemiskinan
            </button>
          )}
        </div>
      </header>

      {isDemoData && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-xs leading-relaxed">
          <Database size={16} className="shrink-0 mt-0.5" />
          <p>
            <span className="font-bold uppercase tracking-wider">Data demonstrasi.</span>{' '}
            Tabel <span className="font-mono">poverty_stats</span> di backend masih kosong, sehingga angka tingkat kemiskinan
            dan populasi miskin berasal dari <span className="font-mono">fallback contoh bawaan server</span> — bukan data BPS resmi.
            Impor data resmi (dengan sumber & tahun referensi) melalui tombol impor untuk menggantinya.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-wattvision-surface border border-wattvision-border rounded-3xl overflow-hidden relative h-[560px] shadow-2xl z-0">
          <MapContainer
            center={[-2.5, 118]}
            zoom={5}
            style={{ height: '100%', width: '100%', background: '#121212' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <GeoJSON data={indonesiaGeoJson} style={geoStyle} onEachFeature={onEachFeature} key={indicatorMode} />
            <MapBoundsHandler data={indonesiaGeoJson} />
          </MapContainer>

          <div className="absolute bottom-4 left-4 z-[1000] bg-wattvision-surface/90 backdrop-blur-md border border-wattvision-border p-4 rounded-2xl shadow-xl">
            <p className="text-[10px] uppercase tracking-widest text-wattvision-textSecondary font-bold mb-3">
              {indicatorMode === 'poverty' ? 'Tingkat Kemiskinan' : 'Skor Prioritas'}
            </p>
            <div className="space-y-2 text-xs">
              {indicatorMode === 'poverty' ? (
                <>
                  <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#FF453A] rounded-full" /> Kritis (&gt; 20%)</div>
                  <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#FFD60A] rounded-full" /> Sedang (10–20%)</div>
                  <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#32D74B] rounded-full" /> Rendah (&lt; 10%)</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#FF453A] rounded-full" /> Prioritas tinggi (&gt; 30)</div>
                  <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#FF9F0A] rounded-full" /> Prioritas sedang (15–30)</div>
                  <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#32D74B] rounded-full" /> Prioritas rendah (&lt; 15)</div>
                </>
              )}
              <div className="flex items-center gap-3"><span className="w-3 h-3 bg-[#2C2C2E] rounded-full" /> Tanpa data</div>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-[1000] bg-wattvision-surface/90 backdrop-blur-md border border-wattvision-border px-3 py-2 rounded-xl shadow-xl max-w-[260px]">
            <p className="text-[9px] text-wattvision-textSecondary uppercase tracking-widest leading-relaxed">
              Geometri peta: poligon skematis 8 provinsi dari aset lokal (bukan batas administratif resmi).
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {selectedRegion ? (
            <div className="bg-wattvision-surface border border-wattvision-border p-6 rounded-3xl shadow-xl">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-wattvision-primary rounded-lg flex items-center justify-center text-black">
                    <MapIcon size={16} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase italic tracking-tight leading-none">{selectedRegion.region}</h2>
                    <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mt-1">
                      {selectedRegion.province || 'Wilayah'} · kode {selectedRegion.region_code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="text-wattvision-textSecondary hover:text-white transition-colors"
                  aria-label="Tutup detail"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                  <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Tingkat Kemiskinan</p>
                  <p className="text-lg font-bold font-mono text-wattvision-primary">{formatPercent(selectedRegion.poverty_rate)}</p>
                </div>
                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                  <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Jangkauan Distribusi</p>
                  <p className="text-lg font-bold font-mono">{formatPercent(selectedRegion.reach_percentage, 2)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2">
                    <span className="text-wattvision-textSecondary">Celah Pendanaan</span>
                    <span className="text-wattvision-alert font-bold font-mono">{formatIDR(selectedRegion.gap)}</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${selectedRegion.reach_percentage < 30 ? 'bg-wattvision-alert' : 'bg-wattvision-success'}`}
                      style={{ width: `${Math.min(selectedRegion.reach_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-wattvision-textSecondary uppercase tracking-widest text-[10px]">Populasi Miskin</span>
                    <span className="font-mono font-bold">{formatNumber(selectedRegion.poor_population)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wattvision-textSecondary uppercase tracking-widest text-[10px]">Terdistribusi (transaksi)</span>
                    <span className="font-mono font-bold text-wattvision-success">{formatIDR(selectedRegion.total_distributed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wattvision-textSecondary uppercase tracking-widest text-[10px]">Jumlah laporan</span>
                    <span className="font-mono font-bold">{formatNumber(selectedRegion.total_reports)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-wattvision-textSecondary uppercase tracking-widest text-[10px]">Target backend</span>
                    <span className="font-mono font-bold">{formatIDR(selectedRegion.target_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-wattvision-textSecondary uppercase tracking-widest text-[10px]">Status</span>
                    <StatusBadge
                      label={selectedRegion.status}
                      tone={selectedRegion.status === 'CRITICAL' ? 'danger' : selectedRegion.status === 'WARNING' ? 'warning' : 'success'}
                    />
                  </div>
                </div>

                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border flex items-start gap-2">
                  <AlertCircle className="text-wattvision-primary shrink-0" size={16} />
                  <p className="text-[11px] text-wattvision-textSecondary leading-relaxed">
                    Skor prioritas <span className="font-mono text-white">{selectedRegion.priority_score}</span> dihitung dari
                    tingkat kemiskinan dan sisa jangkauan distribusi (bobot 0.6 / 0.4 di backend).
                    Angka distribusi telah dinormalisasi dari transaksi berformat
                    <span className="font-mono"> "Provinsi, Kota"</span>.
                  </p>
                </div>

                <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border">
                  <p className="text-[10px] text-wattvision-textSecondary uppercase tracking-widest mb-1">Sumber indikator kemiskinan</p>
                  <p className="text-xs">
                    {isDemoData
                      ? 'Fallback contoh bawaan backend — bukan BPS. Belum ada data resmi terimpor.'
                      : 'Data terimpor via POST /api/mapping/import (nama sumber tidak diekspor oleh API saat ini).'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl text-center h-full flex flex-col items-center justify-center space-y-4 opacity-60">
              <Info size={40} className="text-wattvision-textSecondary" />
              <p className="text-wattvision-textSecondary text-sm uppercase tracking-widest">
                Pilih wilayah pada peta untuk detail
              </p>
            </div>
          )}

          <div className="bg-wattvision-surface border border-wattvision-border p-6 rounded-3xl shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-wattvision-primary" /> Perlu Prioritas Distribusi
            </h3>
            <div className="p-3 bg-wattvision-bg rounded-xl border border-wattvision-border mb-4">
              <p className="text-[10px] text-wattvision-textSecondary uppercase tracking-widest leading-relaxed font-mono">
                Skor = (kemiskinan × 0.6) + ((1 − jangkauan) × 40)
              </p>
              <p className="text-[10px] text-wattvision-textSecondary mt-2 leading-relaxed">
                Target backend: Rp 50.000 × populasi miskin (asumsi bawaan server).
              </p>
            </div>
            {filteredStats.length === 0 ? (
              <EmptyState message="Tidak ada wilayah yang cocok dengan filter." />
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredStats.map((region) => (
                  <button
                    key={region.region_code}
                    onClick={() => setSelectedCode(region.region_code)}
                    className="w-full flex justify-between items-center p-3 bg-wattvision-bg rounded-xl border border-wattvision-border hover:border-wattvision-primary transition-colors text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium uppercase tracking-tight">{region.region}</span>
                      <span className="text-[9px] text-wattvision-textSecondary uppercase">
                        {region.province} · {formatIDR(region.total_distributed)} terdistribusi
                      </span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${region.status === 'CRITICAL' ? 'text-wattvision-alert' : region.status === 'WARNING' ? 'text-yellow-400' : 'text-wattvision-success'}`}>
                      {region.priority_score}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-wattvision-surface border border-wattvision-border w-full max-w-lg rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold uppercase italic tracking-tight">
                Impor <span className="text-wattvision-primary">Data Kemiskinan</span>
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} className="text-wattvision-textSecondary hover:text-white" aria-label="Tutup">
                ✕
              </button>
            </div>

            <p className="text-wattvision-textSecondary text-xs leading-relaxed mb-4">
              Tempelkan array JSON hasil data resmi (mis. publikasi BPS). Setiap objek wajib memuat
              <span className="font-mono"> region_code, region_name, poverty_rate</span>, dan sebaiknya
              <span className="font-mono"> province_name, poor_population, reference_year, source_name, source_url</span>.
              Endpoint: <span className="font-mono">POST /api/mapping/import</span> (peran ADMIN/AMIL).
            </p>
            <textarea
              className="w-full h-44 bg-wattvision-bg border border-wattvision-border rounded-2xl p-4 text-xs font-mono text-wattvision-textMain focus:outline-none focus:border-wattvision-primary transition-colors mb-3"
              placeholder='[{"region_code":"32","region_name":"Jawa Barat","province_name":"Jawa Barat","poverty_rate":7.8,"poor_population":3500000,"reference_year":2024,"source_name":"BPS","source_url":"https://..."}]'
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
            />
            {importError && (
              <p className="text-xs text-wattvision-alert mb-3 font-mono">{importError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold text-wattvision-textSecondary hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={importBusy || !importData.trim()}
                className="flex-1 bg-wattvision-primary text-black px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
              >
                {importBusy ? 'Mengirim…' : 'Impor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PovertyMapping;
