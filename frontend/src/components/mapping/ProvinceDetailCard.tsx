import { ArrowUpRight, Map as MapIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '../ui';
import { formatIDR, formatNumber, formatPercent } from '../../utils/format';

export interface PovertyIndicators {
  poverty_depth_index_p1?: number | null;
  poverty_severity_index_p2?: number | null;
  poor_population_thousand?: number | null;
  education_poor_age15plus_percent?: {
    below_sd?: number | null;
    sd_smp_graduate?: number | null;
    sma_or_higher?: number | null;
  };
  school_participation_poor_percent?: {
    age_7_12?: number | null;
    age_13_15?: number | null;
  };
  employment_status_poor_age15plus_percent?: {
    not_working?: number | null;
    informal_sector?: number | null;
    formal_sector?: number | null;
  };
  employment_sector_poor_age15plus_percent?: {
    not_working?: number | null;
    agriculture?: number | null;
    non_agriculture?: number | null;
  };
  food_expenditure_share_percent?: {
    poor?: number | null;
    non_poor?: number | null;
    poor_and_non_poor?: number | null;
  };
  housing_poor_households_percent?: {
    proper_water?: number | null;
    own_or_shared_toilet?: number | null;
  };
}

export interface RegionStatDetail {
  region: string;
  province: string;
  region_code: string;
  level?: string;
  poverty_rate: number;
  poor_population: number | null;
  poverty_line?: number | null;
  indicators?: PovertyIndicators | null;
  total_distributed: number;
  total_reports: number;
  target_amount: number;
  gap: number;
  reach_percentage: number;
  priority_score: string;
  status: 'CRITICAL' | 'WARNING' | 'STABLE';
}

const fmtOptPercent = (v: number | null | undefined): string =>
  v === null || v === undefined ? 'N/A' : formatPercent(v, 2);

const MiniTile = ({ label, value }: { label: string; value: string }) => (
  <div className="p-2 rounded-lg bg-white border border-slate-200/70">
    <span className="text-[10px] text-slate-500 block truncate">{label}</span>
    <span className="font-bold text-forest-dark tabular-nums text-xs">{value}</span>
  </div>
);

interface ProvinceDetailCardProps {
  region: RegionStatDetail;
  canDistribute?: boolean;
  onClose: () => void;
  cities?: RegionStatDetail[];
  loadingCities?: boolean;
  onSelectCity?: (city: RegionStatDetail) => void;
}

export const ProvinceDetailCard = ({
  region,
  canDistribute = false,
  onClose,
  cities,
  loadingCities = false,
  onSelectCity,
}: ProvinceDetailCardProps) => {
  const ind = region.indicators;
  const isCity = region.level === 'Kota/Kabupaten';
  return (
    <Card className="rounded-3xl p-5 sm:p-6 bg-white border border-primary/30 shadow-card space-y-4">
      <div className="flex justify-between items-start gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center text-primary shrink-0">
            <MapIcon size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-forest-dark leading-tight truncate">{region.region}</h2>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">
              {isCity ? `${region.province} · Kode ${region.region_code}` : `${region.level || 'Provinsi'} · Kode BPS ${region.region_code}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail"
          className="p-1.5 rounded-lg text-slate-500 hover:text-forest-dark hover:bg-mint/60 shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Angka Kunci */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="p-3 bg-mint/60 rounded-xl border border-primary/15">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
            Tingkat Kemiskinan
          </span>
          <span className="text-lg font-extrabold text-forest-dark tabular-nums">
            {formatPercent(region.poverty_rate, 2)}
          </span>
        </div>
        <div className="p-3 bg-cream rounded-xl border border-slate-200/70">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
            Skor Prioritas
          </span>
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-lg font-extrabold text-forest-dark tabular-nums">{region.priority_score}</span>
            <Badge tone={region.status === 'CRITICAL' ? 'coral' : region.status === 'WARNING' ? 'gold' : 'success'}>
              {region.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Celah Pendanaan */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
        <div className="flex justify-between text-[11px] font-semibold text-forest-dark">
          <span>Jangkauan ({formatPercent(region.reach_percentage, 2)})</span>
          <span className="font-extrabold tabular-nums">Celah {formatIDR(region.gap)}</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${region.reach_percentage < 30 ? 'bg-danger' : 'bg-primary'}`}
            style={{ width: `${Math.min(region.reach_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Detail Angka Dasar */}
      <div className="space-y-1 text-xs divide-y divide-slate-100">
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">Populasi Miskin</span>
          <span className="font-extrabold text-forest-dark tabular-nums">
            {formatNumber(region.poor_population)} jiwa
          </span>
        </div>
        {region.poverty_line != null && (
          <div className="flex justify-between py-1.5">
            <span className="text-slate-500">Garis Kemiskinan</span>
            <span className="font-extrabold text-forest-dark tabular-nums">
              {formatIDR(region.poverty_line)} / bln
            </span>
          </div>
        )}
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">Penyaluran Tercatat ({region.total_reports} laporan)</span>
          <span className="font-extrabold text-forest-dark tabular-nums">
            {formatIDR(region.total_distributed)}
          </span>
        </div>
      </div>

      {/* Rincian Kota/Kabupaten (Saat Melihat Level Provinsi) */}
      {!isCity && (loadingCities || (cities && cities.length > 0)) && (
        <div className="pt-2.5 border-t border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <p className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
              Kota &amp; Kabupaten ({cities?.length ?? 0})
            </p>
            <span className="text-[10px] text-slate-500">Klik untuk detail</span>
          </div>
          {loadingCities ? (
            <p className="text-[11px] text-slate-500 py-1">Memuat rincian kota/kabupaten…</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {(cities ?? []).map((city) => (
                <button
                  key={city.region_code}
                  type="button"
                  onClick={() => onSelectCity?.(city)}
                  className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 hover:bg-mint/60 border border-slate-200/70 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-forest-dark block truncate">{city.region}</span>
                    <span className="text-[10px] text-slate-500">
                      {formatPercent(city.poverty_rate, 2)} miskin · {formatIDR(city.total_distributed)}
                    </span>
                  </div>
                  <Badge tone={city.status === 'CRITICAL' ? 'coral' : city.status === 'WARNING' ? 'gold' : 'success'}>
                    {city.priority_score}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Indikator Sosial Ekonomi Lanjutan (P1/P2, Pendidikan, Pekerjaan, Sanitasi) */}
      {ind && (
        <div className="pt-2.5 border-t border-slate-200/80 space-y-3 text-[11px]">
          <p className="font-bold uppercase tracking-wider text-slate-500">Indikator Sosial Ekonomi</p>

          {(ind.poverty_depth_index_p1 != null || ind.poverty_severity_index_p2 != null) && (
            <div className="grid grid-cols-2 gap-2">
              <MiniTile label="Kedalaman (P1)" value={String(ind.poverty_depth_index_p1 ?? 'N/A')} />
              <MiniTile label="Keparahan (P2)" value={String(ind.poverty_severity_index_p2 ?? 'N/A')} />
            </div>
          )}

          {ind.education_poor_age15plus_percent && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-semibold text-forest-dark block">Pendidikan Penduduk Miskin (15+ thn)</span>
              <div className="grid grid-cols-3 gap-2">
                <MiniTile label="< SD" value={fmtOptPercent(ind.education_poor_age15plus_percent.below_sd)} />
                <MiniTile label="SD–SMP" value={fmtOptPercent(ind.education_poor_age15plus_percent.sd_smp_graduate)} />
                <MiniTile label="SMA+" value={fmtOptPercent(ind.education_poor_age15plus_percent.sma_or_higher)} />
              </div>
            </div>
          )}

          {ind.school_participation_poor_percent && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-semibold text-forest-dark block">Partisipasi Sekolah Miskin</span>
              <div className="grid grid-cols-2 gap-2">
                <MiniTile label="Usia 7–12 thn" value={fmtOptPercent(ind.school_participation_poor_percent.age_7_12)} />
                <MiniTile label="Usia 13–15 thn" value={fmtOptPercent(ind.school_participation_poor_percent.age_13_15)} />
              </div>
            </div>
          )}

          {ind.employment_status_poor_age15plus_percent && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-semibold text-forest-dark block">Ketenagakerjaan &amp; Sektor (15+ thn)</span>
              <div className="grid grid-cols-3 gap-2">
                <MiniTile label="Tdk Kerja" value={fmtOptPercent(ind.employment_status_poor_age15plus_percent.not_working)} />
                <MiniTile label="Informal" value={fmtOptPercent(ind.employment_status_poor_age15plus_percent.informal_sector)} />
                <MiniTile label="Formal" value={fmtOptPercent(ind.employment_status_poor_age15plus_percent.formal_sector)} />
              </div>
              {ind.employment_sector_poor_age15plus_percent && (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <MiniTile label="Sektor Pertanian" value={fmtOptPercent(ind.employment_sector_poor_age15plus_percent.agriculture)} />
                  <MiniTile label="Non-Pertanian" value={fmtOptPercent(ind.employment_sector_poor_age15plus_percent.non_agriculture)} />
                </div>
              )}
            </div>
          )}

          {(ind.food_expenditure_share_percent || ind.housing_poor_households_percent) && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-semibold text-forest-dark block">Pangan, Air Layak &amp; Sanitasi</span>
              {ind.food_expenditure_share_percent && (
                <div className="grid grid-cols-3 gap-2">
                  <MiniTile label="Pangan Miskin" value={fmtOptPercent(ind.food_expenditure_share_percent.poor)} />
                  <MiniTile label="Non-Miskin" value={fmtOptPercent(ind.food_expenditure_share_percent.non_poor)} />
                  <MiniTile label="Gabungan" value={fmtOptPercent(ind.food_expenditure_share_percent.poor_and_non_poor)} />
                </div>
              )}
              {ind.housing_poor_households_percent && (
                <div className="grid grid-cols-2 gap-2">
                  <MiniTile label="Air Minum Layak" value={fmtOptPercent(ind.housing_poor_households_percent.proper_water)} />
                  <MiniTile label="Sanitasi Layak" value={fmtOptPercent(ind.housing_poor_households_percent.own_or_shared_toilet)} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {canDistribute && (
        <Link
          to="/new-record"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-b from-primary-light to-primary px-3.5 py-2 text-xs font-semibold text-white hover:to-forest shadow-teal-glow transition-all"
        >
          <span>Catat Penyaluran ke Wilayah Ini</span>
          <ArrowUpRight size={14} />
        </Link>
      )}
    </Card>
  );
};
