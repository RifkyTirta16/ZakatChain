import { useState, type FormEvent } from 'react';
import { Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, EmptyState, Skeleton, Badge } from '../../components/ui';
import { shortHash } from '../../utils/format';
import { proofBadge, ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';
import { useTransactions } from './hooks/useDashboardData';

export const ChainPanel = () => {
  const navigate = useNavigate();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState('');

  const { data: transactions, isLoading } = useTransactions();

  const confirmed = (transactions ?? [])
    .filter((t) => Boolean(t.tx_hash))
    .slice(0, 5);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCheck = (e: FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    navigate('/verify');
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl p-6">
        <Skeleton lines={4} className="w-full rounded-xl" />
      </Card>
    );
  }

  if (confirmed.length === 0) {
    return (
      <Card className="rounded-2xl p-8">
        <EmptyState
          title="Belum ada transaksi on-chain"
          description="Transaksi yang telah terverifikasi hash di blockchain akan tercatat di sini."
        />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-extrabold text-primary-dark">Transparansi Blockchain</h2>
          <form onSubmit={handleCheck} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Hash / ID verifikasi"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              className="w-44 sm:w-48 min-h-[44px] rounded-xl border border-primary-bg px-3 py-2 text-xs sm:text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-xl border-2 border-primary px-3 py-2 text-xs sm:text-sm font-bold text-primary-dark hover:bg-primary-bg transition-colors"
            >
              Cek
            </button>
          </form>
        </div>
      </div>

      <div className="divide-y divide-dashed divide-primary-bg/70 px-6">
        {confirmed.map((t) => {
          const isCopied = copiedHash === t.tx_hash;
          return (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-primary-dark truncate">
                  {shortHash(t.tx_hash ?? '')}
                </span>
                {t.tx_hash && (
                  <button
                    type="button"
                    onClick={() => handleCopy(t.tx_hash!)}
                    title={isCopied ? 'Tersalin' : 'Salin hash'}
                    className="inline-flex items-center gap-1 rounded p-1 text-xs text-primary-dark/70 hover:bg-primary-bg transition-colors"
                  >
                    {isCopied ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <Check size={13} />
                        Tersalin
                      </span>
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                )}
              </div>

              <div className="flex flex-col items-end text-right shrink-0">
                <Badge tone={proofBadge(t.blockchain_status ?? '').tone} className="text-xs">
                  {proofBadge(t.blockchain_status ?? '').label}
                </Badge>
                {t.block_number !== null && t.block_number !== undefined && (
                  <span className="text-[11px] text-primary-dark/60 mt-0.5">
                    Blok #{t.block_number}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 pt-4 pb-6">
        <div className="bg-cream rounded-xl p-3 text-xs text-primary-dark/70 border border-cream">
          {ON_CHAIN_NOTE}
        </div>
        <div className="mt-3 text-right">
          <a
            href="/verify"
            className="text-xs font-semibold text-primary-dark hover:underline inline-flex items-center gap-1"
          >
            Buka portal verifikasi publik &rarr;
          </a>
        </div>
      </div>
    </Card>
  );
};

export default ChainPanel;
