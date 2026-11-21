import { Map as MapIcon, X } from 'lucide-react';
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
  poor_population: number;
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

interface ProvinceDetailCardProps {
  region: RegionStatDetail;
  onClose: () => void;
}

export const ProvinceDetailCard = ({ region, onClose }: ProvinceDetailCardProps) => {
  const ind = region.indicators;
  return (
    <Card className="rounded-3xl p-6 bg-white border border-primary/30 shadow-card space-y-4">
      <div className="flex justify-between items-start gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center text-primary shrink-0">
            <MapIcon size={16} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-forest-dark leading-tight">{region.region}</h2>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">
              {region.level || 'Provinsi'} · Kode BPS {region.region_code}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail"
          className="p-1 rounded-lg text-slate-500 hover:text-forest-dark hover:bg-mint/60"
        >
          <X size={16} />
        </button>
      </div>

      {/* Angka Kunci */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-mint/60 rounded-xl border border-primary/15">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
            Tingkat Kemiskinan
          </span>
          <span className="text-base font-extrabold text-forest-dark tabular-nums">
            {formatPercent(region.poverty_rate, 2)}
          </span>
        </div>
        <div className="p-3 bg-cream rounded-xl border border-slate-200/70">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
            Jangkauan Zakat
          </span>
          <span className="text-base font-extrabold text-forest-dark tabular-nums">
            {formatPercent(region.reach_percentage, 1)}
          </span>
        </div>
      </div>

      {/* Progress Celah Pendanaan */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
        <div className="flex justify-between text-[11px] font-semibold text-forest-dark">
          <span>Celah Pendanaan:</span>
          <span className="font-extrabold">{formatIDR(region.gap)}</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${region.reach_percentage < 30 ? 'bg-danger' : 'bg-primary'}`}
            style={{ width: `${Math.min(region.reach_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Detail Angka Dasar */}
      <div className="space-y-1.5 text-xs divide-y divide-slate-100">
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
          <span className="text-slate-500">Tersalurkan Tercatat</span>
          <span className="font-extrabold text-forest-dark tabular-nums">
            {formatIDR(region.total_distributed)}
          </span>
        </div>
        <div className="flex justify-between py-1.5 items-center">
          <span className="text-slate-500">Status Prioritas</span>
          <Badge
            tone={region.status === 'CRITICAL' ? 'coral' : region.status === 'WARNING' ? 'gold' : 'success'}
          >
            {region.status}
          </Badge>
        </div>
      </div>

      {/* Indikator Sosial Ekonomi Lanjutan (P1/P2, Pendidikan, Pekerjaan, Sanitasi) */}
      {ind && (
        <div className="pt-2 border-t border-slate-200/80 space-y-3 text-[11px]">
          <p className="font-bold uppercase tracking-wider text-slate-500">Indikator Sosial Ekonomi</p>

          {(ind.poverty_depth_index_p1 != null || ind.poverty_severity_index_p2 != null) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Indeks Kedalaman (P1)</span>
                <span className="font-mono font-bold text-forest-dark">{ind.poverty_depth_index_p1 ?? 'N/A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Indeks Keparahan (P2)</span>
                <span className="font-mono font-bold text-forest-dark">{ind.poverty_severity_index_p2 ?? 'N/A'}</span>
              </div>
            </div>
          )}

          {ind.education_poor_age15plus_percent && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-forest-dark block">Pendidikan Penduduk Miskin (15+)</span>
              <div className="flex justify-between text-slate-600">
                <span>&lt; SD: <strong>{fmtOptPercent(ind.education_poor_age15plus_percent.below_sd)}</strong></span>
                <span>SD–SMP: <strong>{fmtOptPercent(ind.education_poor_age15plus_percent.sd_smp_graduate)}</strong></span>
                <span>SMA+: <strong>{fmtOptPercent(ind.education_poor_age15plus_percent.sma_or_higher)}</strong></span>
              </div>
            </div>
          )}

          {ind.school_participation_poor_percent && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-forest-dark block">Partisipasi Sekolah Miskin</span>
              <div className="flex justify-between text-slate-600">
                <span>Usia 7–12 thn: <strong>{fmtOptPercent(ind.school_participation_poor_percent.age_7_12)}</strong></span>
                <span>Usia 13–15 thn: <strong>{fmtOptPercent(ind.school_participation_poor_percent.age_13_15)}</strong></span>
              </div>
            </div>
          )}

          {ind.employment_status_poor_age15plus_percent && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-forest-dark block">Ketenagakerjaan &amp; Sektor Miskin (15+)</span>
              <div className="grid grid-cols-3 gap-1 text-slate-600">
                <span>Tdk Kerja: <strong>{fmtOptPercent(ind.employment_status_poor_age15plus_percent.not_working)}</strong></span>
                <span>Informal: <strong>{fmtOptPercent(ind.employment_status_poor_age15plus_percent.informal_sector)}</strong></span>
                <span>Formal: <strong>{fmtOptPercent(ind.employment_status_poor_age15plus_percent.formal_sector)}</strong></span>
              </div>
              {ind.employment_sector_poor_age15plus_percent && (
                <div className="flex justify-between text-slate-500 pt-0.5">
                  <span>Pertanian: <strong>{fmtOptPercent(ind.employment_sector_poor_age15plus_percent.agriculture)}</strong></span>
                  <span>Non-Pertanian: <strong>{fmtOptPercent(ind.employment_sector_poor_age15plus_percent.non_agriculture)}</strong></span>
                </div>
              )}
            </div>
          )}

          {(ind.food_expenditure_share_percent || ind.housing_poor_households_percent) && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-semibold text-forest-dark block">Pangan, Air Layak &amp; Sanitasi</span>
              <div className="flex flex-wrap justify-between gap-2 text-slate-600">
                {ind.food_expenditure_share_percent && (
                  <span>Porsi Pangan Miskin: <strong>{fmtOptPercent(ind.food_expenditure_share_percent.poor)}</strong></span>
                )}
                {ind.housing_poor_households_percent && (
                  <>
                    <span>Air Layak: <strong>{fmtOptPercent(ind.housing_poor_households_percent.proper_water)}</strong></span>
                    <span>Sanitasi: <strong>{fmtOptPercent(ind.housing_poor_households_percent.own_or_shared_toilet)}</strong></span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
