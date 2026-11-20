import { useState } from 'react';
import { Copy } from 'lucide-react';
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
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const handleCheck = () => {
    if (!verifyInput.trim()) return;
    navigate(`/verify`);
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
          description="Transaksi yang telah terverifikasi hash di blockchain akan muncul di sini."
        />
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="px-6 pb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-primary-dark">Transparansi Blockchain</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Masukkan hash atau ID"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            className="w-48 min-h-[44px] rounded-xl border border-primary-bg px-3 py-2 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleCheck}
            className="ml-2 min-h-[44px] rounded-xl border-2 border-primary px-3 py-2 text-sm font-bold text-primary-dark hover:bg-primary-bg transition-colors"
          >
            Cek
          </button>
        </div>
      </div>
      <div className="divide-y divide-dashed px-6">
        {confirmed.map((t) => (
          <div key={t.id} className="py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-primary-dark break-all">
                {shortHash(t.tx_hash ?? '')}
              </span>
              {t.tx_hash && (
                <button
                  onClick={() => handleCopy(t.tx_hash!)}
                  title={copiedHash === t.tx_hash ? 'Tersalin' : 'Salin hash'}
                  className="rounded p-1.5 text-primary-dark/60 hover:bg-primary-bg transition-colors"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-col items-end text-right shrink-0">
              <Badge tone={proofBadge(t.blockchain_status ?? '').tone} className="text-xs">
                {proofBadge(t.blockchain_status ?? '').label}
              </Badge>
              {t.block_number !== null && (
                <span className="text-xs text-primary-dark/60 mt-1">
                  Blok {t.block_number}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 pt-4 pb-6">
        <div className="bg-cream rounded-xl p-3 text-xs text-primary-dark/70 border border-cream">
          {ON_CHAIN_NOTE}
        </div>
        <div className="mt-3 text-right">
          <a
            href="/verify"
            className="text-sm font-medium text-primary-dark hover:underline inline-flex items-center gap-1"
          >
            Cek keabsahan di layar verifikasi
          </a>
        </div>
      </div>
    </Card>
  );
};

export default ChainPanel;
