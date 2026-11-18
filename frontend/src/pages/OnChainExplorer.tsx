import { useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, Database, Link as LinkIcon } from 'lucide-react';
import apiClient from '../utils/api';

const OnChainExplorer = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const endpoint = query.startsWith('0x') ? `/explorer/verify/hash/${query}` : `/explorer/verify/${query}`;
      const response = await apiClient.get(endpoint);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wattvision-bg p-8 text-wattvision-textMain font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold flex justify-center items-center gap-3 mb-4">
            <ShieldCheck className="text-wattvision-primary" size={32} /> On-Chain Proof Explorer
          </h1>
          <p className="text-wattvision-textSecondary">Verifikasi integritas laporan penyaluran zakat secara transparan melalui blockchain.</p>
        </div>

        {/* Search Box */}
        <div className="flex gap-3 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wattvision-textSecondary" size={20} />
            <input 
              type="text" 
              placeholder="Masukkan ID Laporan atau Audit Hash (0x...)" 
              className="w-full bg-wattvision-surface border border-wattvision-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-wattvision-primary transition-colors font-mono text-sm"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-wattvision-primary text-wattvision-bg font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Verify'}
          </button>
        </div>

        {error && (
          <div className="bg-wattvision-alertBg border-l-4 border-wattvision-alert p-4 rounded-lg mb-8 text-wattvision-alert flex items-center gap-3">
            <ShieldAlert size={20} /> {error}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Blockchain Status Card */}
            <div className="bg-wattvision-surface p-6 rounded-2xl border border-wattvision-border">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-wattvision-border pb-3">
                <LinkIcon className="text-wattvision-primary" size={20} /> Blockchain Proof
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-wattvision-textSecondary text-sm">Status</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${
                    result.status === 'VERIFIED' ? 'bg-wattvision-success/20 text-wattvision-success' : 
                    result.status === 'REVOKED' ? 'bg-wattvision-alert/20 text-wattvision-alert' : 
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {result.status}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-wattvision-textSecondary text-sm">Verified Hash</span>
                  <span className="font-mono text-xs text-right max-w-[200px] break-all">{result.blockchain.formattedHash}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-wattvision-textSecondary text-sm">Block Timestamp</span>
                  <span className="font-mono text-xs">{result.blockchain.timestamp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-wattvision-textSecondary text-sm">Is Revoked</span>
                  <span className="font-mono text-xs">{result.blockchain.revoked ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Database Info Card */}
            <div className="bg-wattvision-surface p-6 rounded-2xl border border-wattvision-border">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-wattvision-border pb-3">
                <Database className="text-wattvision-primary" size={20} /> Database Record
              </h3>
              {result.database ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-wattvision-textSecondary text-sm">Report ID</span>
                    <span className="font-mono text-sm">{result.database.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-wattvision-textSecondary text-sm">Amount</span>
                    <span className="font-bold text-wattvision-primary font-mono">{result.database.amount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-wattvision-textSecondary text-sm">Category</span>
                    <span className="text-sm">{result.database.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-wattvision-textSecondary text-sm">Region</span>
                    <span className="text-sm">{result.database.region}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-wattvision-textSecondary italic text-sm">
                  No corresponding record found in local database.
                </div>
              )}
            </div>

            {/* Integrity Check Card */}
            <div className="md:col-span-2 bg-wattvision-surface p-6 rounded-2xl border-2 border-dashed border-wattvision-border text-center">
              <div className="flex justify-center items-center gap-3 mb-2">
                {result.match ? (
                  <ShieldCheck className="text-wattvision-success" size={32} />
                ) : (
                  <ShieldAlert className="text-wattvision-alert" size={32} />
                )}
                <h3 className="text-xl font-bold">
                  {result.match ? 'INTEGRITY VERIFIED' : 'INTEGRITY MISMATCH'}
                </h3>
              </div>
              <p className="text-wattvision-textSecondary text-sm">
                {result.match 
                  ? 'Data in the local database perfectly matches the cryptographically signed proof on the blockchain.' 
                  : 'Warning: The data found in the database does not match the blockchain proof, or the proof does not exist on-chain.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnChainExplorer;

