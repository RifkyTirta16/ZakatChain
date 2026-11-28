import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationBarProps {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (nextOffset: number) => void;
  onLimitChange?: (nextLimit: number) => void;
}

const PAGE_SIZES = [10, 25, 50];

/** Consistent Indonesian pagination footer across operational and public tables. */
export const PaginationBar = ({
  total,
  limit,
  offset,
  onOffsetChange,
  onLimitChange,
}: PaginationBarProps) => {
  const safeLimit = Math.max(1, limit);
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(total, offset + safeLimit);
  const hasPrev = offset > 0;
  const hasNext = offset + safeLimit < total;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-600">
      <p className="tabular-nums">
        Menampilkan <strong className="text-forest-dark">{start}</strong>–
        <strong className="text-forest-dark">{end}</strong> dari{' '}
        <strong className="text-forest-dark">{total}</strong> data
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        {onLimitChange && (
          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-500">Baris:</span>
            <select
              aria-label="Jumlah baris per halaman"
              value={String(safeLimit)}
              onChange={(event) => {
                onLimitChange(Number(event.target.value));
                onOffsetChange(0);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-forest-dark outline-none focus:border-primary cursor-pointer"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="inline-flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasPrev}
            onClick={() => onOffsetChange(Math.max(0, offset - safeLimit))}
          >
            <ChevronLeft size={14} /> Sebelumnya
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!hasNext}
            onClick={() => onOffsetChange(offset + safeLimit)}
          >
            Berikutnya <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
