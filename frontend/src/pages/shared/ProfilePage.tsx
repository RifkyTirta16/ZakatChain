import { useState } from 'react';
import { CheckCircle2, KeyRound, LogOut, ShieldCheck, User } from 'lucide-react';
import apiClient from '../../utils/api';
import { Badge, Button, Card, Input, SectionHeader } from '../../components/ui';
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);
    if (newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPwFeedback({ type: 'err', text: 'Kata sandi baru minimal 10 karakter dengan huruf besar, huruf kecil, dan angka.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwFeedback({ type: 'err', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }
    setPwSaving(true);
    try {
      await apiClient.patch('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwFeedback({ type: 'ok', text: 'Kata sandi Anda berhasil diperbarui.' });
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: string; details?: Array<{ message?: string }> } } })?.response?.data;
      const detail = apiMsg?.details?.[0]?.message;
      setPwFeedback({ type: 'err', text: detail || apiMsg?.error || 'Gagal memperbarui kata sandi.' });
    } finally {
      setPwSaving(false);
    }
  };

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

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={17} className="text-primary" />
          <h3 className="text-base font-bold text-forest-dark">Ubah Kata Sandi</h3>
        </div>
        <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-3">
          {/* Bind form updates to the signed-in username so browser password managers do not prompt to pick another saved account. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={user?.username ?? ''}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <Input
            label="Kata Sandi Saat Ini"
            name="current_password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Kata Sandi Baru (min. 10 karakter)"
              name="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Konfirmasi Kata Sandi Baru"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {pwFeedback && (
            <p
              role={pwFeedback.type === 'err' ? 'alert' : 'status'}
              className={`rounded-xl border p-3 text-xs flex items-center gap-2 font-medium ${
                pwFeedback.type === 'ok'
                  ? 'bg-mint border-primary/25 text-forest'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {pwFeedback.type === 'ok' && <CheckCircle2 size={14} className="text-primary shrink-0" />}
              <span>{pwFeedback.text}</span>
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={pwSaving} disabled={!currentPassword || !newPassword || !confirmPassword}>
              Simpan Kata Sandi Baru
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
