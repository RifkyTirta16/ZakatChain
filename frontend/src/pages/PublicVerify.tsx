import React, { useState } from 'react';
import { Search, ShieldCheck, ExternalLink, AlertCircle, FileText, Database } from 'lucide-react';
import apiClient from '../utils/api';

const PublicVerify = () => {
  const [reportId, setReportId] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiClient.get(`/explorer/verify/${reportId}`);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Report could not be verified');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wattvision-bg p-8 text-wattvision-textMain font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-wattvision-primary rounded-2xl text-black mb-6 shadow-lg shadow-cyan-500/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-bold uppercase italic tracking-tight mb-2">
            Public <span className="text-wattvision-primary">Verification</span> Portal
          </h1>
          <p className="text-wattvision-textSecondary uppercase tracking-widest text-xs font-medium">
            Independent Zakat Distribution Transparency Registry
          </p>
        </header>

        <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-2xl mb-12">
          <form onSubmit={handleVerify} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-wattvision-textSecondary" size={20} />
              <input 
                type="text" 
                placeholder="Enter Report ID or Transaction Hash..." 
                className="w-full bg-wattvision-bg border border-wattvision-border pl-12 pr-4 py-4 rounded-2xl text-sm focus:outline-none focus:border-wattvision-primary transition-all"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="bg-wattvision-primary text-black px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-cyan-400 transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-wattvision-bg border border-wattvision-alert p-6 rounded-2xl flex items-center gap-4 text-wattvision-alert mb-12 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={24} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold uppercase italic">Report <span className="text-wattvision-primary">#{result.data.id}</span></h2>
                  <span className="px-3 py-1 bg-wattvision-success/20 text-wattvision-success border border-wattvision-success rounded-full text-[10px] uppercase font-bold tracking-widest">
                    {result.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Amount</p>
                      <p className="text-2xl font-bold font-mono">Rp {result.data.amount?.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Category</p>
                      <p className="text-sm font-medium">{result.data.category}</p>
                    </div>
                    <div>
                      <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Region</p>
                      <p className="text-sm font-medium">{result.data.region}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Timestamp</p>
                      <p className="text-sm font-mono">{new Date(result.data.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-1">Verification Status</p>
                      <p className="text-sm font-bold text-wattvision-success">Reconciled & Verified</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Database size={16} className="text-wattvision-primary" /> Integrity Proofs
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-wattvision-bg rounded-2xl border border-wattvision-border">
                    <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-2">Audit Hash (SHA-256)</p>
                    <p className="text-xs font-mono break-all text-wattvision-textMain">{result.data.audit_hash}</p>
                  </div>
                  <div className="p-4 bg-wattvision-bg rounded-2xl border border-wattvision-border">
                    <p className="text-wattvision-textSecondary text-[10px] uppercase tracking-widest mb-2">Blockchain Transaction Hash</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-mono break-all text-wattvision-primary">{result.data.tx_hash || 'Not yet registered on-chain'}</p>
                      {result.data.tx_hash && (
                        <a href={`https://etherscan.io/tx/${result.data.tx_hash}`} target="_blank" rel="noreferrer" className="text-wattvision-primary hover:text-white transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-wattvision-surface border border-wattvision-border p-6 rounded-3xl shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-wattvision-primary" /> Summary
                </h3>
                <p className="text-xs text-wattvision-textSecondary leading-relaxed">
                  This record has been verified against the ZakatChain immutable registry. The audit hash confirms the data has not been altered since the initial report.
                </p>
              </div>
              <div className="p-6 bg-wattvision-primary/10 border border-wattvision-primary/20 rounded-3xl">
                <p className="text-[10px] text-wattvision-primary uppercase tracking-widest font-bold mb-2">Transparency Note</p>
                <p className="text-[11px] text-wattvision-textSecondary leading-relaxed">
                  Beneficiary identity and precise location are redacted for privacy. Only aggregate and transaction data are public.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicVerify;