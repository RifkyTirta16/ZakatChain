import { ShieldCheck, Terminal } from 'lucide-react';
import { Badge, Card, SectionHeader } from '../../components/ui';

const RBAC_MATRIX = [
  {
    feature: 'Program Zakat (Lihat & Detail)',
    endpoint: 'GET /api/campaigns, /api/campaigns/:id',
    user: true,
    amil: true,
    auditor: true,
    admin: true,
    publicAccess: true,
  },
  {
    feature: 'Transparansi Publik & Verifikasi Hash',
    endpoint: 'GET /api/public/transparency, /api/explorer/verify/*',
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
    feature: 'Buat Program & Impor Kemiskinan',
    endpoint: 'POST /api/campaigns, POST /api/mapping/import',
    user: false,
    amil: true,
    auditor: false,
    admin: true,
    publicAccess: false,
  },
  {
    feature: 'Catat Distribusi & Unggah Bukti',
    endpoint: 'POST /api/transactions',
    user: false,
    amil: true,
    auditor: false,
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
    feature: 'Jalankan Rekonsiliasi Dana',
    endpoint: 'POST /api/reconciliation/run, PATCH /api/transactions/:id/reconcile',
    user: false,
    amil: false,
    auditor: false,
    admin: true,
    publicAccess: false,
  },
];

const Flag = ({ ok }: { ok: boolean }) =>
  ok ? <Badge tone="success">Diizinkan</Badge> : <Badge tone="neutral">Ditolak</Badge>;

const RolesPermissionsPage = () => (
  <div className="space-y-6">
    <SectionHeader
      title="Peran & Kebijakan Hak Akses (RBAC)"
      subtitle="Matriks otorisasi aktif yang diterapkan middleware backend (authenticate & authorize) serta shell frontend."
    />

    <Card className="p-0 sm:p-0 overflow-hidden">
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

    <Card variant="highlight" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-forest-dark">
        <ShieldCheck size={17} className="text-primary" /> Kebijakan Provisioning Akun Privileged
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Pendaftaran publik melalui <code className="font-mono text-xs">/register</code> (
        <code className="font-mono text-xs">POST /api/auth/register</code>) selalu membuat peran{' '}
        <strong>USER (Muzakki)</strong>. Belum ada endpoint mutasi pembuatan/perubahan peran admin dari UI
        demi mencegah eskalasi hak akses sepihak.
      </p>
      <div className="rounded-xl bg-forest-dark text-white p-4 text-xs font-mono flex items-start gap-2.5">
        <Terminal size={15} className="text-gold-light shrink-0 mt-0.5" />
        <div>
          <p className="text-white/70 mb-1">Untuk akun uji pengembangan lokal (4 role):</p>
          <p>cd backend &amp;&amp; npm run seed:test-users</p>
        </div>
      </div>
    </Card>
  </div>
);

export default RolesPermissionsPage;
