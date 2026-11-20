import { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import apiClient from '../../utils/api';
import { Card } from '../ui';

interface LoginPageProps {
  onLoginSuccess: (user: unknown, token: string) => void;
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', { username, password });
      onLoginSuccess(data.user, data.token);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2.response?.data?.error || 'Login gagal. Periksa username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8F8] p-4">
      <Card className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-card space-y-6">
        {/* Header Logo & Judul */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary-bg rounded-2xl flex items-center justify-center mx-auto text-primary shadow-teal-glow">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-extrabold text-primary-dark">
            Masuk ke ZakatChain
          </h1>
          <p className="text-xs sm:text-sm text-primary-dark/70">
            Platform transparansi dan verifikasi penyaluran zakat terdesentralisasi.
          </p>
        </div>

        {/* Pesan Error Jelas */}
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-coral/40 bg-coral/10 text-coral-dark text-xs sm:text-sm flex items-start gap-2 font-medium"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Login dengan Username */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              className="w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark placeholder-primary-dark/40 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark placeholder-primary-dark/40 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Satu Aksi Utama: Tombol Masuk */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" /> Memeriksa Kredensial...
                </>
              ) : (
                <>
                  Masuk Sekarang <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-primary-dark/60 text-center leading-relaxed pt-2 border-t border-slate-100">
          Akses peran ditentukan otomatis berdasarkan akun terdaftar (Donor, Amil, Auditor, atau Admin).
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;
