import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
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
  Bali: [-8.4095, 115.1889],
  'Nusa Tenggara Barat': [-8.6565, 117.3563],
  'Nusa Tenggara Timur': [-8.6565, 121.2328],
  Papua: [-2.5367, 140.7233],
};

interface RegionStat {
  region: string;
  province: string;
  region_code: string;
  total_distributed: number;
  status: 'CRITICAL' | 'WARNING' | 'STABLE';
}

const circleRadius = (distributed: number): number => {
  if (distributed <= 0) return 6;
  return Math.min(36, Math.max(8, Math.sqrt(distributed / 1000) * 3.5));
};

const statusColor = (status: string): string => {
  if (status === 'CRITICAL') return '#DC2626';
  if (status === 'WARNING') return '#C9A45C';
  return '#047857';
};

export const DistributionMap = () => {
  const { data, isLoading, error, refetch } = useQuery<RegionStat[]>({
    queryKey: ['mapping-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<RegionStat[]>('/mapping/stats');
      return data;
    },
  });

  const top4 = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.total_distributed - a.total_distributed).slice(0, 4),
    [data],
  );

  const regions = data ?? [];

  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={10} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState
          message="Gagal memuat peta distribusi wilayah."
          retry={() => void refetch()}
        />
      </Card>
    );
  }

  return (
    <Card className="p-0 sm:p-0 overflow-hidden">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-forest-dark">Sebaran Distribusi Wilayah</h2>
          <p className="text-xs text-slate-500">Ringkasan agregat penyaluran zakat per provinsi</p>
        </div>
        <Link to="/mapping" className="text-xs font-semibold text-primary hover:text-forest">
          Buka Pemetaan Lengkap →
        </Link>
      </div>

      <div className="h-64 sm:h-72 relative z-0">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
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
                fillOpacity={0.65}
                weight={2}
              />
            );
          })}
        </MapContainer>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Prioritas Kritis
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gold" /> Perlu Perhatian
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Stabil
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {top4.map((r) => (
            <div
              key={r.region_code}
              className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-cream rounded-xl border border-slate-200/70"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-forest-dark truncate">{r.region}</p>
                <p className="text-[11px] text-slate-500 truncate">{r.province}</p>
              </div>
              <Badge tone="primary" className="shrink-0 tabular-nums">
                {formatIDR(r.total_distributed)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default DistributionMap;
