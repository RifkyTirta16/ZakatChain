const idNumber = new Intl.NumberFormat('id-ID');

export const formatIDR = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Rp 0';
  return `Rp ${idNumber.format(Math.round(Number(value)))}`;
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0';
  return idNumber.format(Number(value));
};

export const formatPercent = (value: number | null | undefined, digits = 1): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0%';
  return `${Number(value).toFixed(digits)}%`;
};

const SQLITE_UTC_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;

export const parseUtcDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = SQLITE_UTC_RE.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : trimmed.includes('T')
      ? trimmed
      : trimmed.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const parsed = parseUtcDate(value);
  if (!parsed) return value;
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateKey = (value: string | null | undefined): string => {
  if (!value) return 'Tanggal tidak diketahui';
  const parsed = parseUtcDate(value);
  if (!parsed) return value.slice(0, 10);
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatRelativeTime = (value: string | null | undefined): string => {
  const parsed = parseUtcDate(value);
  if (!parsed) return '-';
  const diffSec = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 30) return `${diffDays} hari lalu`;
  return formatDateKey(value);
};

export const shortHash = (hash: string | null | undefined, head = 8, tail = 6): string => {
  if (!hash) return '-';
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
};

/**
 * Memecah string wilayah transaksi ("Provinsi, Kota" / "Provinsi - Kota")
 * menjadi bentuk provinsi untuk pencocokan dengan data kemiskinan.
 */
export const extractProvince = (region: string | null | undefined): string => {
  if (!region) return '';
  const bySeparator = region.split(/[,\-–—|]/)[0]?.trim() || '';
  return bySeparator;
};

/**
 * Daftar alias singkat yang umum dipakai backend/demo -> nama provinsi panjang.
 */
const PROVINCE_ALIASES: Record<string, string[]> = {
  Jakarta: ['DKI Jakarta', 'Jakarta'],
  'DKI Jakarta': ['DKI Jakarta', 'Jakarta'],
  NTT: ['Nusa Tenggara Timur'],
  NTB: ['Nusa Tenggara Barat'],
  Sumsel: ['Sumatera Selatan'],
  Sumut: ['Sumatera Utara'],
  Sumbar: ['Sumatera Barat'],
  Jabar: ['Jawa Barat'],
  Jateng: ['Jawa Tengah'],
  Jatim: ['Jawa Timur'],
  Kaltim: ['Kalimantan Timur'],
  Sulsel: ['Sulawesi Selatan'],
};

export const provinceMatches = (a: string | null | undefined, b: string | null | undefined): boolean => {
  const norm = (s: string) => s.trim().toLowerCase();
  const x = norm(a || '');
  const y = norm(b || '');
  if (!x || !y) return false;
  if (x === y) return true;
  const expand = (s: string): string[] => {
    const found = Object.entries(PROVINCE_ALIASES).find(([key]) => norm(key) === s);
    return found ? found[1].map(norm) : [s];
  };
  return expand(x).some((vx) => expand(y).includes(vx));
};

export const matchesProvinceField = (transactionRegion: string | null | undefined, provinceName: string): boolean => {
  if (!transactionRegion) return false;
  const direct = provinceMatches(transactionRegion, provinceName);
  if (direct) return true;
  const extracted = extractProvince(transactionRegion);
  return provinceMatches(extracted, provinceName);
};
