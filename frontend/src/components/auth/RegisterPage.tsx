import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import apiClient from '../../utils/api';
import { Button, Card, Input } from '../ui';
import { PoweredByEthereum } from '../ethereum';

interface RegisterPageProps {
  onLoginSuccess: (user: unknown, token: string) => void;
}

const RegisterPage = ({ onLoginSuccess }: RegisterPageProps) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmed = username.trim();
    if (trimmed.length < 3 || !/^[A-Za-z0-9._-]+$/.test(trimmed)) {
      setError('Username minimal 3 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.');
      return;
    }
    if (password.length < 10) {
      setError('Password minimal 10 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', { username: trimmed, password });
      const loginRes = await apiClient.post('/auth/login', { username: trimmed, password });
      setSuccessMsg('Akun Muzakki berhasil dibuat.');
      onLoginSuccess(loginRes.data.user, loginRes.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string; details?: { message?: string }[] } } };
      const detail = e2.response?.data?.details?.map((d) => d.message).filter(Boolean).join('; ');
      setError(detail || e2.response?.data?.error || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2.5">
          <div className="w-12 h-12 rounded-xl bg-mint text-primary flex items-center justify-center mx-auto">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-forest-dark">Daftar Akun Muzakki</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Pantau riwayat pembayaran zakat dan bukti transaksi Anda secara transparan.
          </p>
          <div className="flex justify-center pt-1">
            <PoweredByEthereum />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm flex items-start gap-2 font-medium"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-danger" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-mint text-forest text-xs sm:text-sm flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="reg-username"
            label="Username"
            placeholder="Contoh: ahmad.muzakki"
            hint="Minimal 3 karakter (huruf, angka, ., _, -)."
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            id="reg-password"
            type="password"
            label="Password"
            placeholder="Minimal 10 karakter"
            hint="Gunakan kombinasi huruf dan angka minimal 10 karakter."
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            id="reg-confirm"
            type="password"
            label="Ulangi Password"
            placeholder="Masukkan ulang password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Daftar & Masuk
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          Sudah memiliki akun?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-forest underline underline-offset-4">
            Masuk di sini
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
