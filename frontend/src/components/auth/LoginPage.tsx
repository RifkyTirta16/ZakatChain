import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import apiClient from '../../utils/api';

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
      setError(e2.response?.data?.error || 'Login gagal. Periksa koneksi ke backend (port 5000).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wattvision-bg p-4">
      <div className="w-full max-w-md bg-wattvision-surface border border-wattvision-border rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-wattvision-primary rounded-lg flex items-center justify-center text-black shadow-lg shadow-cyan-500/20">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase italic leading-none">
              Zakat<span className="text-wattvision-primary">Chain</span>
            </h1>
            <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest font-medium mt-1">
              Institutional Audit System
            </p>
          </div>
        </div>

        <p className="text-wattvision-textSecondary text-sm mb-6">
          Masuk untuk mengakses dasbor dan pencatatan distribusi.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs text-wattvision-textSecondary mb-1 uppercase tracking-widest">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl p-3 focus:outline-none focus:border-wattvision-primary transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-wattvision-textSecondary mb-1 uppercase tracking-widest">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl p-3 focus:outline-none focus:border-wattvision-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg border border-wattvision-alert/30 bg-wattvision-alert/10 text-wattvision-alert text-sm text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-wattvision-primary text-wattvision-bg rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Memeriksa…
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="text-[10px] text-wattvision-textSecondary mt-6 text-center font-mono leading-relaxed">
          Autentikasi: POST /api/auth/login · token disimpan di localStorage (zakat_token)
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
