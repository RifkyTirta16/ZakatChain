import { LogOut, ShieldCheck, User } from 'lucide-react';
import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import { NetworkBadge, PoweredByEthereum, useNetworkInfo } from '../../components/ethereum';
import { ROLE_LABELS, toRole, type SessionUser } from '../../components/layout/navConfig';
import { shortHash } from '../../utils/format';

interface ProfilePageProps {
  user: SessionUser | null;
  onLogout: () => void;
}

const ROLE_DESCRIPTION: Record<string, string> = {
  USER: 'Akses Muzakki: menghitung zakat, menunaikan pembayaran zakat, memantau riwayat donasi, dan memverifikasi hash publik.',
  AMIL: 'Akses Amil Zakat: mengelola program penyaluran, mencatat penyaluran beserta bukti, dan memantau pemetaan kemiskinan wilayah.',
  AUDITOR: 'Akses Auditor Independen: memindai anomali, menyetujui/menolak bukti penyaluran, memeriksa log audit, dan mengekspor laporan CSV.',
  ADMIN: 'Akses Administrator: pemantauan infrastruktur & smart contract Ethereum, menjalankan rekonsiliasi dana, serta seluruh akses operasional dan audit.',
};

const ProfilePage = ({ user, onLogout }: ProfilePageProps) => {
  const network = useNetworkInfo();
  const role = toRole(user?.role);

  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader
        title="Profil & Pengaturan Sesi"
        subtitle="Informasi akun aktif, hak akses peran, dan konfigurasi jaringan Ethereum."
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mint text-primary flex items-center justify-center">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-forest-dark">{user?.username || 'Pengguna'}</h2>
              <p className="text-xs text-slate-500">ID Pengguna: #{user?.id ?? '-'}</p>
            </div>
          </div>
          <Badge tone="primary">{role ? `${ROLE_LABELS[role]} (${role})` : user?.role ?? '-'}</Badge>
        </div>

        <div className="rounded-xl bg-cream border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold text-forest-dark flex items-center gap-1.5 mb-1">
            <ShieldCheck size={16} className="text-primary" /> Ruang Lingkup Hak Akses
          </p>
          <p>{ROLE_DESCRIPTION[user?.role ?? ''] ?? 'Hak akses disesuaikan dengan konfigurasi akun.'}</p>
        </div>

        <div className="flex justify-end">
          <Button variant="danger" onClick={onLogout}>
            <LogOut size={16} /> Keluar dari Sesi
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-forest-dark">Koneksi Jaringan Ethereum</h3>
          <PoweredByEthereum />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Jaringan Aktif</span>
            <NetworkBadge />
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Alamat Smart Contract ZakatVerify</span>
            <span className="font-mono font-semibold text-forest-dark break-all">
              {shortHash(network.contractAddress, 12, 10)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
