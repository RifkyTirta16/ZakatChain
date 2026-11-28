import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  LockOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime } from '../../utils/format';
import { Badge, Button, Card, ErrorState, SectionHeader, Skeleton } from '../../components/ui';
import { ROLE_LABELS, getStoredSessionUser, type Role } from '../../components/layout/navConfig';

interface UserRow {
  id: number;
  username: string;
  role: Role;
  failed_login_attempts: number;
  locked_until: string | null;
  is_locked: boolean;
}

const RBAC_MATRIX = [
  {
    feature: 'Program Zakat, Transparansi Publik, Distribusi Anonim CSV & Verifikasi Hash',
    endpoint: 'GET /api/campaigns, /api/public/transparency, /api/public/distributions, /api/explorer/verify/*',
    user: true,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: true,
  },
  {
    feature: 'Ringkasan & Riwayat Donasi Pribadi (Self / Privileged)',
    endpoint: 'GET /api/donations/me/overview, /api/donations/donor/:id, /api/donations/:id/trace',
    user: true,
    amil: false,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Buat, Ubah Status Program, Catat Distribusi & Impor Kemiskinan',
    endpoint: 'POST/PATCH /api/campaigns, POST /api/transactions, POST /api/mapping/import',
    user: false,
    amil: true,
    auditor: false,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Master Data Mustahik (Lihat / Tambah & Ubah Verifikasi)',
    endpoint: 'GET /api/mustahik* (AMIL/AUDITOR/ADMIN); POST/PATCH /api/mustahik* (AMIL/ADMIN)',
    user: false,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Daftar & Detail Transaksi Penyaluran, Donasi & Berkas Bukti (/uploads)',
    endpoint: 'GET /api/transactions, /api/transactions/:id, /api/donations, GET /uploads/*',
    user: false,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Command Center, Monitor Pembayaran/Webhook, Rekonsiliasi 3-Arah & Telemetri Chain',
    endpoint: '/api/admin/overview, /api/admin/blockchain/telemetry, /api/payments*, /api/reconciliation/three-way',
    user: false,
    amil: false,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Anomali, Verifikasi Bukti, Log Audit & Ekspor CSV Lengkap',
    endpoint: '/api/anomalies/*, /api/proofs/*, /api/audit, /api/export/csv',
    user: false,
    amil: false,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Rekonsiliasi Massal On-Chain, Snapshot Saldo & Manajemen Akun/Unlock',
    endpoint: '/api/reconciliation/run, /api/transactions/:id/reconcile(-batch), /api/users/*, /api/users/:id/unlock',
    user: false,
    amil: false,
    auditor: false,
    admin: true,
    publicAccess: false,
  },
];

const Flag = ({ ok }: { ok: boolean }) =>
  ok ? <Badge tone="success">Diizinkan</Badge> : <Badge tone="neutral">Ditolak</Badge>;

const RolesPermissionsPage = () => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOCKED' | Role>('ALL');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const selfId = getStoredSessionUser()?.id ?? null;

  const usersQuery = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<UserRow[]>('/users');
      return Array.isArray(data) ? data : [];
    },
  });

  const handleRoleChange = async (userId: number, nextRole: Role) => {
    setFeedback(null);
    setBusyId(userId);
    try {
      const { data } = await apiClient.patch<{ user: UserRow }>(`/users/${userId}/role`, {
        role: nextRole,
      });
      setFeedback({
        type: 'ok',
        text: `Peran akun ${data.user.username} diperbarui ke ${data.user.role} dan sesi lama dicabut.`,
      });
      void usersQuery.refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setFeedback({
        type: 'err',
        text: e.response?.data?.error || 'Gagal memperbarui peran pengguna.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const unlockMutation = useMutation({
    mutationFn: async (userId: number) => {
      setBusyId(userId);
      const { data } = await apiClient.patch<{ user: UserRow }>(`/users/${userId}/unlock`);
      return data;
    },
    onSuccess: (res) => {
      setFeedback({
        type: 'ok',
        text: `Akun ${res.user.username} berhasil dibuka kuncinya dan dicatat ke Log Audit.`,
      });
      void usersQuery.refetch();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setFeedback({
        type: 'err',
        text: e.response?.data?.error || 'Gagal membuka kunci akun.',
      });
    },
    onSettled: () => {
      setBusyId(null);
    },
  });

  const allUsers = usersQuery.data ?? [];
  const lockedCount = allUsers.filter((u) => u.is_locked).length;
  const visibleUsers = allUsers.filter((u) => {
    if (filterMode === 'LOCKED' && !u.is_locked) return false;
    if (filterMode !== 'ALL' && filterMode !== 'LOCKED' && u.role !== filterMode) return false;
    if (!search.trim()) return true;
    return u.username.toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Manajemen Pengguna, Keamanan Login & Hak Akses"
          subtitle="Kelola peran RBAC, pantau percobaan gagal login/penguncian akun, dan buka kunci akun secara teraudit."
        />
        <Button variant="secondary" size="sm" onClick={() => void usersQuery.refetch()}>
          <RefreshCw size={14} /> Segarkan Daftar
        </Button>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2 font-medium ${
            feedback.type === 'ok'
              ? 'bg-mint border-primary/25 text-forest'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 size={16} className="text-primary shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-danger shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="text-base font-bold text-forest-dark">
              Daftar Akun Terdaftar ({allUsers.length})
            </h2>
            {lockedCount > 0 && <Badge tone="danger">{lockedCount} Terkunci</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari username…"
                className="w-full min-h-[38px] rounded-[10px] border border-slate-300 bg-white pl-8 pr-3 text-xs text-forest-dark outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <select
              aria-label="Filter role atau status akun"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as 'ALL' | 'LOCKED' | Role)}
              className="min-h-[38px] rounded-[10px] border border-slate-300 bg-white px-3 text-xs font-semibold text-forest-dark cursor-pointer"
            >
              <option value="ALL">Semua Akun</option>
              <option value="LOCKED">Hanya Terkunci ({lockedCount})</option>
              <option value="USER">Muzakki (USER)</option>
              <option value="AMIL">Amil (AMIL)</option>
              <option value="AUDITOR">Auditor (AUDITOR)</option>
              <option value="ADMIN">Admin (ADMIN)</option>
            </select>
          </div>
        </div>

        {usersQuery.isPending ? (
          <div className="p-5">
            <Skeleton lines={5} />
          </div>
        ) : usersQuery.isError ? (
          <div className="p-5">
            <ErrorState message="Gagal memuat daftar akun." retry={() => void usersQuery.refetch()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Peran Aktif</th>
                  <th className="px-4 py-3 font-semibold">Status Keamanan Login</th>
                  <th className="px-4 py-3 font-semibold text-right">Ubah Peran & Buka Kunci</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((u) => {
                  const isSelf = selfId === u.id;
                  const canUnlock = u.is_locked || u.failed_login_attempts > 0;
                  return (
                    <tr key={u.id} className="hover:bg-cream/60">
                      <td className="px-4 py-3 font-mono text-slate-500">#{u.id}</td>
                      <td className="px-4 py-3 font-semibold text-forest-dark">
                        {u.username}{' '}
                        {isSelf && <span className="text-[11px] font-normal text-slate-500">(Anda)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.role === 'ADMIN' ? 'gold' : 'primary'}>
                          {ROLE_LABELS[u.role] ?? u.role} ({u.role})
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_locked ? (
                          <div className="space-y-0.5">
                            <Badge tone="danger">
                              <Lock size={11} /> Terkunci
                            </Badge>
                            <p className="text-[11px] text-red-700">
                              {u.failed_login_attempts}x gagal · hingga {formatDateTime(u.locked_until)}
                            </p>
                          </div>
                        ) : u.failed_login_attempts > 0 ? (
                          <div className="space-y-0.5">
                            <Badge tone="warning">Aktif (Waspada)</Badge>
                            <p className="text-[11px] text-slate-500">{u.failed_login_attempts}x gagal login</p>
                          </div>
                        ) : (
                          <Badge tone="success">Aktif Normal</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                        {canUnlock && (
                          <Button
                            type="button"
                            size="sm"
                            variant={u.is_locked ? 'danger' : 'secondary'}
                            disabled={busyId === u.id}
                            onClick={() => unlockMutation.mutate(u.id)}
                          >
                            <LockOpen size={12} /> Buka Kunci
                          </Button>
                        )}
                        <select
                          aria-label={`Ubah peran ${u.username}`}
                          value={u.role}
                          disabled={isSelf || busyId === u.id}
                          onChange={(e) => void handleRoleChange(u.id, e.target.value as Role)}
                          className="min-h-[38px] rounded-[10px] border border-slate-300 bg-white px-2.5 text-xs font-semibold text-forest-dark disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="USER">Muzakki (USER)</option>
                          <option value="AMIL">Amil Zakat (AMIL)</option>
                          <option value="AUDITOR">Auditor (AUDITOR)</option>
                          <option value="ADMIN">Administrator (ADMIN)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          <h2 className="text-base font-bold text-forest-dark">Matriks Otorisasi Endpoint</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Kapabilitas & Endpoint</th>
                <th className="px-4 py-3.5 font-semibold">Publik</th>
                <th className="px-4 py-3.5 font-semibold">Muzakki (USER)</th>
                <th className="px-4 py-3.5 font-semibold">AMIL</th>
                <th className="px-4 py-3.5 font-semibold">AUDITOR</th>
                <th className="px-4 py-3.5 font-semibold">ADMIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RBAC_MATRIX.map((row) => (
                <tr key={row.feature} className="hover:bg-cream/60">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-forest-dark">{row.feature}</p>
                    <p className="font-mono text-[11px] text-slate-500">{row.endpoint}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Flag ok={row.publicAccess} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Flag ok={row.user} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Flag ok={row.amil} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Flag ok={row.auditor} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Flag ok={row.admin} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RolesPermissionsPage;
