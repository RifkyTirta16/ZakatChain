import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { getStoredSessionUser } from '../../components/layout/navConfig';
import { INDONESIA_REGIONS } from '../../utils/regions';
import { formatDateTime, formatIDR } from '../../utils/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PaginationBar,
  SectionHeader,
  Skeleton,
  statusBadge,
} from '../../components/ui';
import { TransactionDetailDrawer } from '../../components/admin/TransactionDetailDrawer';

const ASNAF_LIST = [
  'Fakir',
  'Miskin',
  'Amil',
  'Muallaf',
  'Riqab',
  'Gharimin',
  'Fisabilillah',
  'Ibnu Sabil',
] as const;

interface MustahikRow {
  id: number;
  full_name: string;
  category_asnaf: string;
  region: string;
  phone_masked: string | null;
  verification_status: 'VERIFIED' | 'PENDING' | 'INACTIVE';
  notes: string | null;
  created_at: string;
  distribution_count: number;
  total_received: number;
}

interface PaginatedMustahikResponse {
  items: MustahikRow[];
  total: number;
  limit: number;
  offset: number;
}

interface MustahikDetail {
  mustahik: MustahikRow;
  distributions: Array<{
    id: number;
    amount: number;
    category: string;
    region: string;
    timestamp: string;
    proof_status: string | null;
    blockchain_status: string | null;
  }>;
}

const MustahikPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerTxId, setDrawerTxId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [asnaf, setAsnaf] = useState<string>(ASNAF_LIST[1]);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [notes, setNotes] = useState('');

  const role = getStoredSessionUser()?.role ?? '';
  const canEdit = role === 'AMIL' || role === 'ADMIN';

  const listQuery = useQuery<PaginatedMustahikResponse>({
    queryKey: ['mustahik-list', search, statusFilter, limit, offset],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedMustahikResponse>('/mustahik', {
        params: {
          meta: '1',
          limit,
          offset,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      });
      return data;
    },
  });

  const detailQuery = useQuery<MustahikDetail>({
    queryKey: ['mustahik-detail', selectedId],
    enabled: selectedId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<MustahikDetail>(`/mustahik/${selectedId}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/mustahik', {
        full_name: fullName.trim(),
        category_asnaf: asnaf,
        region: `${province}, ${city}`,
        phone_masked: phoneMasked.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      return data;
    },
    onSuccess: () => {
      setBanner({ type: 'ok', text: `Data mustahik '${fullName.trim()}' berhasil ditambahkan.` });
      setFullName('');
      setProvince('');
      setCity('');
      setPhoneMasked('');
      setNotes('');
      setShowForm(false);
      void listQuery.refetch();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setBanner({ type: 'err', text: e.response?.data?.error || 'Gagal menyimpan data mustahik.' });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiClient.patch(`/mustahik/${id}`, { verification_status: status });
    },
    onSuccess: () => {
      setBanner({ type: 'ok', text: 'Status verifikasi mustahik diperbarui.' });
      void listQuery.refetch();
      if (selectedId !== null) void detailQuery.refetch();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setBanner({ type: 'err', text: e.response?.data?.error || 'Gagal memperbarui status mustahik.' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 3 || !province || !city) {
      setBanner({ type: 'err', text: 'Nama lengkap (min. 3 karakter), provinsi, dan kota wajib diisi.' });
      return;
    }
    createMutation.mutate();
  };

  const rows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const totalCount = listQuery.data?.total ?? 0;

  const asnafBreakdown = useMemo(() => {
    const totalAmount = rows.reduce((s, r) => s + Number(r.total_received || 0), 0);
    return ASNAF_LIST.map((name) => {
      const matching = rows.filter((r) => r.category_asnaf === name);
      const amount = matching.reduce((s, r) => s + Number(r.total_received || 0), 0);
      const sharePct = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;
      return { name, count: matching.length, amount, sharePct };
    });
  }, [rows]);

  const topConcentration = useMemo(() => {
    return asnafBreakdown.reduce<{ name: string; sharePct: number } | null>(
      (best, item) => (!best || item.sharePct > best.sharePct ? item : best),
      null
    );
  }, [asnafBreakdown]);

  if (listQuery.isError) {
    return <ErrorState message="Gagal memuat daftar mustahik." retry={() => void listQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Master Data Mustahik & Sebaran 8 Asnaf"
          subtitle="Registri penerima manfaat terverifikasi (khusus Amil, Auditor, & Admin — tidak dipublikasikan)."
        />
        {canEdit && (
          <Button variant="primary" onClick={() => setShowForm((v) => !v)} className="shrink-0">
            <Plus size={16} /> {showForm ? 'Tutup Form' : 'Tambah Mustahik'}
          </Button>
        )}
      </div>

      {/* 8 Asnaf Recap Grid */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-forest-dark flex items-center gap-2">
            <Users size={16} className="text-primary" /> Rekap Cakupan 8 Asnaf (Halaman Aktif · {totalCount} Terdaftar)
          </h2>
          {topConcentration && topConcentration.sharePct > 0 && (
            <Badge tone={topConcentration.sharePct >= 75 ? 'warning' : 'success'}>
              Konsentrasi tertinggi: {topConcentration.name} ({topConcentration.sharePct}%)
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {asnafBreakdown.map((item) => (
            <div
              key={item.name}
              className={`rounded-xl border p-2.5 text-center ${
                item.count > 0 ? 'bg-mint/50 border-primary/25' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <p className="text-[11px] font-bold text-forest-dark truncate">{item.name}</p>
              <p className="font-display text-base font-extrabold text-primary tabular-nums">{item.count}</p>
              <p className="text-[10px] text-slate-500 tabular-nums truncate">{formatIDR(item.amount)}</p>
            </div>
          ))}
        </div>
      </Card>

      {banner && (
        <div
          role={banner.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 font-medium ${
            banner.type === 'ok'
              ? 'bg-mint border-primary/25 text-forest'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {banner.type === 'ok' ? (
            <CheckCircle2 size={16} className="text-primary shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-danger shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {showForm && canEdit && (
        <Card className="space-y-4 border-primary/25">
          <h2 className="text-base font-bold text-forest-dark flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" /> Registrasi Mustahik Baru
          </h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-name" className="block text-xs font-semibold uppercase tracking-wider text-slateText mb-1">
                Nama Lengkap <span className="text-danger">*</span>
              </label>
              <input
                id="m-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama penerima manfaat"
                className="w-full min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-forest-dark"
              />
            </div>
            <div>
              <label htmlFor="m-asnaf" className="block text-xs font-semibold uppercase tracking-wider text-slateText mb-1">
                Kategori Asnaf <span className="text-danger">*</span>
              </label>
              <select
                id="m-asnaf"
                value={asnaf}
                onChange={(e) => setAsnaf(e.target.value)}
                className="w-full min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-forest-dark"
              >
                {ASNAF_LIST.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="m-prov" className="block text-xs font-semibold uppercase tracking-wider text-slateText mb-1">
                Provinsi <span className="text-danger">*</span>
              </label>
              <select
                id="m-prov"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity('');
                }}
                className="w-full min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-forest-dark"
              >
                <option value="">Pilih Provinsi</option>
                {Object.keys(INDONESIA_REGIONS).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="m-city" className="block text-xs font-semibold uppercase tracking-wider text-slateText mb-1">
                Kota / Kabupaten <span className="text-danger">*</span>
              </label>
              <select
                id="m-city"
                disabled={!province}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-forest-dark disabled:bg-slate-100"
              >
                <option value="">Pilih Kota / Kabupaten</option>
                {province &&
                  INDONESIA_REGIONS[province as keyof typeof INDONESIA_REGIONS]?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="m-phone" className="block text-xs font-semibold uppercase tracking-wider text-slateText mb-1">
                Kontak Tersamar (Opsional)
              </label>
              <input
                id="m-phone"
                type="text"
                value={phoneMasked}
                onChange={(e) => setPhoneMasked(e.target.value)}
                placeholder="Contoh: 0812****890"
                className="w-full min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-forest-dark"
              />
            </div>
            <div>
              <label htmlFor="m-notes" className="block text-xs font-semibold uppercase tracking-wider text-slateText mb-1">
                Catatan Survei (Opsional)
              </label>
              <input
                id="m-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ringkasan verifikasi lapangan"
                className="w-full min-h-[42px] rounded-[10px] border border-slate-300 bg-white px-3 text-sm text-forest-dark"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" variant="primary" loading={createMutation.isPending}>Simpan Mustahik</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Cari nama, asnaf, atau wilayah…"
              className="w-full min-h-[38px] rounded-[10px] border border-slate-300 bg-white pl-8 pr-3 text-xs sm:text-sm text-forest-dark"
            />
          </div>
          <select
            aria-label="Filter status mustahik"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="min-h-[38px] rounded-[10px] border border-slate-300 bg-white px-3 text-xs font-semibold text-forest-dark"
          >
            <option value="">Semua Status</option>
            <option value="VERIFIED">Terverifikasi</option>
            <option value="PENDING">Menunggu</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>

        {listQuery.isPending ? (
          <div className="p-5">
            <Skeleton lines={6} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Belum ada data mustahik"
            description="Tambahkan data penerima manfaat agar proses penyaluran tercatat lebih rapi dan bebas duplikasi."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama & Asnaf</th>
                    <th className="px-4 py-3 font-semibold">Wilayah</th>
                    <th className="px-4 py-3 font-semibold text-right">Bantuan Diterima</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((m) => {
                    const badge = statusBadge(m.verification_status);
                    return (
                      <tr key={m.id} className="hover:bg-cream/60">
                        <td className="px-4 py-3">
                          <p className="font-bold text-forest-dark">{m.full_name}</p>
                          <p className="text-xs text-slate-500">
                            Asnaf {m.category_asnaf} {m.phone_masked ? `· ${m.phone_masked}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">{m.region}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <p className="font-bold text-forest-dark">{formatIDR(Number(m.total_received))}</p>
                          <p className="text-[11px] text-slate-500">{m.distribution_count} penyaluran</p>
                        </td>
                        <td className="px-4 py-3">
                          {canEdit ? (
                            <select
                              aria-label={`Status verifikasi ${m.full_name}`}
                              value={m.verification_status}
                              onChange={(e) => updateStatus.mutate({ id: m.id, status: e.target.value })}
                              className="min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-forest-dark"
                            >
                              <option value="VERIFIED">Terverifikasi</option>
                              <option value="PENDING">Menunggu</option>
                              <option value="INACTIVE">Nonaktif</option>
                            </select>
                          ) : (
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {selectedId === m.id ? 'Tutup Riwayat' : 'Riwayat Bantuan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              total={totalCount}
              limit={limit}
              offset={offset}
              onOffsetChange={setOffset}
              onLimitChange={setLimit}
            />
          </>
        )}
      </Card>

      {selectedId !== null && (
        <Card className="space-y-3 border-primary/25">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-forest-dark flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              Riwayat Penyaluran Mustahik #{selectedId}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="p-1 rounded hover:bg-slate-100 text-slate-500"
              aria-label="Tutup riwayat mustahik"
            >
              <X size={16} />
            </button>
          </div>
          {detailQuery.isPending ? (
            <Skeleton lines={4} />
          ) : !detailQuery.data || detailQuery.data.distributions.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada penyaluran yang tertaut ke mustahik ini.</p>
          ) : (
            <div className="space-y-2">
              {detailQuery.data.distributions.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream border border-slate-200 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDrawerTxId(d.id)}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      #{d.id} <Eye size={12} />
                    </button>
                    <span className="font-semibold text-forest-dark">{d.category}</span>
                    <span className="text-slate-500">{d.region} · {formatDateTime(d.timestamp)}</span>
                  </div>
                  <span className="font-bold text-forest-dark tabular-nums">{formatIDR(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <TransactionDetailDrawer
        transactionId={drawerTxId}
        onClose={() => setDrawerTxId(null)}
        onUpdated={() => {
          void listQuery.refetch();
          if (selectedId !== null) void detailQuery.refetch();
        }}
      />
    </div>
  );
};

export default MustahikPage;
