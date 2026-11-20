import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Badge, Card, ErrorState, Skeleton } from '../../components/ui';
import apiClient from '../../utils/api';
import { formatIDR } from '../../utils/format';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [-2.5, 118];
const DEFAULT_ZOOM = 5;

const REGION_COORDS: Record<string, [number, number]> = {
  'DKI Jakarta': [-6.2088, 106.8456],
  'Jawa Barat': [-7.0909, 107.6689],
  'Jawa Tengah': [-7.1509, 110.1403],
  'Jawa Timur': [-7.2906, 112.6321],
  'Sumatera Utara': [3.5952, 98.6722],
  'Sumatera Barat': [-0.9517, 101.4449],
  'Sulawesi Selatan': [-5.1477, 119.4327],
  'Kalimantan Timur': [0.5319, 117.0243],
  'Bali': [-8.4095, 115.1889],
  'Nusa Tenggara Barat': [-8.6565, 117.3563],
  'Nusa Tenggara Timur': [-8.6565, 121.2328],
  'Papua': [-2.5367, 140.7233],
};

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

const circleRadius = (distributed: number): number => {
  if (distributed <= 0) return 6;
  return Math.min(40, Math.max(8, Math.sqrt(distributed / 1000) * 4));
};

const statusColor = (status: string): string => {
  if (status === 'CRITICAL') return '#EF6C4A';
  if (status === 'WARNING') return '#FFD23F';
  return '#2BA8A2';
};

const legendItem = (colorClass: string, label: string) => (
  <div className="flex items-center gap-2">
    <span className={`w-3 h-3 rounded-full ${colorClass}`} />
    <span className="text-xs font-medium text-primary-dark/60 uppercase tracking-wider">
      {label}
    </span>
  </div>
);

export const DistributionMap = () => {
  const { data, isLoading, error } = useQuery<RegionStat[]>({
    queryKey: ['mapping-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<RegionStat[]>('/mapping/stats');
      return data;
    },
  });

  const top5 = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.total_distributed - a.total_distributed).slice(0, 5),
    [data]
  );

  const regions = data ?? [];

  if (isLoading) {
    return (
      <Card className="rounded-2xl p-0 h-[280px] md:h-[380px] border-0">
        <Skeleton className="w-full h-full rounded-2xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl p-6 border-0">
        <ErrorState
          message="Gagal memuat peta distribusi. Periksa koneksi ke server dan coba lagi."
        />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-0 h-[280px] md:h-[380px] flex flex-col border border-slate-200/70 border-l-0">
      <div className="px-6 pb-2 flex items-center justify-between border-b border-slate-200/70">
        <h2 className="text-lg font-extrabold text-slate-900">Peta Distribusi Zakat</h2>
        <Link
          to="/mapping"
          className="text-sm font-medium text-primary-dark hover:underline transition-colors"
        >
          Buka pemetaan lengkap
        </Link>
      </div>
      <div className="flex-1 relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {regions.map((r) => {
            const coords = REGION_COORDS[r.region];
            if (!coords) return null;
            return (
              <CircleMarker
                key={r.region_code}
                center={coords}
                radius={circleRadius(r.total_distributed)}
                color={statusColor(r.status)}
                fillColor={statusColor(r.status)}
                fillOpacity={0.6}
                weight={2}
              >
                {r.total_distributed > 0 ? `${r.region}: ${formatIDR(r.total_distributed)}` : null}
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <div className="px-6 pt-2 pb-4">
        <div className="flex items-center gap-4 mb-3">
          {legendItem('bg-coral', 'Kritis')}
          {legendItem('bg-gold', 'Peringatan')}
          {legendItem('bg-primary', 'Stabil')}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {top5.map((r) => (
            <div
              key={r.region_code}
              className="flex items-center justify-between px-3 py-2 bg-cream rounded-xl text-sm border border-slate-200/70"
            >
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">{r.region}</span>
                <span className="text-xs text-slate-600">{r.province}</span>
              </div>
              <Badge tone="primary" className="text-xs">
                {formatIDR(r.total_distributed)}
              </Badge>
            </div>
          ))}
          {regions.length === 0 && (
            <p className="col-span-2 text-xs text-slate-600 text-center mt-2">
              Tidak ada data distribusi wilayah.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default DistributionMap;
