import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import apiClient from '../../utils/api';
import { Badge, Button, Card, ErrorState, SectionHeader, Skeleton } from '../../components/ui';
import { ROLE_LABELS, type Role } from '../../components/layout/navConfig';

interface UserRow {
  id: number;
  username: string;
  role: Role;
}

const RBAC_MATRIX = [
  {
    feature: 'Program Zakat, Transparansi Publik & Verifikasi Hash',
    endpoint: 'GET /api/campaigns, /api/public/transparency, /api/explorer/verify/*',
    user: true,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: true,
  },
  {
    feature: 'Riwayat Donasi Pribadi (Self / Privileged)',
    endpoint: 'GET /api/donations/donor/:id',
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
    feature: 'Daftar Transaksi Penyaluran, Donasi & Berkas Bukti (/uploads)',
    endpoint: 'GET /api/transactions, GET /api/donations, GET /uploads/*',
    user: false,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Ubah Kata Sandi Akun Pribadi',
    endpoint: 'PATCH /api/auth/password (Pemilik Akun Login)',
    user: true,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Anomali, Verifikasi Bukti, Log Audit, Ekspor CSV',
    endpoint: '/api/anomalies/*, /api/proofs/*, /api/audit, /api/export/csv',
    user: false,
    amil: false,
    auditor: true,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Rekonsiliasi Dana, Retry On-Chain & Manajemen Role User',
    endpoint: 'POST /api/reconciliation/run, PATCH /api/transactions/:id/reconcile, /api/users/*',
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
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  let selfId: number | null = null;
  try {
    const raw = localStorage.getItem('zakat_user');
    selfId = raw ? ((JSON.parse(raw) as { id?: number }).id ?? null) : null;
  } catch {
    selfId = null;
  }

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
        text: `Peran akun ${data.user.username} berhasil diperbarui menjadi ${data.user.role} dan dicatat di Log Audit.`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <SectionHeader
          title="Manajemen Pengguna & Hak Akses (RBAC)"
          subtitle="Kelola peran akun terdaftar dan tinjau matriks otorisasi aktif pada backend ZakatChain."
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

      {/* Live User Management Table */}
      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="text-base font-bold text-forest-dark">Daftar Akun Terdaftar</h2>
          </div>
          <span className="text-xs text-slate-500">
            Total {usersQuery.data?.length ?? 0} akun
          </span>
        </div>

        {usersQuery.isPending ? (
          <div className="p-5"><Skeleton lines={5} /></div>
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
                  <th className="px-4 py-3 font-semibold text-right">Ubah Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(usersQuery.data ?? []).map((u) => {
                  const isSelf = selfId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-cream/60">
                      <td className="px-4 py-3 font-mono text-slate-500">#{u.id}</td>
                      <td className="px-4 py-3 font-semibold text-forest-dark">
                        {u.username}{' '}
                        {isSelf && (
                          <span className="text-[11px] font-normal text-slate-500">(Anda)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.role === 'ADMIN' ? 'gold' : 'primary'}>
                          {ROLE_LABELS[u.role] ?? u.role} ({u.role})
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          aria-label={`Ubah peran ${u.username}`}
                          value={u.role}
                          disabled={isSelf || busyId === u.id}
                          onChange={(e) => void handleRoleChange(u.id, e.target.value as Role)}
                          className="min-h-[36px] rounded-[10px] border border-slate-300 bg-white px-2.5 text-xs font-semibold text-forest-dark disabled:bg-slate-100 disabled:text-slate-400"
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

      {/* RBAC Matrix */}
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
                  <td className="px-4 py-3.5"><Flag ok={row.publicAccess} /></td>
                  <td className="px-4 py-3.5"><Flag ok={row.user} /></td>
                  <td className="px-4 py-3.5"><Flag ok={row.amil} /></td>
                  <td className="px-4 py-3.5"><Flag ok={row.auditor} /></td>
                  <td className="px-4 py-3.5"><Flag ok={row.admin} /></td>
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
