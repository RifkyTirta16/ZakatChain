import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import apiClient from '../../utils/api';
import { Button, Card, Input } from '../ui';
import { PoweredByEthereum } from '../ethereum';

interface LoginPageProps {
  onLoginSuccess: (user: unknown) => void;
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTarget = typeof window !== 'undefined' ? sessionStorage.getItem('zakat_redirect') || '' : '';
  const isPaymentIntentRedirect =
    redirectTarget.startsWith('/donate') || redirectTarget.startsWith('/campaigns/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', {
        username: username.trim(),
        password,
      });
      onLoginSuccess(data.user);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2.response?.data?.error || 'Login gagal. Periksa username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2.5">
          <div className="w-12 h-12 rounded-xl bg-mint text-primary flex items-center justify-center mx-auto">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-extrabold text-forest-dark">Masuk ke ZakatChain</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Akses dashboard Muzakki, Amil, Auditor, atau Administrator sesuai peran terdaftar.
          </p>
          <div className="flex justify-center pt-1">
            <PoweredByEthereum />
          </div>
        </div>

        {isPaymentIntentRedirect && (
          <div className="p-3.5 rounded-xl border border-primary/25 bg-mint text-xs sm:text-sm text-forest leading-relaxed">
            Masuk ke akun Muzakki Anda (atau daftar gratis) untuk melanjutkan pembayaran zakat via QRIS dan menerima Bukti Setor Zakat resmi.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm flex items-start gap-2 font-medium"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-danger" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="username"
            label="Username"
            autoComplete="username"
            placeholder="Masukkan username Anda"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!username.trim() || !password}
            className="w-full"
          >
            <span>Masuk Sekarang</span>
            <ArrowRight size={16} />
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center space-y-2 text-xs text-slate-600">
          <p>
            Belum punya akun Muzakki?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-forest underline underline-offset-4">
              Daftar Sekarang
            </Link>
          </p>
          <p>
            <Link to="/" className="text-slate-500 hover:text-forest-dark">
              Kembali ke Beranda Publik
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
