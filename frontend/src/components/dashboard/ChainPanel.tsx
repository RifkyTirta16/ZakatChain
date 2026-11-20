import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Copy, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ON_CHAIN_NOTE, Skeleton, proofBadge } from '../../components/ui';
import { EthereumLogo, NetworkBadge } from '../../components/ethereum';
import { shortHash } from '../../utils/format';
import { useTransactions } from './hooks/useDashboardData';

export const ChainPanel = () => {
  const navigate = useNavigate();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState('');

  const { data: transactions, isLoading } = useTransactions();

  const confirmed = (transactions ?? [])
    .filter((t) => Boolean(t.tx_hash || t.audit_hash))
    .slice(0, 5);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCheck = (e: FormEvent) => {
    e.preventDefault();
    const q = verifyInput.trim();
    if (!q) return;
    navigate(`/verify?query=${encodeURIComponent(q)}`);
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton lines={5} />
      </Card>
    );
  }

  return (
    <Card className="space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <EthereumLogo size={13} />
            <h2 className="text-lg font-bold text-forest-dark">Jejak Ethereum</h2>
          </div>
          <NetworkBadge compact />
        </div>

        <form onSubmit={handleCheck} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ID laporan atau hash audit…"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              className="w-full min-h-[40px] rounded-[10px] border border-slate-300 bg-white pl-8 pr-3 text-xs text-forest-dark font-mono outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={!verifyInput.trim()}>
            Cek
          </Button>
        </form>

        {confirmed.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi on-chain"
            description="Catatan distribusi yang sudah memiliki hash akan muncul di sini."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {confirmed.map((t) => {
              const hash = t.tx_hash || '';
              const isCopied = Boolean(hash && copiedHash === hash);
              const badge = proofBadge(t.blockchain_status ?? 'PENDING');
              return (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      to={`/verify?id=${t.id}`}
                      className="text-xs font-semibold text-forest-dark hover:text-primary shrink-0"
                    >
                      #{t.id}
                    </Link>
                    <span className="text-xs font-mono text-slate-600 truncate">
                      {hash ? shortHash(hash, 8, 6) : 'Menunggu tx'}
                    </span>
                    {hash && (
                      <button
                        type="button"
                        onClick={() => handleCopy(hash)}
                        aria-label="Salin tx hash"
                        className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 shrink-0"
                      >
                        {isCopied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col items-end text-right shrink-0">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    {t.block_number !== null && t.block_number !== undefined && (
                      <span className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        Blok #{t.block_number}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <p className="text-[11px] text-slate-500">{ON_CHAIN_NOTE}</p>
        <Link
          to="/verify"
          className="text-xs font-semibold text-primary hover:text-forest inline-flex items-center gap-1"
        >
          Buka Portal Verifikasi Publik →
        </Link>
      </div>
    </Card>
  );
};

export default ChainPanel;
